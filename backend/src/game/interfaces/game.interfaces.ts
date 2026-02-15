export enum GameState {
  LOBBY = 'LOBBY',
  WORD_ENTRY = 'WORD_ENTRY',
  READING = 'READING',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

export interface Player {
  id: string; // socket.id
  name: string;
  roomCode: string;
  isHost: boolean;
}

export interface Family {
  leaderId: string;
  memberIds: string[];
}

export interface GuessResult {
  correct: boolean;
  guesserId: string;
  targetPlayerId: string;
  word: string;
  families: Family[];
  currentTurnId: string | null;
  gameOver: boolean;
  winner?: { leaderId: string; memberIds: string[] };
}

export interface GuessRecord {
  guesserSocketId: string;
  guessedSocketId: string;
  guessedWord: string;
  wasCorrect: boolean;
  timestamp: Date;
}

export interface Room {
  code: string;
  state: GameState;
  players: Map<string, Player>;
  hostId: string;
  createdAt: Date;
  words: Map<string, string>; // playerId → word
  shuffledWords: string[];
  families: Family[];
  currentTurnId: string | null;
  turnOrder: string[];
  guesses: GuessRecord[];
}
