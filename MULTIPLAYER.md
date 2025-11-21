# MIMIR Quiz - Multiplayer Mode

## Overview

The MIMIR Quiz Platform now supports real-time multiplayer gameplay for up to 4 players! Each player can join from their own device, use their own microphone, and compete simultaneously.

## Features

- **Room-based gameplay**: Create or join rooms with unique 6-digit codes
- **Up to 4 players**: Compete with friends from different locations
- **Real-time synchronization**: All players see the same questions at the same time
- **Simultaneous microphone access**: Each player can answer using their own device's microphone
- **Shared quiz control**: Any player can load and start the quiz
- **Live answer feed**: See other players' answers in real-time
- **No authentication required**: Players can join as guests using just their name

## How to Play

### 1. Start a Multiplayer Game

**Option A: Create a Room (Host)**
1. Navigate to the home page and click "Multiplayer Quiz"
2. Enter your name
3. Click "Create Room"
4. Share the 6-digit room code with friends

**Option B: Join a Room (Player)**
1. Navigate to the home page and click "Multiplayer Quiz"
2. Enter your name
3. Enter the 6-digit room code shared by the host
4. Click "Join Room"

### 2. Set Up the Quiz

Once in the room:
1. Wait for all players to join (up to 4 players total)
2. Any player can click "Load Quizzes" to see available quizzes
3. Click on a quiz to load it for all players
4. Any player can click "Start Game" when ready

### 3. Play the Game

During gameplay:
- All players see the same question simultaneously
- Each player can use their own microphone to answer
- Answers are synced in real-time across all devices
- You'll see other players' answers appear as they submit them
- Scores are tracked and updated for all players

### 4. Game Controls

- **Microphone**: Each player's device microphone is used independently
- **Voice commands**: Standard MIMIR voice commands work ("pass", "repeat", "overrule")
- **Leave room**: Click "Leave Room" to exit at any time

## Technical Architecture

### Socket.IO Real-Time Communication

The multiplayer mode uses Socket.IO for real-time bidirectional communication:

```
Client 1 ←→ Socket.IO Server ←→ Client 2, 3, 4
         ↓
    Room State (In-Memory)
```

### Key Events

**Room Management:**
- `room:create` - Create a new multiplayer room
- `room:join` - Join an existing room
- `room:updated` - Broadcast room state changes
- `player:left` - Notify when a player disconnects

**Quiz Control:**
- `quiz:load` - Load a quiz for all players
- `game:start` - Start the game for all players
- `game:nextQuestion` - Move to next question (synchronized)

**Gameplay:**
- `game:submitAnswer` - Submit an answer (visible to all)
- `game:scoreUpdated` - Broadcast score updates
- `game:ended` - End game and show final scores

### Files Structure

```
/server.js                          # Custom Next.js + Socket.IO server
/src/lib/socket.ts                  # Socket.IO client utility
/src/stores/roomStore.ts            # Room state management (Zustand)
/src/hooks/useMultiplayerSync.ts   # Multiplayer synchronization hook
/src/app/lobby/page.tsx            # Room creation/joining page
/src/app/room/[code]/page.tsx      # Room waiting area
/src/app/game/page.tsx             # Updated game page with multiplayer support
```

## Running the Server

The custom server runs on port 8999 by default:

```bash
npm run dev      # Development mode
npm run build    # Build for production
npm start        # Production mode
```

## Environment Variables

No additional environment variables are required for basic multiplayer functionality. For production deployment:

```env
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com  # Optional: Custom Socket.IO server URL
```

## Browser Requirements

- Modern browsers with Web Speech API support (Chrome, Edge, Safari)
- Microphone permissions required for each player
- WebSocket support (all modern browsers)

## Limitations & Notes

- **Room persistence**: Rooms are stored in memory and cleared when the server restarts
- **Production scaling**: For production, consider using Redis for room state
- **Network**: Players need stable internet connection for real-time sync
- **Database**: Multiplayer games are not saved to the database (local state only)

## Future Enhancements

Potential improvements for multiplayer mode:

1. **Persistent rooms**: Store room state in Redis for better scaling
2. **Spectator mode**: Allow viewers to watch games without playing
3. **Private rooms**: Password-protected rooms
4. **Replay system**: Save and replay multiplayer games
5. **Chat functionality**: In-game text/voice chat
6. **Tournaments**: Bracket-style tournament support
7. **Leaderboards**: Global and room-based leaderboards

## Troubleshooting

**Can't connect to room:**
- Ensure the server is running (npm run dev)
- Check that both players are on the same network/internet
- Verify the room code is correct (6 characters, case-sensitive)

**Microphone not working:**
- Grant microphone permissions when prompted
- Check browser microphone settings
- Ensure no other app is using the microphone

**Connection lost:**
- Check internet connection
- Refresh the page and rejoin the room
- Server may have restarted (rooms are lost)

**Not seeing other players' answers:**
- Check browser console for Socket.IO errors
- Ensure WebSocket connections are not blocked by firewall
- Refresh and try rejoining the room

## Support

For issues or questions about multiplayer mode, please check:
- Browser console for error messages
- Server logs for Socket.IO connection issues
- Network tab for WebSocket connection status
