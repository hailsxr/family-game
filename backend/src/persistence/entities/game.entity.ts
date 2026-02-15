import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GamePlayer } from './game-player.entity';
import { GameGuess } from './game-guess.entity';

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  roomCode!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  endedAt!: Date;

  @Column()
  winnerPlayerName!: string;

  @Column()
  totalPlayers!: number;

  @OneToMany(() => GamePlayer, (player) => player.game, { cascade: true })
  players!: GamePlayer[];

  @OneToMany(() => GameGuess, (guess) => guess.game, { cascade: true })
  guesses!: GameGuess[];
}
