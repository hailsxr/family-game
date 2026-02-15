import { GamePersistenceService } from './game-persistence.service';
import { GameState, Room } from '../game/interfaces/game.interfaces';

function createMockRepo() {
  return {
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn((entity) =>
      Promise.resolve(
        Array.isArray(entity)
          ? entity.map((e, i) => ({ ...e, id: `id-${i}` }))
          : { ...entity, id: 'game-id-1' },
      ),
    ),
    find: jest.fn(),
    findOne: jest.fn(),
  };
}

function createTestRoom(overrides?: Partial<Room>): Room {
  const players = new Map([
    ['s1', { id: 's1', name: 'Alice', roomCode: 'ABCD', isHost: true }],
    ['s2', { id: 's2', name: 'Bob', roomCode: 'ABCD', isHost: false }],
    ['s3', { id: 's3', name: 'Charlie', roomCode: 'ABCD', isHost: false }],
  ]);

  const words = new Map([
    ['s1', 'apple'],
    ['s2', 'banana'],
    ['s3', 'cherry'],
  ]);

  return {
    code: 'ABCD',
    state: GameState.ENDED,
    players,
    hostId: 's1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    words,
    shuffledWords: ['banana', 'cherry', 'apple'],
    families: [{ leaderId: 's1', memberIds: ['s1', 's2', 's3'] }],
    currentTurnId: null,
    turnOrder: ['s1', 's2', 's3'],
    guesses: [
      {
        guesserSocketId: 's1',
        guessedSocketId: 's2',
        guessedWord: 'banana',
        wasCorrect: true,
        timestamp: new Date('2025-01-01T00:01:00Z'),
      },
      {
        guesserSocketId: 's1',
        guessedSocketId: 's3',
        guessedWord: 'cherry',
        wasCorrect: true,
        timestamp: new Date('2025-01-01T00:02:00Z'),
      },
    ],
    ...overrides,
  };
}

describe('GamePersistenceService', () => {
  let service: GamePersistenceService;
  let gameRepo: ReturnType<typeof createMockRepo>;
  let playerRepo: ReturnType<typeof createMockRepo>;
  let guessRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    gameRepo = createMockRepo();
    playerRepo = createMockRepo();
    guessRepo = createMockRepo();

    service = new GamePersistenceService(
      gameRepo as any,
      playerRepo as any,
      guessRepo as any,
    );
  });

  it('creates a Game record with correct fields', async () => {
    const room = createTestRoom();
    await service.persistEndedGame(room, 's1');

    expect(gameRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        roomCode: 'ABCD',
        createdAt: room.createdAt,
        winnerPlayerName: 'Alice',
        totalPlayers: 3,
      }),
    );
    expect(gameRepo.save).toHaveBeenCalled();
  });

  it('creates player records with resolved names and wasWinner', async () => {
    const room = createTestRoom();
    await service.persistEndedGame(room, 's1');

    expect(playerRepo.create).toHaveBeenCalledTimes(3);

    const calls = playerRepo.create.mock.calls.map((c: any[]) => c[0]);

    const alice = calls.find((c: any) => c.playerName === 'Alice');
    expect(alice).toBeDefined();
    expect(alice.submittedWord).toBe('apple');
    expect(alice.finalFamilyLeaderName).toBe('Alice');
    expect(alice.wasWinner).toBe(true);

    const bob = calls.find((c: any) => c.playerName === 'Bob');
    expect(bob).toBeDefined();
    expect(bob.submittedWord).toBe('banana');
    expect(bob.finalFamilyLeaderName).toBe('Alice');
    expect(bob.wasWinner).toBe(true);
  });

  it('creates guess records with resolved player names', async () => {
    const room = createTestRoom();
    await service.persistEndedGame(room, 's1');

    expect(guessRepo.save).toHaveBeenCalled();
    const savedGuesses = guessRepo.save.mock.calls[0][0];
    expect(savedGuesses).toHaveLength(2);

    expect(savedGuesses[0].guesserPlayerName).toBe('Alice');
    expect(savedGuesses[0].guessedPlayerName).toBe('Bob');
    expect(savedGuesses[0].guessedWord).toBe('banana');
    expect(savedGuesses[0].wasCorrect).toBe(true);

    expect(savedGuesses[1].guesserPlayerName).toBe('Alice');
    expect(savedGuesses[1].guessedPlayerName).toBe('Charlie');
  });

  it('skips guessRepo.save when there are no guesses', async () => {
    const room = createTestRoom({ guesses: [] });
    await service.persistEndedGame(room, 's1');

    expect(guessRepo.save).not.toHaveBeenCalled();
  });
});
