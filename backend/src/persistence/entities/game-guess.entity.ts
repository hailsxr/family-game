import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Game } from './game.entity';

@Entity()
export class GameGuess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Game, (game) => game.guesses)
  game!: Game;

  @Column()
  gameId!: string;

  @Column()
  guesserPlayerName!: string;

  @Column()
  guessedPlayerName!: string;

  @Column()
  guessedWord!: string;

  @Column()
  wasCorrect!: boolean;

  @Column()
  timestamp!: Date;
}
