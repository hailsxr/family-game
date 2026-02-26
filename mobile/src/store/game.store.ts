import { create } from 'zustand';
import { SerializedRoom, GuessResult } from '../types/game';

interface GameState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  mySocketId: string | null;
  myName: string;
  room: SerializedRoom | null;
  error: string | null;
  submittedWord: string | null;
  wordSubmittedCount: number;
  totalPlayers: number;
  shuffledWords: string[];
  lastGuessResult: GuessResult | null;
  gameId: string | null;
}

interface GameActions {
  setConnectionStatus: (status: GameState['connectionStatus']) => void;
  setMySocketId: (id: string | null) => void;
  setMyName: (name: string) => void;
  setRoom: (room: SerializedRoom) => void;
  clearRoom: () => void;
  setError: (error: string) => void;
  setSubmittedWord: (word: string) => void;
  setWordSubmittedCount: (count: number, total: number) => void;
  setShuffledWords: (words: string[]) => void;
  setLastGuessResult: (result: GuessResult | null) => void;
  setGameId: (id: string | null) => void;
  resetGamePhase: () => void;
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  connectionStatus: 'disconnected',
  mySocketId: null,
  myName: '',
  room: null,
  error: null,
  submittedWord: null,
  wordSubmittedCount: 0,
  totalPlayers: 0,
  shuffledWords: [],
  lastGuessResult: null,
  gameId: null,

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setMySocketId: (mySocketId) => set({ mySocketId }),
  setMyName: (myName) => set({ myName }),
  setRoom: (room) => set({ room, error: null }),
  clearRoom: () =>
    set({
      room: null,
      mySocketId: null,
      submittedWord: null,
      wordSubmittedCount: 0,
      totalPlayers: 0,
      shuffledWords: [],
      lastGuessResult: null,
      gameId: null,
    }),
  setError: (error) => set({ error }),
  setSubmittedWord: (word) => set({ submittedWord: word }),
  setWordSubmittedCount: (count, total) =>
    set({ wordSubmittedCount: count, totalPlayers: total }),
  setShuffledWords: (words) => set({ shuffledWords: words }),
  setLastGuessResult: (lastGuessResult) => set({ lastGuessResult }),
  setGameId: (gameId) => set({ gameId }),
  resetGamePhase: () =>
    set({
      submittedWord: null,
      wordSubmittedCount: 0,
      shuffledWords: [],
      lastGuessResult: null,
      gameId: null,
    }),
}));

export const selectIsHost = (state: GameState & GameActions) =>
  state.room !== null && state.mySocketId === state.room.hostId;

export const selectMyPlayer = (state: GameState & GameActions) =>
  state.room?.players.find((p) => p.id === state.mySocketId) ?? null;
