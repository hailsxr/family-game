import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { GameHistoryService } from './game-history.service';

@Controller('games')
export class GameHistoryController {
  constructor(private readonly gameHistoryService: GameHistoryService) {}

  @Get()
  async listGames(@Query('limit') limitParam?: string) {
    let limit = 20;
    const parsed = Number(limitParam);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 50);
    }
    return this.gameHistoryService.listGames(limit);
  }

  @Get(':id')
  async getGame(@Param('id') id: string) {
    const game = await this.gameHistoryService.getGame(id);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }
}
