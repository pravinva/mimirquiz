# MIMIR Quiz Platform

Automated voice-based quiz platform for MIMIR-format quizzes with real-time gameplay, scoring, and dispute resolution.

## Features

### Core Functionality
- **XLSX Quiz Management**: Upload and parse MIMIR-format quiz files with automatic validation
- **Voice-Based Gameplay**: Text-to-speech for questions and speech recognition for answers
- **Real-Time Game Engine**: Implements full MIMIR rules including timers, turns, and scoring
- **Dispute Resolution**: 5-second overrule window with voice-activated challenges
- **Multi-Player Support**: 2-8 players per game session
- **Role-Based Dashboards**: Admin, player, and league-specific views

### Technical Features
- Next.js 14 with TypeScript
- Neon PostgreSQL database with Drizzle ORM
- NextAuth.js for authentication
- Vercel Blob storage for quiz files
- Web Speech API for voice features
- Tailwind CSS for styling
- Zustand for state management

## Project Structure

```
mimirquiz/
├── docs/                          # Agent specifications
│   ├── software-development-agent.md
│   ├── testing-agent.md
│   └── quality-inspection-agent.md
├── src/
│   ├── app/                       # Next.js app directory
│   │   ├── api/                   # API routes
│   │   │   ├── auth/             # Authentication endpoints
│   │   │   ├── users/            # User management
│   │   │   ├── quizzes/          # Quiz file management
│   │   │   ├── games/            # Game session management
│   │   │   └── stats/            # Statistics endpoints
│   │   ├── admin/                # Admin dashboard
│   │   ├── dashboard/            # Player dashboard
│   │   ├── league/               # League dashboard
│   │   ├── game/                 # Game play interface
│   │   ├── login/                # Login page
│   │   └── register/             # Registration page
│   ├── components/               # React components
│   ├── db/                       # Database schema and connection
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   │   ├── auth.ts              # Auth configuration
│   │   ├── game/                # Game engine
│   │   └── xlsx-parser.ts       # XLSX parsing logic
│   ├── stores/                   # Zustand stores
│   └── types/                    # TypeScript types
├── .env.local                    # Environment variables
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

## Database Schema

### Tables
- **users**: User accounts with roles (admin, player, league_admin)
- **quiz_files**: Uploaded quiz file metadata
- **quiz_questions**: Parsed questions from XLSX files
- **game_sessions**: Active and completed game sessions
- **player_answers**: All player answer attempts
- **overrule_events**: Dispute resolution records
- **audit_logs**: Complete audit trail

## MIMIR Rules Implementation

### Timing
- **Addressed Player**: 30 seconds to answer
- **Passed Question**: 5 seconds for other players
- **Overrule Window**: 5 seconds after answer reveal
- **Post-Correct Pause**: 3 seconds before next question

### Scoring
- **Correct (Addressed)**: 3 points
- **Correct (Passed)**: 2 points
- **Incorrect/Timeout**: 0 points

### Game Flow
1. Question is spoken to addressed player
2. Player has 30s to answer
3. If incorrect/passed, next player gets 5s
4. After all attempts, answer is revealed
5. 5-second overrule window for challenges
6. Move to next question or end game

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Neon PostgreSQL database
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/pravinva/mimirquiz.git
   cd mimirquiz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env.local` and fill in:
   ```env
   DATABASE_URL=your-neon-postgres-connection-string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
   ```

4. **Set up database**
   ```bash
   npm run db:push
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open browser**

   Navigate to http://localhost:3000

### Creating First Admin User

Use the registration API to create an admin user:

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword",
    "name": "Admin User",
    "role": "admin"
  }'
```

## Deployment to Vercel

### Prerequisites
- Vercel account
- Neon database
- Vercel Blob storage configured

### Steps

1. **Connect repository to Vercel**
   - Import project from GitHub
   - Select the mimirquiz repository

2. **Configure environment variables**

   Add in Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (your production URL)
   - `NEXTAUTH_SECRET`
   - `BLOB_READ_WRITE_TOKEN`

3. **Deploy**
   ```bash
   vercel deploy --prod
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

## Usage Guide

### For Admins

1. **Upload Quiz Files**
   - Navigate to Admin Panel
   - Click "Upload Quiz File"
   - Select XLSX file with required columns:
     - round (round number)
     - player (player number)
     - question (question text)
     - answer (correct answer)
     - question_image (optional)
     - answer_image (optional)
   - Fill in metadata (author, topic, league)
   - Submit

2. **Manage Quiz Library**
   - View all uploaded quizzes
   - Filter by league, topic, or search
   - Monitor usage statistics

### For Players

1. **Start a Game**
   - Go to "Play Quiz"
   - Select a quiz from the library
   - Enter player names (2-8 players)
   - Grant microphone permission
   - Click "Start Game"

2. **During Gameplay**
   - Listen to questions via text-to-speech
   - Speak your answer when microphone is active
   - Watch for active player indicator
   - Use "overrule" command during 5s window if needed

3. **View Dashboard**
   - Check personal statistics
   - Review game history
   - Track performance trends

## Browser Compatibility

### Required Features
- **Web Speech API**: Chrome, Edge, Safari (latest versions)
- **MediaDevices API**: All modern browsers
- **Audio playback**: All browsers

### Recommended
- Chrome 90+ or Edge 90+ for best speech recognition
- Stable internet connection
- Quiet environment for voice recognition

## Security Features

- **Authentication**: Secure password hashing with bcrypt
- **Authorization**: Role-based access control
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM
- **CSRF Protection**: NextAuth.js built-in protection
- **Audit Logging**: Complete activity trail

## API Documentation

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints
- `POST /api/users/register` - User registration

### Quizzes
- `POST /api/quizzes/upload` - Upload quiz file (admin only)
- `GET /api/quizzes` - List quizzes with filters

### Games
- `POST /api/games/create` - Create game session
- `POST /api/games/[sessionId]/answer` - Submit answer
- `POST /api/games/[sessionId]/overrule` - Record overrule

### Statistics
- `GET /api/stats/player` - Player statistics

## Troubleshooting

### Microphone Issues
- Ensure browser has microphone permission
- Check system microphone settings
- Try Chrome/Edge for better speech recognition
- Verify HTTPS connection (required for mic access)

### Voice Recognition Not Working
- Speak clearly and at moderate pace
- Reduce background noise
- Check browser console for errors
- Verify Web Speech API support

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check Neon dashboard for connection limits
- Ensure database schema is up to date

## Contributing

See `docs/` for detailed agent specifications:
- `software-development-agent.md` - Development guidelines
- `testing-agent.md` - Testing requirements
- `quality-inspection-agent.md` - Quality standards

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/pravinva/mimirquiz/issues
- Documentation: See `docs/` directory
