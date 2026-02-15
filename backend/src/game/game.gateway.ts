import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseFilters } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { GamePersistenceService } from '../persistence/game-persistence.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { GameState, Room, Player } from './interfaces/game.interfaces';

const READING_PLUS_STATES = [GameState.READING, GameState.PLAYING, GameState.ENDED];

function serializeRoom(room: Room) {
  const serialized: Record<string, unknown> = {
    code: room.code,
    state: room.state,
    players: Array.from(room.players.values()).map(serializePlayer),
    hostId: room.hostId,
    wordCount: room.words.size,
    families: room.families,
    currentTurnId: room.currentTurnId,
    turnOrder: room.turnOrder,
  };

  if (READING_PLUS_STATES.includes(room.state)) {
    serialized.shuffledWords = room.shuffledWords;
  }

  return serialized;
}

function serializePlayer(player: Player) {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
  };
}

@UseFilters(new WsExceptionFilter())
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly gamePersistenceService: GamePersistenceService,
  ) {}

  @SubscribeMessage('create_room')
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerName: string },
  ) {
    const room = this.gameService.createRoom(data.playerName, client.id);
    client.join(room.code);
    client.emit('room_created', serializeRoom(room));
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerName: string },
  ) {
    const room = this.gameService.joinRoom(
      data.roomCode,
      data.playerName,
      client.id,
    );
    client.join(room.code);
    this.server.to(room.code).emit('player_joined', serializeRoom(room));
  }

  @SubscribeMessage('start_game')
  handleStartGame(@ConnectedSocket() client: Socket) {
    const room = this.gameService.startGame(client.id);
    this.server.to(room.code).emit('state_changed', serializeRoom(room));
  }

  @SubscribeMessage('submit_word')
  handleSubmitWord(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { word: string },
  ) {
    const { room, allSubmitted } = this.gameService.submitWord(
      client.id,
      data.word,
    );
    this.server.to(room.code).emit('word_submitted', {
      playerId: client.id,
      wordCount: room.words.size,
      totalPlayers: room.players.size,
    });
    if (allSubmitted) {
      this.server
        .to(room.code)
        .emit('reading_words', { words: room.shuffledWords });
      this.server.to(room.code).emit('state_changed', serializeRoom(room));
    }
  }

  @SubscribeMessage('advance_reading')
  handleAdvanceReading(@ConnectedSocket() client: Socket) {
    const room = this.gameService.advanceFromReading(client.id);
    this.server.to(room.code).emit('state_changed', serializeRoom(room));
  }

  @SubscribeMessage('make_guess')
  handleMakeGuess(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetPlayerId: string; word: string },
  ) {
    const result = this.gameService.makeGuess(
      client.id,
      data.targetPlayerId,
      data.word,
    );

    // Find room code for broadcasting
    const room = Array.from(client.rooms).find((r) => r !== client.id);
    if (room) {
      this.server.to(room).emit('guess_result', result);

      if (result.gameOver) {
        const fullRoom = this.gameService.getRoom(room);
        if (fullRoom) {
          this.server.to(room).emit('state_changed', serializeRoom(fullRoom));

          if (result.winner) {
            this.gamePersistenceService
              .persistEndedGame(fullRoom, result.winner.leaderId)
              .catch((err) =>
                console.error('Failed to persist game:', err),
              );
          }
        }
      }
    }
  }

  handleDisconnect(client: Socket) {
    const result = this.gameService.removePlayer(client.id);
    if (!result) return;

    const { room, player } = result;

    if (room.players.size > 0) {
      this.server.to(room.code).emit('player_left', {
        player: serializePlayer(player),
        room: serializeRoom(room),
      });
    }
  }
}
