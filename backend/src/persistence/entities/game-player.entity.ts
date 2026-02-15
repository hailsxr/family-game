import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Game } from './game.entity';

@Entity()
export class GamePlayer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Game, (game) => game.players)
  game!: Game;

  @Column()
  gameId!: string;

  @Column()
  playerName!: string;

  @Column()
  submittedWord!: string;

  @Column()
  finalFamilyLeaderName!: string;

  @Column()
  wasWinner!: boolean;
}
