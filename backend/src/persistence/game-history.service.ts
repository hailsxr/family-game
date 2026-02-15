import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';

export interface GameSummary {
  id: string;
  roomCode: string;
  createdAt: Date;
  endedAt: Date;
  winnerPlayerName: string;
  totalPlayers: number;
  durationSeconds: number;
  totalGuesses: number;
  correctPercent: number;
}

export interface GameDetail extends GameSummary {
  players: {
    playerName: string;
    submittedWord: string;
    finalFamilyLeaderName: string;
    wasWinner: boolean;
  }[];
  guesses: {
    guesserPlayerName: string;
    guessedPlayerName: string;
    guessedWord: string;
    wasCorrect: boolean;
    timestamp: Date;
  }[];
}

@Injectable()
export class GameHistoryService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  async listGames(limit: number): Promise<GameSummary[]> {
    const games = await this.gameRepo.find({
      relations: ['guesses'],
      order: { endedAt: 'DESC' },
      take: limit,
    });

    return games.map((game) => this.toSummary(game));
  }

  async getGame(id: string): Promise<GameDetail | null> {
    const game = await this.gameRepo.findOne({
      where: { id },
      relations: ['players', 'guesses'],
    });

    if (!game) return null;

    const summary = this.toSummary(game);
    return {
      ...summary,
      players: game.players.map((p) => ({
        playerName: p.playerName,
        submittedWord: p.submittedWord,
        finalFamilyLeaderName: p.finalFamilyLeaderName,
        wasWinner: p.wasWinner,
      })),
      guesses: game.guesses.map((g) => ({
        guesserPlayerName: g.guesserPlayerName,
        guessedPlayerName: g.guessedPlayerName,
        guessedWord: g.guessedWord,
        wasCorrect: g.wasCorrect,
        timestamp: g.timestamp,
      })),
    };
  }

  private toSummary(game: Game): GameSummary {
    const durationSeconds = Math.round(
      (game.endedAt.getTime() - game.createdAt.getTime()) / 1000,
    );
    const totalGuesses = game.guesses?.length ?? 0;
    const correctGuesses =
      game.guesses?.filter((g) => g.wasCorrect).length ?? 0;
    const correctPercent =
      totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;

    return {
      id: game.id,
      roomCode: game.roomCode,
      createdAt: game.createdAt,
      endedAt: game.endedAt,
      winnerPlayerName: game.winnerPlayerName,
      totalPlayers: game.totalPlayers,
      durationSeconds,
      totalGuesses,
      correctPercent,
    };
  }
}
