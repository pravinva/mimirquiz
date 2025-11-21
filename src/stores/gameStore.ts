import { create } from 'zustand';
import { GameState, AnswerResult, MicState } from '@/lib/game/types';

interface GameStore extends Partial<GameState> {
  setGameState: (state: Partial<GameState>) => void;
  updateTimer: (seconds: number) => void;
  setMicState: (state: MicState) => void;
  setShowAnswer: (show: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  sessionId: undefined,
  status: 'setup',
  quizFileId: undefined,
  league: undefined,
  topic: undefined,
  players: [],
  currentQuestionIndex: 0,
  currentPlayerIndex: 0,
  questions: [],
  addressedPlayerIndex: 0,
  attemptCount: 0,
  micState: 'disabled',
  activeMicPlayerIndex: null,
  timerSeconds: 0,
  showAnswer: false,
  overruleInProgress: false,

  setGameState: (state) => set(state),

  updateTimer: (seconds) => set({ timerSeconds: seconds }),

  setMicState: (micState) => set({ micState }),

  setShowAnswer: (showAnswer) => set({ showAnswer }),

  resetGame: () => set({
    sessionId: undefined,
    status: 'setup',
    quizFileId: undefined,
    league: undefined,
    topic: undefined,
    players: [],
    currentQuestionIndex: 0,
    currentPlayerIndex: 0,
    questions: [],
    addressedPlayerIndex: 0,
    attemptCount: 0,
    micState: 'disabled',
    activeMicPlayerIndex: null,
    timerSeconds: 0,
    showAnswer: false,
    overruleInProgress: false,
  }),
}));
