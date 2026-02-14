import { WsException } from '@nestjs/websockets';
import { GameService } from './game.service';
import { GameState } from './interfaces/game.interfaces';

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    service = new GameService();
  });

  describe('createRoom', () => {
    it('creates a room in LOBBY state with the host as the only player', () => {
      const room = service.createRoom('Alice', 'socket-1');

      expect(room.state).toBe(GameState.LOBBY);
      expect(room.players.size).toBe(1);
    });

    it('sets the host player with isHost: true', () => {
      const room = service.createRoom('Alice', 'socket-1');
      const host = room.players.get('socket-1');

      expect(host).toBeDefined();
      expect(host!.isHost).toBe(true);
      expect(host!.name).toBe('Alice');
      expect(room.hostId).toBe('socket-1');
    });

    it('initializes new room fields with safe defaults', () => {
      const room = service.createRoom('Alice', 'socket-1');

      expect(room.shuffledWords).toEqual([]);
      expect(room.families).toEqual([]);
      expect(room.currentTurnId).toBeNull();
      expect(room.turnOrder).toEqual([]);
    });

    it('room is retrievable via getRoom', () => {
      const room = service.createRoom('Alice', 'socket-1');
      const retrieved = service.getRoom(room.code);

      expect(retrieved).toBe(room);
    });

    it.each(['', ' ', 'A', 'A'.repeat(21)])(
      'throws on invalid player name: "%s"',
      (name) => {
        expect(() => service.createRoom(name, 'socket-1')).toThrow(
          WsException,
        );
      },
    );
  });

  describe('joinRoom', () => {
    let roomCode: string;

    beforeEach(() => {
      const room = service.createRoom('Alice', 'socket-host');
      roomCode = room.code;
    });

    it('adds a player to an existing room', () => {
      const room = service.joinRoom(roomCode, 'Bob', 'socket-2');

      expect(room.players.size).toBe(2);
      expect(room.players.get('socket-2')).toBeDefined();
    });

    it('joined player has isHost: false', () => {
      const room = service.joinRoom(roomCode, 'Bob', 'socket-2');
      const player = room.players.get('socket-2');

      expect(player!.isHost).toBe(false);
    });

    it('throws "Room not found" for invalid code', () => {
      expect(() =>
        service.joinRoom('ZZZZ', 'Bob', 'socket-2'),
      ).toThrow('Room not found');
    });

    it('throws "not accepting new players" if room state is not LOBBY', () => {
      const room = service.getRoom(roomCode)!;
      room.state = GameState.PLAYING;

      expect(() =>
        service.joinRoom(roomCode, 'Bob', 'socket-2'),
      ).toThrow('not accepting new players');
    });

    it('throws "Room is full" at 10 players', () => {
      for (let i = 1; i <= 9; i++) {
        service.joinRoom(roomCode, `Player${i}`, `socket-${i}`);
      }

      expect(() =>
        service.joinRoom(roomCode, 'Overflow', 'socket-overflow'),
      ).toThrow('Room is full');
    });

    it('throws "name already taken" for duplicate name (case-insensitive)', () => {
      expect(() =>
        service.joinRoom(roomCode, 'alice', 'socket-2'),
      ).toThrow('already taken');
    });
  });

  describe('removePlayer', () => {
    it('returns null for unknown socketId', () => {
      expect(service.removePlayer('unknown')).toBeNull();
    });

    it('removes player from room, room still exists with remaining players', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');

      const result = service.removePlayer('socket-2');

      expect(result).not.toBeNull();
      expect(result!.player.name).toBe('Bob');
      expect(service.getRoom(room.code)).toBeDefined();
      expect(service.getRoom(room.code)!.players.size).toBe(1);
    });

    it('deletes room entirely when last player leaves', () => {
      const room = service.createRoom('Alice', 'socket-1');

      service.removePlayer('socket-1');

      expect(service.getRoom(room.code)).toBeUndefined();
    });

    it('reassigns host to next player when host disconnects', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');

      service.removePlayer('socket-1');

      const updated = service.getRoom(room.code)!;
      expect(updated.hostId).toBe('socket-2');
      expect(updated.players.get('socket-2')!.isHost).toBe(true);
    });
  });

  describe('startGame', () => {
    let roomCode: string;

    beforeEach(() => {
      const room = service.createRoom('Alice', 'socket-host');
      roomCode = room.code;
      service.joinRoom(roomCode, 'Bob', 'socket-2');
    });

    it('transitions LOBBY → WORD_ENTRY', () => {
      const room = service.startGame('socket-host');

      expect(room.state).toBe(GameState.WORD_ENTRY);
      expect(room.words.size).toBe(0);
    });

    it('throws if caller is not the host', () => {
      expect(() => service.startGame('socket-2')).toThrow(
        'Only the host can start the game',
      );
    });

    it('throws if room is not in LOBBY state', () => {
      service.startGame('socket-host');

      expect(() => service.startGame('socket-host')).toThrow(
        'Game can only be started from the lobby',
      );
    });

    it('throws if fewer than 2 players', () => {
      const solo = service.createRoom('Solo', 'socket-solo');

      expect(() => service.startGame('socket-solo')).toThrow(
        'At least 2 players are required to start',
      );
    });
  });

  describe('submitWord', () => {
    let roomCode: string;

    beforeEach(() => {
      const room = service.createRoom('Alice', 'socket-host');
      roomCode = room.code;
      service.joinRoom(roomCode, 'Bob', 'socket-2');
      service.startGame('socket-host');
    });

    it('stores word for player', () => {
      const { room } = service.submitWord('socket-host', 'apple');

      expect(room.words.get('socket-host')).toBe('apple');
    });

    it('throws if room is not in WORD_ENTRY state', () => {
      service.submitWord('socket-host', 'apple');
      service.submitWord('socket-2', 'banana');

      // Room is now in READING state
      expect(() => service.submitWord('socket-host', 'cherry')).toThrow(
        'Words can only be submitted during word entry',
      );
    });

    it('throws if player already submitted', () => {
      service.submitWord('socket-host', 'apple');

      expect(() => service.submitWord('socket-host', 'banana')).toThrow(
        'You have already submitted a word',
      );
    });

    it('throws on empty word', () => {
      expect(() => service.submitWord('socket-host', '')).toThrow(
        'Word cannot be empty',
      );
      expect(() => service.submitWord('socket-host', '   ')).toThrow(
        'Word cannot be empty',
      );
    });

    it('throws on word longer than 50 characters', () => {
      expect(() =>
        service.submitWord('socket-host', 'a'.repeat(51)),
      ).toThrow('Word must be 50 characters or fewer');
    });

    it('auto-transitions to READING when all players submit', () => {
      service.submitWord('socket-host', 'apple');
      const { room, allSubmitted } = service.submitWord('socket-2', 'banana');

      expect(allSubmitted).toBe(true);
      expect(room.state).toBe(GameState.READING);
    });

    it('populates shuffledWords when auto-transitioning to READING', () => {
      service.submitWord('socket-host', 'apple');
      const { room } = service.submitWord('socket-2', 'banana');

      expect(room.shuffledWords).toHaveLength(2);
      expect(room.shuffledWords).toContain('apple');
      expect(room.shuffledWords).toContain('banana');
    });

    it('shuffledWords contains word values only, no player IDs', () => {
      service.submitWord('socket-host', 'apple');
      const { room } = service.submitWord('socket-2', 'banana');

      for (const word of room.shuffledWords) {
        expect(word).not.toBe('socket-host');
        expect(word).not.toBe('socket-2');
      }
    });

    it('does not transition when only some players submitted', () => {
      const { room, allSubmitted } = service.submitWord(
        'socket-host',
        'apple',
      );

      expect(allSubmitted).toBe(false);
      expect(room.state).toBe(GameState.WORD_ENTRY);
    });
  });

  describe('getShuffledWords', () => {
    let roomCode: string;

    beforeEach(() => {
      const room = service.createRoom('Alice', 'socket-host');
      roomCode = room.code;
      service.joinRoom(roomCode, 'Bob', 'socket-2');
      service.startGame('socket-host');
      service.submitWord('socket-host', 'apple');
      service.submitWord('socket-2', 'banana');
    });

    it('returns the shuffled words array in READING state', () => {
      const words = service.getShuffledWords('socket-host');

      expect(words).toHaveLength(2);
      expect(words).toContain('apple');
      expect(words).toContain('banana');
    });

    it('throws if not in READING or later state', () => {
      // Create a fresh room still in WORD_ENTRY
      const room2 = service.createRoom('Charlie', 'socket-3');
      service.joinRoom(room2.code, 'Dave', 'socket-4');
      service.startGame('socket-3');

      expect(() => service.getShuffledWords('socket-3')).toThrow(
        'Words are not available in this state',
      );
    });
  });

  describe('advanceFromReading', () => {
    let roomCode: string;

    beforeEach(() => {
      const room = service.createRoom('Alice', 'socket-host');
      roomCode = room.code;
      service.joinRoom(roomCode, 'Bob', 'socket-2');
      service.startGame('socket-host');
      service.submitWord('socket-host', 'apple');
      service.submitWord('socket-2', 'banana');
    });

    it('transitions READING → PLAYING', () => {
      const room = service.advanceFromReading('socket-host');

      expect(room.state).toBe(GameState.PLAYING);
    });

    it('initializes families: each player is own family leader with themselves as only member', () => {
      const room = service.advanceFromReading('socket-host');

      expect(room.families).toHaveLength(2);
      for (const family of room.families) {
        expect(family.memberIds).toEqual([family.leaderId]);
      }
      const leaderIds = room.families.map((f) => f.leaderId).sort();
      expect(leaderIds).toEqual(['socket-2', 'socket-host']);
    });

    it('sets currentTurnId to a valid player ID', () => {
      const room = service.advanceFromReading('socket-host');

      expect(room.currentTurnId).not.toBeNull();
      expect(room.players.has(room.currentTurnId!)).toBe(true);
    });

    it('turnOrder contains all player IDs', () => {
      const room = service.advanceFromReading('socket-host');

      expect(room.turnOrder).toHaveLength(2);
      expect(room.turnOrder.sort()).toEqual(['socket-2', 'socket-host']);
    });

    it('currentTurnId is the first element of turnOrder', () => {
      const room = service.advanceFromReading('socket-host');

      expect(room.currentTurnId).toBe(room.turnOrder[0]);
    });

    it('throws if not host', () => {
      expect(() => service.advanceFromReading('socket-2')).toThrow(
        'Only the host can advance the game',
      );
    });

    it('throws if not in READING state', () => {
      service.advanceFromReading('socket-host');

      expect(() => service.advanceFromReading('socket-host')).toThrow(
        'Can only advance from reading state',
      );
    });
  });

  describe('advanceFromReading (seeded random)', () => {
    it('produces deterministic turn order with seeded randomFn', () => {
      // Use a simple seeded random: always returns 0, so shuffle is identity
      const seeded = new GameService(() => 0);
      const room = seeded.createRoom('Alice', 'socket-host');
      seeded.joinRoom(room.code, 'Bob', 'socket-2');
      seeded.startGame('socket-host');
      seeded.submitWord('socket-host', 'apple');
      seeded.submitWord('socket-2', 'banana');

      const result = seeded.advanceFromReading('socket-host');

      // With randomFn always returning 0, Math.floor(0 * (i+1)) = 0, so swap(i,0) each time
      // This is deterministic — run it twice to confirm
      const seeded2 = new GameService(() => 0);
      const room2 = seeded2.createRoom('Alice', 'socket-host');
      seeded2.joinRoom(room2.code, 'Bob', 'socket-2');
      seeded2.startGame('socket-host');
      seeded2.submitWord('socket-host', 'apple');
      seeded2.submitWord('socket-2', 'banana');

      const result2 = seeded2.advanceFromReading('socket-host');

      expect(result.turnOrder).toEqual(result2.turnOrder);
      expect(result.currentTurnId).toBe(result2.currentTurnId);
    });
  });

  describe('getRoom', () => {
    it('returns undefined for nonexistent code', () => {
      expect(service.getRoom('NOPE')).toBeUndefined();
    });
  });
});
