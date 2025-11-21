export type GameStatus = 'setup' | 'in_progress' | 'paused' | 'completed';
export type AnswerResult = 'correct' | 'incorrect' | 'passed' | 'timeout';
export type MicState = 'disabled' | 'active' | 'listening' | 'overrule_window';

export interface Player {
  id: number;
  name: string;
  score: number;
}

export interface Question {
  id: number;
  roundNumber: number;
  playerNumber: number;
  question: string;
  questionImageUrl?: string;
  answer: string;
  answerImageUrl?: string;
  orderIndex: number;
}

export interface GameState {
  sessionId: number;
  status: GameStatus;
  quizFileId: number;
  league: string;
  topic: string;
  players: Player[];
  currentQuestionIndex: number;
  currentPlayerIndex: number;
  questions: Question[];
  addressedPlayerIndex: number;
  attemptCount: number;
  micState: MicState;
  activeMicPlayerIndex: number | null;
  timerSeconds: number;
  showAnswer: boolean;
  overruleInProgress: boolean;
}

export interface AnswerAttempt {
  playerId: number;
  playerName: string;
  spokenAnswer: string;
  result: AnswerResult;
  isAddressed: boolean;
  timeTaken: number;
  attemptOrder: number;
}

export const MIMIR_RULES = {
  ADDRESSED_TIMER_SECONDS: 30,
  PASSED_TIMER_SECONDS: 5,
  OVERRULE_WINDOW_SECONDS: 5,
  POST_CORRECT_PAUSE_SECONDS: 3,
  POINTS_CORRECT_ADDRESSED: 3,
  POINTS_CORRECT_PASSED: 2,
} as const;
