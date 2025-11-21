'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initSocket, getSocket } from '@/lib/socket';
import { useRoomStore } from '@/stores/roomStore';

export default function LobbyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const { setRoom, setCurrentPlayer, setConnected } = useRoomStore();

  useEffect(() => {
    const socket = initSocket();
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [setConnected]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError('');

    const socket = getSocket();
    if (!socket) {
      setError('Not connected to server');
      setIsCreating(false);
      return;
    }

    socket.emit('room:create', { playerName }, (response: any) => {
      setIsCreating(false);

      if (response.success) {
        setRoom(response.room);
        const currentPlayer = response.room.players.find(
          (p: any) => p.name === playerName
        );
        setCurrentPlayer(currentPlayer);
        router.push(`/room/${response.room.code}`);
      } else {
        setError(response.error || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setError('');

    const socket = getSocket();
    if (!socket) {
      setError('Not connected to server');
      setIsJoining(false);
      return;
    }

    socket.emit(
      'room:join',
      { roomCode: roomCode.toUpperCase(), playerName },
      (response: any) => {
        setIsJoining(false);

        if (response.success) {
          setRoom(response.room);
          const currentPlayer = response.room.players.find(
            (p: any) => p.name === playerName
          );
          setCurrentPlayer(currentPlayer);
          router.push(`/room/${response.room.code}`);
        } else {
          setError(response.error || 'Failed to join room');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            MIMIR Quiz - Multiplayer
          </h1>
          <p className="text-xl text-gray-600">
            Create or join a room to play with friends
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Player Name Input */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
              maxLength={20}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Create Room */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Create New Room
            </h2>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !playerName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors duration-200"
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 text-lg">OR</span>
            </div>
          </div>

          {/* Join Room */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Join Existing Room
            </h2>
            <div className="mb-4">
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg uppercase tracking-wider"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleJoinRoom}
              disabled={isJoining || !playerName.trim() || !roomCode.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors duration-200"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-3">How it works</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <span>Create a room or join with a code</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <span>Wait for up to 4 players to join</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <span>Any player can load and start the quiz</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <span>All players can use their microphones to answer</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
