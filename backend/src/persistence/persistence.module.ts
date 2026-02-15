import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { GameGuess } from './entities/game-guess.entity';
import { GamePersistenceService } from './game-persistence.service';
import { GameHistoryService } from './game-history.service';
import { GameHistoryController } from './game-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GamePlayer, GameGuess])],
  providers: [GamePersistenceService, GameHistoryService],
  controllers: [GameHistoryController],
  exports: [GamePersistenceService],
})
export class PersistenceModule {}
