const { createServer } = require('http');
const { Server } = require('socket.io');

const port = parseInt(process.env.PORT || '3001', 10);

// In-memory room storage (use Redis in production for scaling)
const rooms = new Map();

function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

const server = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'MIMIR Quiz Socket.IO Server',
      rooms: rooms.size,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:8999', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO room management
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Create a new room
  socket.on('room:create', (data, callback) => {
    const { playerName } = data;
    const roomCode = generateRoomCode();

    const room = {
      code: roomCode,
      host: socket.id,
      players: [{
        id: socket.id,
        name: playerName,
        isHost: true,
        isReady: false
      }],
      gameState: {
        quiz: null,
        isStarted: false,
        currentQuestionIndex: 0,
        scores: {}
      },
      maxPlayers: 4,
      createdAt: Date.now()
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;

    console.log(`Room created: ${roomCode} by ${playerName}`);
    callback({ success: true, room });
  });

  // Join an existing room
  socket.on('room:join', (data, callback) => {
    const { roomCode, playerName } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    if (room.players.length >= room.maxPlayers) {
      return callback({ success: false, error: 'Room is full' });
    }

    if (room.gameState.isStarted) {
      return callback({ success: false, error: 'Game already started' });
    }

    const player = {
      id: socket.id,
      name: playerName,
      isHost: false,
      isReady: false
    };

    room.players.push(player);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;

    console.log(`${playerName} joined room ${roomCode}`);

    // Notify all players in the room
    io.to(roomCode).emit('room:updated', room);
    callback({ success: true, room });
  });

  // Get room info
  socket.on('room:get', (data, callback) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    callback({ success: true, room });
  });

  // Player ready toggle
  socket.on('player:ready', (data) => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(roomCode).emit('room:updated', room);
    }
  });

  // Load quiz (any player can load)
  socket.on('quiz:load', (data) => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room) return;

    room.gameState.quiz = data.quiz;
    io.to(roomCode).emit('quiz:loaded', { quiz: data.quiz });
    io.to(roomCode).emit('room:updated', room);
  });

  // Start game (any player can start)
  socket.on('game:start', () => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room || !room.gameState.quiz) return;

    room.gameState.isStarted = true;
    room.gameState.currentQuestionIndex = 0;

    // Initialize scores
    room.players.forEach(player => {
      room.gameState.scores[player.name] = 0;
    });

    io.to(roomCode).emit('game:started', room.gameState);
    io.to(roomCode).emit('room:updated', room);
  });

  // Next question
  socket.on('game:nextQuestion', () => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room) return;

    room.gameState.currentQuestionIndex++;
    io.to(roomCode).emit('game:questionChanged', {
      questionIndex: room.gameState.currentQuestionIndex
    });
  });

  // Submit answer
  socket.on('game:submitAnswer', (data) => {
    const { roomCode, playerName } = socket.data;
    const room = rooms.get(roomCode);

    if (!room) return;

    const { isCorrect, answer, points } = data;

    // Broadcast answer to all players
    io.to(roomCode).emit('game:answerSubmitted', {
      playerName,
      isCorrect,
      answer,
      points
    });

    // Update score
    if (isCorrect && points) {
      room.gameState.scores[playerName] = (room.gameState.scores[playerName] || 0) + points;
      io.to(roomCode).emit('game:scoreUpdated', room.gameState.scores);
    }
  });

  // End game
  socket.on('game:end', () => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room) return;

    io.to(roomCode).emit('game:ended', {
      scores: room.gameState.scores,
      players: room.players
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const { roomCode, playerName } = socket.data;
    console.log('Client disconnected:', socket.id);

    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        // Remove player from room
        room.players = room.players.filter(p => p.id !== socket.id);

        if (room.players.length === 0) {
          // Delete empty room
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        } else {
          // If host left, assign new host
          if (room.host === socket.id && room.players.length > 0) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;
          }

          io.to(roomCode).emit('room:updated', room);
          io.to(roomCode).emit('player:left', { playerName });
        }
      }
    }
  });
});

server.listen(port, () => {
  console.log(`> Socket.IO server running on port ${port}`);
  console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`> Allowed origins: ${process.env.ALLOWED_ORIGINS || 'localhost:8999,localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
