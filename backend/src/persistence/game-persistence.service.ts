import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { GameGuess } from './entities/game-guess.entity';
import { Room } from '../game/interfaces/game.interfaces';

@Injectable()
export class GamePersistenceService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(GamePlayer)
    private readonly playerRepo: Repository<GamePlayer>,
    @InjectRepository(GameGuess)
    private readonly guessRepo: Repository<GameGuess>,
  ) {}

  async persistEndedGame(
    room: Room,
    winnerLeaderId: string,
  ): Promise<void> {
    const winnerPlayer = room.players.get(winnerLeaderId);
    const winnerName = winnerPlayer?.name ?? 'Unknown';

    const game = this.gameRepo.create({
      roomCode: room.code,
      createdAt: room.createdAt,
      endedAt: new Date(),
      winnerPlayerName: winnerName,
      totalPlayers: room.players.size,
    });
    const savedGame = await this.gameRepo.save(game);

    const playerRecords: GamePlayer[] = [];
    for (const [socketId, player] of room.players) {
      const family = room.families.find((f) =>
        f.memberIds.includes(socketId),
      );
      const leaderSocketId = family?.leaderId ?? socketId;
      const leaderPlayer = room.players.get(leaderSocketId);

      playerRecords.push(
        this.playerRepo.create({
          gameId: savedGame.id,
          playerName: player.name,
          submittedWord: room.words.get(socketId) ?? '',
          finalFamilyLeaderName: leaderPlayer?.name ?? 'Unknown',
          wasWinner: leaderSocketId === winnerLeaderId,
        }),
      );
    }
    await this.playerRepo.save(playerRecords);

    if (room.guesses.length > 0) {
      const guessRecords = room.guesses.map((g) => {
        const guesserPlayer = room.players.get(g.guesserSocketId);
        const guessedPlayer = room.players.get(g.guessedSocketId);

        return this.guessRepo.create({
          gameId: savedGame.id,
          guesserPlayerName: guesserPlayer?.name ?? 'Unknown',
          guessedPlayerName: guessedPlayer?.name ?? 'Unknown',
          guessedWord: g.guessedWord,
          wasCorrect: g.wasCorrect,
          timestamp: g.timestamp,
        });
      });
      await this.guessRepo.save(guessRecords);
    }
  }
}
