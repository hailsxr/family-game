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
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { Room, Player } from './interfaces/game.interfaces';

function serializeRoom(room: Room) {
  return {
    code: room.code,
    state: room.state,
    players: Array.from(room.players.values()).map(serializePlayer),
    hostId: room.hostId,
  };
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

  constructor(private readonly gameService: GameService) {}

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
