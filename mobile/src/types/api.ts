export interface GameSummary {
  id: string;
  roomCode: string;
  createdAt: string;
  endedAt: string;
  winnerPlayerName: string;
  totalPlayers: number;
  durationSeconds: number;
  totalGuesses: number;
  correctPercent: number;
}

export interface GamePlayerDetail {
  playerName: string;
  submittedWord: string;
  finalFamilyLeaderName: string;
  wasWinner: boolean;
}

export interface GameGuessDetail {
  guesserPlayerName: string;
  guessedPlayerName: string;
  guessedWord: string;
  wasCorrect: boolean;
  timestamp: string;
}

export interface GameDetail extends GameSummary {
  players: GamePlayerDetail[];
  guesses: GameGuessDetail[];
}
