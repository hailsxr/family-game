import { NotFoundException } from '@nestjs/common';
import { GameHistoryController } from './game-history.controller';
import { GameHistoryService, GameSummary, GameDetail } from './game-history.service';

const mockSummary: GameSummary = {
  id: 'game-1',
  roomCode: 'ABCD',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  endedAt: new Date('2025-01-01T00:10:00Z'),
  winnerPlayerName: 'Alice',
  totalPlayers: 3,
  durationSeconds: 600,
  totalGuesses: 5,
  correctPercent: 60,
};

const mockDetail: GameDetail = {
  ...mockSummary,
  players: [
    {
      playerName: 'Alice',
      submittedWord: 'apple',
      finalFamilyLeaderName: 'Alice',
      wasWinner: true,
    },
  ],
  guesses: [
    {
      guesserPlayerName: 'Alice',
      guessedPlayerName: 'Bob',
      guessedWord: 'banana',
      wasCorrect: true,
      timestamp: new Date('2025-01-01T00:05:00Z'),
    },
  ],
};

describe('GameHistoryController', () => {
  let controller: GameHistoryController;
  let historyService: { listGames: jest.Mock; getGame: jest.Mock };

  beforeEach(() => {
    historyService = {
      listGames: jest.fn().mockResolvedValue([mockSummary]),
      getGame: jest.fn().mockResolvedValue(mockDetail),
    };

    controller = new GameHistoryController(
      historyService as unknown as GameHistoryService,
    );
  });

  describe('GET /games', () => {
    it('uses default limit of 20', async () => {
      await controller.listGames(undefined);
      expect(historyService.listGames).toHaveBeenCalledWith(20);
    });

    it('clamps limit to 50 max', async () => {
      await controller.listGames('100');
      expect(historyService.listGames).toHaveBeenCalledWith(50);
    });

    it('handles non-numeric limit gracefully (falls back to 20)', async () => {
      await controller.listGames('abc');
      expect(historyService.listGames).toHaveBeenCalledWith(20);
    });

    it('accepts a valid numeric limit', async () => {
      await controller.listGames('10');
      expect(historyService.listGames).toHaveBeenCalledWith(10);
    });
  });

  describe('GET /games/:id', () => {
    it('returns game detail', async () => {
      const result = await controller.getGame('game-1');
      expect(result).toEqual(mockDetail);
      expect(historyService.getGame).toHaveBeenCalledWith('game-1');
    });

    it('throws NotFoundException when game not found', async () => {
      historyService.getGame.mockResolvedValue(null);

      await expect(controller.getGame('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
