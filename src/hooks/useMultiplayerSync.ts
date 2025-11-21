import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useRoomStore } from '@/stores/roomStore';

interface UseMultiplayerSyncOptions {
  onAnswerSubmitted?: (data: {
    playerName: string;
    isCorrect: boolean;
    answer: string;
    points?: number;
  }) => void;
  onScoreUpdated?: (scores: Record<string, number>) => void;
  onGameEnded?: (data: { scores: Record<string, number>; players: any[] }) => void;
}

export function useMultiplayerSync(options: UseMultiplayerSyncOptions = {}) {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('roomCode');
  const { room, currentPlayer } = useRoomStore();
  const isMultiplayer = !!roomCode;

  useEffect(() => {
    if (!isMultiplayer) return;

    const socket = getSocket();
    if (!socket) return;

    // Listen for answers from other players
    const handleAnswerSubmitted = (data: any) => {
      console.log('Answer submitted by', data.playerName, ':', data.answer, data.isCorrect);
      options.onAnswerSubmitted?.(data);
    };

    // Listen for score updates
    const handleScoreUpdated = (scores: Record<string, number>) => {
      console.log('Scores updated:', scores);
      options.onScoreUpdated?.(scores);
    };

    // Listen for game end
    const handleGameEnded = (data: any) => {
      console.log('Game ended:', data);
      options.onGameEnded?.(data);
    };

    socket.on('game:answerSubmitted', handleAnswerSubmitted);
    socket.on('game:scoreUpdated', handleScoreUpdated);
    socket.on('game:ended', handleGameEnded);

    return () => {
      socket.off('game:answerSubmitted', handleAnswerSubmitted);
      socket.off('game:scoreUpdated', handleScoreUpdated);
      socket.off('game:ended', handleGameEnded);
    };
  }, [isMultiplayer, options]);

  const submitAnswer = useCallback(
    (answer: string, isCorrect: boolean, points?: number) => {
      if (!isMultiplayer) return;

      const socket = getSocket();
      if (!socket || !currentPlayer) return;

      socket.emit('game:submitAnswer', {
        answer,
        isCorrect,
        points,
      });
    },
    [isMultiplayer, currentPlayer]
  );

  const nextQuestion = useCallback(() => {
    if (!isMultiplayer) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('game:nextQuestion');
  }, [isMultiplayer]);

  const endGame = useCallback(() => {
    if (!isMultiplayer) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('game:end');
  }, [isMultiplayer]);

  return {
    isMultiplayer,
    room,
    currentPlayer,
    submitAnswer,
    nextQuestion,
    endGame,
  };
}
