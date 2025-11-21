import { GameState, AnswerResult, MIMIR_RULES, Question, Player } from './types';

export class GameEngine {
  calculateScore(result: AnswerResult, isAddressed: boolean): number {
    if (result !== 'correct') return 0;
    // All correct answers award 1 point
    return 1;
  }

  getNextPlayerIndex(
    currentPlayerIndex: number,
    addressedPlayerIndex: number,
    totalPlayers: number,
    attemptCount: number
  ): number {
    // First attempt always goes to addressed player
    if (attemptCount === 0) {
      return addressedPlayerIndex;
    }

    // After all players have attempted, no next player
    if (attemptCount >= totalPlayers) {
      return currentPlayerIndex;
    }

    // Find next player, skipping the addressed player
    let nextIndex = (currentPlayerIndex + 1) % totalPlayers;
    let iterations = 0;

    // Keep searching until we find a valid player (not addressed, not same as current)
    // Safety: limit iterations to prevent infinite loop
    while (
      nextIndex === addressedPlayerIndex &&
      iterations < totalPlayers &&
      attemptCount < totalPlayers
    ) {
      nextIndex = (nextIndex + 1) % totalPlayers;
      iterations++;
    }

    // If we've cycled through all players and only found addressed player,
    // this shouldn't happen in valid game state, but return safely
    if (iterations >= totalPlayers) {
      return currentPlayerIndex;
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

    // Invalid player number in quiz data - log error for user visibility
    console.error(
      `[GAME ENGINE ERROR] Invalid player number ${playerNumber} for question. ` +
      `Valid range is 1-${players.length}. Defaulting to Player 1.`
    );

    // Per spec: automatic fallbacks should display in-app warning
    // This error should be caught and displayed to the user in the UI
    return 0;
  }

  processAnswer(
    state: GameState,
    spokenAnswer: string,
    result: AnswerResult
  ): Partial<GameState> {
    const isAddressed = state.currentPlayerIndex === state.addressedPlayerIndex;
    const updatedPlayers = [...state.players];

    // Handle pass: no score change, no bonus attempt change, move to next player
    if (result === 'passed') {
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

    // For correct answers: award 1 point
    if (result === 'correct') {
      updatedPlayers[state.currentPlayerIndex].score += 1;

      // If this is a bonus attempt (not the addressed player), increment bonus attempts
      if (!isAddressed) {
        updatedPlayers[state.currentPlayerIndex].bonusAttempts += 1;
      }

      return {
        players: updatedPlayers,
        showAnswer: false,
        micState: 'disabled',
      };
    }

    // For incorrect answers
    // If this is a bonus attempt, increment bonus attempts count
    if (!isAddressed) {
      updatedPlayers[state.currentPlayerIndex].bonusAttempts += 1;
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
      players: players.map(p => ({ ...p, score: 0, bonusAttempts: 0 })),
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
