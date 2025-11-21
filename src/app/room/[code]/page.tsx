'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useRoomStore } from '@/stores/roomStore';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params.code as string;

  const { room, currentPlayer, setRoom, updateGameState } = useRoomStore();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      router.push('/lobby');
      return;
    }

    // Request room info if we don't have it
    if (!room) {
      socket.emit('room:get', { roomCode }, (response: any) => {
        if (response.success) {
          setRoom(response.room);
        } else {
          router.push('/lobby');
        }
      });
    }

    // Listen for room updates
    socket.on('room:updated', (updatedRoom: any) => {
      setRoom(updatedRoom);
    });

    socket.on('quiz:loaded', (data: any) => {
      updateGameState({ quiz: data.quiz });
    });

    socket.on('game:started', (gameState: any) => {
      // Navigate to multiplayer game page
      router.push(`/game?roomCode=${roomCode}`);
    });

    socket.on('player:left', (data: any) => {
      console.log(`${data.playerName} left the room`);
    });

    return () => {
      socket.off('room:updated');
      socket.off('quiz:loaded');
      socket.off('game:started');
      socket.off('player:left');
    };
  }, [room, roomCode, router, setRoom, updateGameState]);

  const loadQuizzes = async () => {
    setIsLoadingQuizzes(true);
    try {
      const response = await fetch('/api/quizzes');
      const data = await response.json();
      setQuizzes(data.quizzes || []);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleLoadQuiz = (quiz: any) => {
    setSelectedQuiz(quiz);
    const socket = getSocket();
    if (socket) {
      socket.emit('quiz:load', { quiz });
    }
  };

  const handleStartGame = () => {
    const socket = getSocket();
    if (socket && room?.gameState.quiz) {
      socket.emit('game:start');
    }
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    if (socket) {
      socket.disconnect();
      router.push('/lobby');
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Room: {room.code}
          </h1>
          <p className="text-xl text-gray-600">
            Waiting for players ({room.players.length}/{room.maxPlayers})
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Players Panel */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Players</h2>
            <div className="space-y-3">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg border-2 ${
                    player.id === currentPlayer?.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">
                        {player.name}
                        {player.isHost && (
                          <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">
                            HOST
                          </span>
                        )}
                        {player.id === currentPlayer?.id && (
                          <span className="ml-2 text-xs bg-indigo-500 text-white px-2 py-1 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                    {player.isReady && (
                      <div className="text-green-600 font-bold">✓ Ready</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleLeaveRoom}
              className="w-full mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Leave Room
            </button>
          </div>

          {/* Quiz Selection Panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Select Quiz
            </h2>

            {!room.gameState.quiz ? (
              <>
                {quizzes.length === 0 ? (
                  <div className="text-center py-8">
                    <button
                      onClick={loadQuizzes}
                      disabled={isLoadingQuizzes}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg text-lg"
                    >
                      {isLoadingQuizzes ? 'Loading...' : 'Load Quizzes'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors"
                        onClick={() => handleLoadQuiz(quiz)}
                      >
                        <div className="font-semibold text-lg text-gray-800">
                          {quiz.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {quiz.league && (
                            <span className="mr-3">League: {quiz.league}</span>
                          )}
                          {quiz.topic && <span>Topic: {quiz.topic}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      {room.gameState.quiz.name}
                    </h3>
                    <span className="text-green-600 font-bold">✓ Loaded</span>
                  </div>
                  {room.gameState.quiz.league && (
                    <p className="text-gray-600">
                      League: {room.gameState.quiz.league}
                    </p>
                  )}
                  {room.gameState.quiz.topic && (
                    <p className="text-gray-600">
                      Topic: {room.gameState.quiz.topic}
                    </p>
                  )}
                </div>

                <div className="text-center">
                  <button
                    onClick={handleStartGame}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors"
                  >
                    Start Game
                  </button>
                  <p className="text-sm text-gray-600 mt-3">
                    Any player can start the game
                  </p>
                </div>

                <div className="border-t-2 border-gray-200 pt-4">
                  <button
                    onClick={() => {
                      setQuizzes([]);
                      const socket = getSocket();
                      if (socket) {
                        socket.emit('quiz:load', { quiz: null });
                      }
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Change Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-3">
            Multiplayer Instructions
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span>
                Any player can select and load a quiz from the list
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span>Once a quiz is loaded, any player can start the game</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span>
                All players will see the same questions simultaneously
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span>
                Each player can use their own microphone to answer questions
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
