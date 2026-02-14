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

export interface Room {
  code: string;
  state: GameState;
  players: Map<string, Player>;
  hostId: string;
  createdAt: Date;
}
