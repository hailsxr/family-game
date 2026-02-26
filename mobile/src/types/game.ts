export enum GameState {
  LOBBY = 'LOBBY',
  WORD_ENTRY = 'WORD_ENTRY',
  READING = 'READING',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

export interface SerializedPlayer {
  id: string;
  name: string;
  isHost: boolean;
}

export interface Family {
  leaderId: string;
  memberIds: string[];
}

export interface SerializedRoom {
  code: string;
  state: GameState;
  players: SerializedPlayer[];
  hostId: string;
  wordCount: number;
  families: Family[];
  currentTurnId: string | null;
  turnOrder: string[];
  shuffledWords?: string[];
}

export interface PlayerLeftPayload {
  player: SerializedPlayer;
  room: SerializedRoom;
}

export interface ErrorPayload {
  message: string;
}

export interface WordSubmittedPayload {
  playerId: string;
  wordCount: number;
  totalPlayers: number;
}

export interface ReadingWordsPayload {
  words: string[];
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
  gameId?: string;
}
