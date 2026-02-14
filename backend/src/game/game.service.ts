import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { GameState, Player, Room } from './interfaces/game.interfaces';
import { generateRoomCode } from './utils/room-code';

const MAX_PLAYERS = 10;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 20;

@Injectable()
export class GameService {
  private rooms = new Map<string, Room>();
  private playerRoomMap = new Map<string, string>(); // socketId -> roomCode

  createRoom(hostName: string, socketId: string): Room {
    this.validatePlayerName(hostName);

    const code = generateRoomCode(new Set(this.rooms.keys()));

    const host: Player = {
      id: socketId,
      name: hostName,
      roomCode: code,
      isHost: true,
    };

    const room: Room = {
      code,
      state: GameState.LOBBY,
      players: new Map([[socketId, host]]),
      hostId: socketId,
      createdAt: new Date(),
    };

    this.rooms.set(code, room);
    this.playerRoomMap.set(socketId, code);

    return room;
  }

  joinRoom(code: string, playerName: string, socketId: string): Room {
    this.validatePlayerName(playerName);

    const room = this.rooms.get(code);
    if (!room) {
      throw new WsException('Room not found');
    }

    if (room.state !== GameState.LOBBY) {
      throw new WsException('Room is not accepting new players');
    }

    if (room.players.size >= MAX_PLAYERS) {
      throw new WsException('Room is full');
    }

    const nameTaken = Array.from(room.players.values()).some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase(),
    );
    if (nameTaken) {
      throw new WsException('Player name is already taken in this room');
    }

    const player: Player = {
      id: socketId,
      name: playerName,
      roomCode: code,
      isHost: false,
    };

    room.players.set(socketId, player);
    this.playerRoomMap.set(socketId, code);

    return room;
  }

  removePlayer(socketId: string): { room: Room; player: Player } | null {
    const roomCode = this.playerRoomMap.get(socketId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player) return null;

    room.players.delete(socketId);
    this.playerRoomMap.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return { room, player };
    }

    // Reassign host if the host left
    if (room.hostId === socketId) {
      const newHost = room.players.values().next().value;
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
      }
    }

    return { room, player };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  private validatePlayerName(name: string): void {
    if (
      !name ||
      name.trim().length < MIN_NAME_LENGTH ||
      name.trim().length > MAX_NAME_LENGTH
    ) {
      throw new WsException(
        `Player name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`,
      );
    }
  }
}
