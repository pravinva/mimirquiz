'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useMicrophone } from '@/hooks/useMicrophone';
import { gameEngine } from '@/lib/game/engine';
import { MIMIR_RULES } from '@/lib/game/types';

export default function GamePage() {
  const { data: session, status } = useSession();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [transcript, setTranscript] = useState('');

  const gameState = useGameStore();
  const { hasPermission, requestPermission } = useMicrophone();

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes');
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleSpeechResult = useCallback(
    (result: string) => {
      setTranscript(result);

      if (gameState.micState === 'overrule_window') {
        if (result.toLowerCase().includes('overrule')) {
          handleOverruleDetected();
        }
      } else if (gameState.overruleInProgress) {
        // Listening for "I was correct" or "I was wrong" during overrule claim
        const lowerResult = result.toLowerCase();
        if (lowerResult.includes('correct') || lowerResult.includes('right')) {
          handleOverruleClaim('correct');
        } else if (lowerResult.includes('wrong') || lowerResult.includes('incorrect')) {
          handleOverruleClaim('incorrect');
        }
      } else if (gameState.micState === 'listening') {
        handleAnswer(result);
      }
    },
    [gameState.micState, gameState.overruleInProgress]
  );

  const { startListening, stopListening, isListening } = useSpeechRecognition({
    onResult: handleSpeechResult,
  });

  const { speak, isSpeaking } = useTextToSpeech();

  // Timer countdown effect - implements MIMIR rules for timed answers
  useEffect(() => {
    if (
      gameState.micState === 'active' ||
      gameState.micState === 'listening' ||
      gameState.micState === 'overrule_window'
    ) {
      const interval = setInterval(() => {
        if (gameState.timerSeconds && gameState.timerSeconds > 0) {
          gameState.setGameState({ timerSeconds: gameState.timerSeconds - 1 });
        } else if (gameState.timerSeconds === 0) {
          handleTimeout();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameState.micState, gameState.timerSeconds]);

  const handleTimeout = () => {
    if (gameState.micState === 'listening' || gameState.micState === 'active') {
      // Player ran out of time
      stopListening();
      handleAnswer(''); // Empty answer = timeout
    } else if (gameState.micState === 'overrule_window') {
      // Overrule window expired
      gameState.setGameState({
        micState: 'disabled',
        overruleInProgress: false,
      });
      setTimeout(() => {
        moveToNextQuestion();
      }, 1000);
    }
  };

  const handleStartGame = async () => {
    if (!selectedQuizId || playerNames.some((name) => !name.trim())) {
      alert('Please select a quiz and enter all player names');
      return;
    }

    const permission = await requestPermission();
    if (!permission) {
      alert('Microphone access is required to play');
      return;
    }

    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizFileId: selectedQuizId,
          playerNames: playerNames.filter((name) => name.trim()),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const players = playerNames
          .filter((name) => name.trim())
          .map((name, idx) => ({
            id: idx + 1,
            name: name.trim(),
            score: 0,
          }));

        const initialState = gameEngine.initializeGame(
          data.session.quizFileId,
          data.session.league,
          data.session.topic,
          players,
          data.questions
        );

        gameState.setGameState({
          sessionId: data.session.id,
          ...initialState,
        });

        speakQuestion(data.questions[0].question);
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game');
    }
  };

  const speakQuestion = (questionText: string) => {
    speak(questionText);
    setTimeout(() => {
      gameState.setMicState('listening');
      startListening();
    }, 1000);
  };

  const handleAnswer = async (spokenAnswer: string) => {
    if (!gameState.questions || !gameState.sessionId) return;

    stopListening();
    gameState.setMicState('disabled');

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex!];
    const currentPlayer = gameState.players![gameState.currentPlayerIndex!];
    const isAddressed =
      gameState.currentPlayerIndex === gameState.addressedPlayerIndex;

    const result = checkAnswer(spokenAnswer, currentQuestion.answer);

    const pointsAwarded = gameEngine.calculateScore(result, isAddressed);

    await fetch(`/api/games/${gameState.sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQuestion.id,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        spokenAnswer,
        result,
        isAddressed,
        timeTaken: MIMIR_RULES.ADDRESSED_TIMER_SECONDS - (gameState.timerSeconds || 0),
        attemptOrder: gameState.attemptCount || 0,
        pointsAwarded,
      }),
    });

    const updates = gameEngine.processAnswer(
      gameState as any,
      spokenAnswer,
      result
    );

    gameState.setGameState(updates);

    if (result === 'correct') {
      setTimeout(() => {
        moveToNextQuestion();
      }, MIMIR_RULES.POST_CORRECT_PAUSE_SECONDS * 1000);
    } else if (updates.showAnswer) {
      speak(`The answer is: ${currentQuestion.answer}`);
      setTimeout(() => {
        startListening();
      }, 2000);
    } else if (updates.activeMicPlayerIndex !== null) {
      startListening();
    }
  };

  const checkAnswer = (spoken: string, correct: string): 'correct' | 'incorrect' | 'timeout' => {
    // Handle timeout case (empty answer)
    if (!spoken || !spoken.trim()) {
      return 'timeout';
    }

    const normalizedSpoken = spoken.toLowerCase().trim();
    const normalizedCorrect = correct.toLowerCase().trim();

    // Exact substring match
    if (normalizedSpoken.includes(normalizedCorrect)) {
      return 'correct';
    }

    // Fuzzy word-based matching
    const correctWords = normalizedCorrect.split(' ');
    if (correctWords.length === 0) return 'incorrect';

    const matchedWords = normalizedSpoken
      .split(' ')
      .filter((word) => normalizedCorrect.includes(word)).length;

    const similarity = matchedWords / correctWords.length;

    return similarity > 0.7 ? 'correct' : 'incorrect';
  };

  const handleOverruleDetected = () => {
    stopListening();
    speak('Overrule detected. Say "I was correct" or "I was wrong"');

    setTimeout(() => {
      startListening();
      gameState.setGameState({
        overruleInProgress: true,
        micState: 'listening',
      });
    }, 3000);
  };

  const handleOverruleClaim = async (claimType: 'correct' | 'incorrect') => {
    stopListening();
    gameState.setGameState({ micState: 'disabled' });

    if (!gameState.sessionId || !gameState.questions) return;

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex!];
    const challengerPlayerIndex = gameState.currentPlayerIndex!;

    try {
      // Record overrule event in database
      await fetch(`/api/games/${gameState.sessionId}/overrule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          challengerId: gameState.players![challengerPlayerIndex].id,
          challengerName: gameState.players![challengerPlayerIndex].name,
          claimType,
        }),
      });

      // Update game state with overrule result
      const updates = gameEngine.handleOverrule(
        gameState as any,
        challengerPlayerIndex,
        claimType
      );

      gameState.setGameState(updates);

      // Announce result and move to next question
      const message = claimType === 'correct'
        ? 'Overrule accepted. Points awarded.'
        : 'Overrule accepted. Penalty applied.';

      speak(message);

      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    } catch (error) {
      console.error('Failed to process overrule:', error);
      speak('Failed to process overrule. Moving to next question.');
      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    }
  };

  const moveToNextQuestion = () => {
    const updates = gameEngine.moveToNextQuestion(gameState as any);

    if (updates) {
      gameState.setGameState(updates);

      if (updates.status === 'completed') {
        speak('Game completed! Final scores...');
      } else if (gameState.questions && updates.currentQuestionIndex !== undefined) {
        const nextQuestion = gameState.questions[updates.currentQuestionIndex];
        speakQuestion(nextQuestion.question);
      }
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">MIMIR Quiz Game</h1>

        {gameState.status === 'setup' ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Setup New Game</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Quiz</label>
              {isLoadingQuizzes ? (
                <p>Loading quizzes...</p>
              ) : (
                <select
                  value={selectedQuizId || ''}
                  onChange={(e) => setSelectedQuizId(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Choose a quiz...</option>
                  {quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.fileName} - {quiz.topic} ({quiz.league})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Player Names</label>
              {playerNames.map((name, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const updated = [...playerNames];
                    updated[idx] = e.target.value;
                    setPlayerNames(updated);
                  }}
                  placeholder={`Player ${idx + 1}`}
                  className="w-full border border-gray-300 rounded-md p-2 mb-2"
                />
              ))}
              <button
                onClick={() => setPlayerNames([...playerNames, ''])}
                className="text-primary-600 hover:text-primary-700"
              >
                + Add Player
              </button>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700"
            >
              Start Game
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Scoreboard</h2>
                <div className="text-sm text-gray-600">
                  Question {(gameState.currentQuestionIndex || 0) + 1} of{' '}
                  {gameState.questions?.length || 0}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players?.map((player, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      idx === gameState.activeMicPlayerIndex
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-2xl font-bold text-primary-600">
                      {player.score}
                    </div>
                    {idx === gameState.activeMicPlayerIndex && (
                      <div className="text-xs text-green-600 mt-1">
                        {isListening ? '🎤 LISTENING' : '🎤 ACTIVE'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {gameState.questions && gameState.currentQuestionIndex !== undefined && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <span className="text-sm text-gray-600">
                    Round {gameState.questions[gameState.currentQuestionIndex].roundNumber}
                  </span>
                </div>

                <h3 className="text-2xl font-semibold mb-4">
                  {gameState.questions[gameState.currentQuestionIndex].question}
                </h3>

                {gameState.showAnswer && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-semibold">Answer:</p>
                    <p className="text-lg">
                      {gameState.questions[gameState.currentQuestionIndex].answer}
                    </p>
                  </div>
                )}

                {transcript && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Last heard:</p>
                    <p>{transcript}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Microphone Status</p>
                  <p className="text-lg font-semibold">
                    {gameState.micState === 'listening' && 'Listening...'}
                    {gameState.micState === 'active' && 'Ready'}
                    {gameState.micState === 'overrule_window' &&
                      'Overrule Window (5s)'}
                    {gameState.micState === 'disabled' && 'Disabled'}
                  </p>
                </div>

                <div className="text-3xl font-bold text-primary-600">
                  {gameState.timerSeconds}s
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
