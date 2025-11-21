import { create } from 'zustand';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export interface GameState {
  quiz: any | null;
  isStarted: boolean;
  currentQuestionIndex: number;
  scores: Record<string, number>;
}

export interface Room {
  code: string;
  host: string;
  players: Player[];
  gameState: GameState;
  maxPlayers: number;
  createdAt: number;
}

interface RoomStore {
  room: Room | null;
  currentPlayer: Player | null;
  isConnected: boolean;
  error: string | null;

  setRoom: (room: Room | null) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  updateRoom: (updates: Partial<Room>) => void;
  updateGameState: (updates: Partial<GameState>) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  currentPlayer: null,
  isConnected: false,
  error: null,

  setRoom: (room) => set({ room }),

  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  setConnected: (connected) => set({ isConnected: connected }),

  setError: (error) => set({ error }),

  updateRoom: (updates) => set((state) => ({
    room: state.room ? { ...state.room, ...updates } : null
  })),

  updateGameState: (updates) => set((state) => ({
    room: state.room
      ? {
          ...state.room,
          gameState: { ...state.room.gameState, ...updates }
        }
      : null
  })),

  reset: () => set({
    room: null,
    currentPlayer: null,
    isConnected: false,
    error: null
  })
}));
