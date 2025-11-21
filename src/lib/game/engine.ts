import { GameState, AnswerResult, MIMIR_RULES, Question, Player } from './types';

export class GameEngine {
  calculateScore(result: AnswerResult, isAddressed: boolean): number {
    if (result !== 'correct') return 0;

    return isAddressed
      ? MIMIR_RULES.POINTS_CORRECT_ADDRESSED
      : MIMIR_RULES.POINTS_CORRECT_PASSED;
  }

  getNextPlayerIndex(
    currentPlayerIndex: number,
    addressedPlayerIndex: number,
    totalPlayers: number,
    attemptCount: number
  ): number {
    if (attemptCount === 0) {
      return addressedPlayerIndex;
    }

    let nextIndex = (currentPlayerIndex + 1) % totalPlayers;

    if (nextIndex === addressedPlayerIndex && attemptCount < totalPlayers) {
      nextIndex = (nextIndex + 1) % totalPlayers;
    }

    return nextIndex;
  }

  getTimerDuration(isAddressed: boolean): number {
    return isAddressed
      ? MIMIR_RULES.ADDRESSED_TIMER_SECONDS
      : MIMIR_RULES.PASSED_TIMER_SECONDS;
  }

  shouldEndQuestion(attemptCount: number, totalPlayers: number): boolean {
    return attemptCount >= totalPlayers;
  }

  getAddressedPlayerForQuestion(
    question: Question,
    players: Player[],
    warnings?: string[]
  ): number {
    const playerNumber = question.playerNumber;

    if (playerNumber > 0 && playerNumber <= players.length) {
      return playerNumber - 1;
    }

    // Invalid player number - add warning instead of silent default
    const warningMsg = `Question #${question.orderIndex + 1}: Invalid player number ${playerNumber} (valid range: 1-${players.length}). Defaulting to first player. Please verify quiz data.`;

    if (warnings) {
      warnings.push(warningMsg);
    } else {
      console.warn(warningMsg);
    }

    return 0;
  }

  processAnswer(
    state: GameState,
    spokenAnswer: string,
    result: AnswerResult
  ): Partial<GameState> {
    const isAddressed = state.currentPlayerIndex === state.addressedPlayerIndex;
    const points = this.calculateScore(result, isAddressed);

    const updatedPlayers = [...state.players];
    updatedPlayers[state.currentPlayerIndex].score += points;

    if (result === 'correct') {
      return {
        players: updatedPlayers,
        showAnswer: false,
        micState: 'disabled',
      };
    }

    const newAttemptCount = state.attemptCount + 1;

    if (this.shouldEndQuestion(newAttemptCount, state.players.length)) {
      return {
        players: updatedPlayers,
        attemptCount: newAttemptCount,
        showAnswer: true,
        micState: 'overrule_window',
        timerSeconds: MIMIR_RULES.OVERRULE_WINDOW_SECONDS,
      };
    }

    const nextPlayerIndex = this.getNextPlayerIndex(
      state.currentPlayerIndex,
      state.addressedPlayerIndex,
      state.players.length,
      newAttemptCount
    );

    const nextIsAddressed = nextPlayerIndex === state.addressedPlayerIndex;

    return {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      attemptCount: newAttemptCount,
      activeMicPlayerIndex: nextPlayerIndex,
      micState: 'active',
      timerSeconds: this.getTimerDuration(nextIsAddressed),
    };
  }

  moveToNextQuestion(state: GameState): Partial<GameState> | null {
    const nextQuestionIndex = state.currentQuestionIndex + 1;

    if (nextQuestionIndex >= state.questions.length) {
      return {
        status: 'completed',
        micState: 'disabled',
        activeMicPlayerIndex: null,
      };
    }

    const nextQuestion = state.questions[nextQuestionIndex];
    const warnings: string[] = state.warnings ? [...state.warnings] : [];
    const addressedPlayerIndex = this.getAddressedPlayerForQuestion(
      nextQuestion,
      state.players,
      warnings
    );

    return {
      currentQuestionIndex: nextQuestionIndex,
      currentPlayerIndex: addressedPlayerIndex,
      addressedPlayerIndex,
      attemptCount: 0,
      activeMicPlayerIndex: addressedPlayerIndex,
      micState: 'active',
      timerSeconds: MIMIR_RULES.ADDRESSED_TIMER_SECONDS,
      showAnswer: false,
      overruleInProgress: false,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  handleOverrule(
    state: GameState,
    challengerPlayerIndex: number,
    claimType: 'correct' | 'incorrect'
  ): Partial<GameState> {
    const updatedPlayers = [...state.players];
    const lastAnswerPlayerIndex = state.currentPlayerIndex;

    if (claimType === 'correct') {
      const isAddressed = lastAnswerPlayerIndex === state.addressedPlayerIndex;
      const points = this.calculateScore('correct', isAddressed);

      updatedPlayers[lastAnswerPlayerIndex].score += points;
    } else {
      const currentScore = updatedPlayers[lastAnswerPlayerIndex].score;
      updatedPlayers[lastAnswerPlayerIndex].score = Math.max(0, currentScore - 1);
    }

    return {
      players: updatedPlayers,
      overruleInProgress: false,
      micState: 'disabled',
    };
  }

  initializeGame(
    quizFileId: number,
    league: string,
    topic: string,
    players: Player[],
    questions: Question[]
  ): Partial<GameState> {
    const firstQuestion = questions[0];
    const warnings: string[] = [];
    const addressedPlayerIndex = this.getAddressedPlayerForQuestion(
      firstQuestion,
      players,
      warnings
    );

    return {
      quizFileId,
      league,
      topic,
      players: players.map(p => ({ ...p, score: 0 })),
      questions,
      currentQuestionIndex: 0,
      currentPlayerIndex: addressedPlayerIndex,
      addressedPlayerIndex,
      attemptCount: 0,
      activeMicPlayerIndex: addressedPlayerIndex,
      micState: 'active',
      timerSeconds: MIMIR_RULES.ADDRESSED_TIMER_SECONDS,
      showAnswer: false,
      overruleInProgress: false,
      status: 'in_progress',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export const gameEngine = new GameEngine();
