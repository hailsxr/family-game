import { create } from 'zustand';
import { SerializedRoom } from '../types/game';

interface GameState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  mySocketId: string | null;
  myName: string;
  room: SerializedRoom | null;
  error: string | null;
}

interface GameActions {
  setConnectionStatus: (status: GameState['connectionStatus']) => void;
  setMySocketId: (id: string | null) => void;
  setMyName: (name: string) => void;
  setRoom: (room: SerializedRoom) => void;
  clearRoom: () => void;
  setError: (error: string) => void;
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  connectionStatus: 'disconnected',
  mySocketId: null,
  myName: '',
  room: null,
  error: null,

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setMySocketId: (mySocketId) => set({ mySocketId }),
  setMyName: (myName) => set({ myName }),
  setRoom: (room) => set({ room, error: null }),
  clearRoom: () => set({ room: null, mySocketId: null }),
  setError: (error) => set({ error }),
}));

export const selectIsHost = (state: GameState & GameActions) =>
  state.room !== null && state.mySocketId === state.room.hostId;

export const selectMyPlayer = (state: GameState & GameActions) =>
  state.room?.players.find((p) => p.id === state.mySocketId) ?? null;
