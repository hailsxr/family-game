import { Injectable, Optional, Inject } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Family, GameState, GuessRecord, GuessResult, Player, Room } from './interfaces/game.interfaces';
import { generateRoomCode } from './utils/room-code';

export const RANDOM_FN = 'RANDOM_FN';

const MAX_PLAYERS = 10;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 20;

@Injectable()
export class GameService {
  private rooms = new Map<string, Room>();
  private playerRoomMap = new Map<string, string>(); // socketId -> roomCode
  private randomFn: () => number;

  constructor(@Optional() @Inject(RANDOM_FN) randomFn?: () => number) {
    this.randomFn = randomFn ?? Math.random;
  }

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
      words: new Map(),
      shuffledWords: [],
      families: [],
      currentTurnId: null,
      turnOrder: [],
      guesses: [],
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

  startGame(socketId: string): Room {
    const room = this.getRoomForPlayer(socketId);

    if (room.hostId !== socketId) {
      throw new WsException('Only the host can start the game');
    }

    if (room.state !== GameState.LOBBY) {
      throw new WsException('Game can only be started from the lobby');
    }

    if (room.players.size < 2) {
      throw new WsException('At least 2 players are required to start');
    }

    room.state = GameState.WORD_ENTRY;
    room.words = new Map();

    return room;
  }

  submitWord(
    socketId: string,
    word: string,
  ): { room: Room; allSubmitted: boolean } {
    const room = this.getRoomForPlayer(socketId);

    if (room.state !== GameState.WORD_ENTRY) {
      throw new WsException('Words can only be submitted during word entry');
    }

    if (room.words.has(socketId)) {
      throw new WsException('You have already submitted a word');
    }

    const trimmed = word?.trim() ?? '';
    if (trimmed.length === 0) {
      throw new WsException('Word cannot be empty');
    }
    if (trimmed.length > 50) {
      throw new WsException('Word must be 50 characters or fewer');
    }

    room.words.set(socketId, trimmed);

    const allSubmitted = room.words.size === room.players.size;
    if (allSubmitted) {
      room.state = GameState.READING;
      room.shuffledWords = this.fisherYatesShuffle(
        Array.from(room.words.values()),
      );
    }

    return { room, allSubmitted };
  }

  getShuffledWords(socketId: string): string[] {
    const room = this.getRoomForPlayer(socketId);

    const validStates = [GameState.READING, GameState.PLAYING, GameState.ENDED];
    if (!validStates.includes(room.state)) {
      throw new WsException('Words are not available in this state');
    }

    return room.shuffledWords;
  }

  advanceFromReading(socketId: string): Room {
    const room = this.getRoomForPlayer(socketId);

    if (room.hostId !== socketId) {
      throw new WsException('Only the host can advance the game');
    }

    if (room.state !== GameState.READING) {
      throw new WsException('Can only advance from reading state');
    }

    // Initialize families: each player is their own family
    const playerIds = Array.from(room.players.keys());
    room.families = playerIds.map(
      (id): Family => ({ leaderId: id, memberIds: [id] }),
    );

    // Build shuffled turn order
    room.turnOrder = this.fisherYatesShuffle([...playerIds]);
    room.currentTurnId = room.turnOrder[0];

    room.state = GameState.PLAYING;

    return room;
  }

  makeGuess(socketId: string, targetPlayerId: string, word: string): GuessResult {
    const room = this.getRoomForPlayer(socketId);

    if (room.state !== GameState.PLAYING) {
      throw new WsException('Guesses can only be made during play');
    }

    if (room.currentTurnId !== socketId) {
      throw new WsException('It is not your turn');
    }

    const guesserFamily = this.findFamilyByLeader(room, socketId);
    if (!guesserFamily) {
      throw new WsException('You are not a family leader');
    }

    if (!room.players.has(targetPlayerId)) {
      throw new WsException('Target player does not exist');
    }

    if (targetPlayerId === socketId) {
      throw new WsException('You cannot guess yourself');
    }

    if (guesserFamily.memberIds.includes(targetPlayerId)) {
      throw new WsException('Target is already in your family');
    }

    const trimmed = word?.trim() ?? '';
    if (trimmed.length === 0) {
      throw new WsException('Guess word cannot be empty');
    }

    const storedWord = room.words.get(targetPlayerId);
    const correct = storedWord?.toLowerCase() === trimmed.toLowerCase();

    const guessRecord: GuessRecord = {
      guesserSocketId: socketId,
      guessedSocketId: targetPlayerId,
      guessedWord: trimmed,
      wasCorrect: correct,
      timestamp: new Date(),
    };
    room.guesses.push(guessRecord);

    if (correct) {
      const targetFamily = this.findFamilyByMember(room, targetPlayerId);

      if (targetFamily.leaderId === targetPlayerId) {
        // Merge entire target family into guesser's family
        for (const memberId of targetFamily.memberIds) {
          guesserFamily.memberIds.push(memberId);
        }
        room.families = room.families.filter((f) => f !== targetFamily);
      } else {
        // Move just the target player
        targetFamily.memberIds = targetFamily.memberIds.filter(
          (id) => id !== targetPlayerId,
        );
        guesserFamily.memberIds.push(targetPlayerId);
      }

      // Check win condition
      if (room.families.length === 1) {
        room.state = GameState.ENDED;
        room.currentTurnId = null;

        return {
          correct: true,
          guesserId: socketId,
          targetPlayerId,
          word: trimmed,
          families: room.families,
          currentTurnId: null,
          gameOver: true,
          winner: {
            leaderId: guesserFamily.leaderId,
            memberIds: guesserFamily.memberIds,
          },
        };
      }

      // Turn stays with guesser
    } else {
      this.advanceTurn(room);
    }

    return {
      correct,
      guesserId: socketId,
      targetPlayerId,
      word: trimmed,
      families: room.families,
      currentTurnId: room.currentTurnId,
      gameOver: false,
    };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  private getRoomForPlayer(socketId: string): Room {
    const roomCode = this.playerRoomMap.get(socketId);
    if (!roomCode) {
      throw new WsException('Player is not in a room');
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new WsException('Room not found');
    }

    return room;
  }

  private advanceTurn(room: Room): void {
    const currentIndex = room.turnOrder.indexOf(room.currentTurnId!);
    const len = room.turnOrder.length;
    const leaderIds = new Set(room.families.map((f) => f.leaderId));

    for (let offset = 1; offset < len; offset++) {
      const candidate = room.turnOrder[(currentIndex + offset) % len];
      if (leaderIds.has(candidate)) {
        room.currentTurnId = candidate;
        return;
      }
    }
  }

  private findFamilyByMember(room: Room, playerId: string): Family {
    const family = room.families.find((f) => f.memberIds.includes(playerId));
    if (!family) {
      throw new WsException('Player is not in any family');
    }
    return family;
  }

  private findFamilyByLeader(room: Room, playerId: string): Family | undefined {
    return room.families.find((f) => f.leaderId === playerId);
  }

  private fisherYatesShuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.randomFn() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
