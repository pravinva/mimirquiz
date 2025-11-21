# MIMIR Quiz - Deployment Guide

This guide explains how to deploy the MIMIR Quiz Platform with multiplayer support using **Vercel** (for Next.js frontend) and **Render** (for Socket.IO server).

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Vercel (Next.js Frontend)              │
│  - User Interface                       │
│  - API Routes                           │
│  - Authentication                       │
│  https://your-app.vercel.app            │
└────────────────┬────────────────────────┘
                 │
                 │ WebSocket Connection
                 ▼
┌─────────────────────────────────────────┐
│  Render (Socket.IO Server)              │
│  - Real-time multiplayer rooms          │
│  - Game state synchronization           │
│  https://your-socket-server.onrender.com│
└─────────────────────────────────────────┘
```

---

## Part 1: Deploy Socket.IO Server to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com) and sign up (free)
2. Connect your GitHub account

### Step 2: Deploy from GitHub
1. Click **"New +"** → **"Web Service"**
2. Connect to your repository: `pravinva/mimirquiz`
3. Configure the service:
   - **Name**: `mimirquiz-socket-server`
   - **Region**: Choose closest to your users
   - **Branch**: `claude/add-multiplayer-quiz-01F2R9kgwyNeU6qYqQhgMCyp` (or main after merge)
   - **Root Directory**: Leave empty
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node socket-server.js`
   - **Plan**: Free

### Step 3: Set Environment Variables
In the Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

**Important**: After deploying to Vercel (Part 2), come back and update `ALLOWED_ORIGINS` with your actual Vercel URL.

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (3-5 minutes)
3. Copy your Render URL: `https://mimirquiz-socket-server.onrender.com`

**Note**: Free tier spins down after 15 minutes of inactivity. First connection may take 30-60 seconds.

---

## Part 2: Deploy Next.js App to Vercel

### Step 1: Configure Vercel Project
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import `pravinva/mimirquiz` repository
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Leave empty
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 2: Set Environment Variables
Add all your existing environment variables PLUS:

```bash
# Socket.IO Server URL (from Render deployment)
NEXT_PUBLIC_SOCKET_URL=https://mimirquiz-socket-server.onrender.com

# Existing variables (keep these)
DATABASE_URL=your_neon_database_url
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=https://your-vercel-app.vercel.app
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_PRIVATE_KEY=your_private_key
GOOGLE_CLOUD_CLIENT_EMAIL=your_client_email
```

### Step 3: Deploy
1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. Copy your Vercel URL: `https://your-app.vercel.app`

### Step 4: Update CORS on Render
Go back to Render and update the `ALLOWED_ORIGINS` environment variable:

```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-*.vercel.app,https://your-app-*.vercel.app
```

This allows your production app AND preview deployments to connect.

---

## Part 3: Verify Deployment

### Test Socket.IO Server
```bash
curl https://mimirquiz-socket-server.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "MIMIR Quiz Socket.IO Server",
  "rooms": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Multiplayer
1. Open your Vercel app: `https://your-app.vercel.app`
2. Click **"Multiplayer Quiz"**
3. Create a room
4. Open an incognito window and join with the code
5. Both players should see each other

---

## Local Development

### Full Stack (Recommended)
```bash
npm run dev
# Runs both Next.js AND Socket.IO server on localhost:8999
```

### Separate Processes
Terminal 1 - Socket.IO Server:
```bash
npm run dev:socket
# Runs on localhost:3001
```

Terminal 2 - Next.js:
```bash
npm run dev:next
# Runs on localhost:8999
```

Create `.env.local`:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## Environment Variables Summary

### Render (Socket.IO Server)
```bash
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-app-git-*.vercel.app
```

### Vercel (Next.js)
```bash
# Multiplayer
NEXT_PUBLIC_SOCKET_URL=https://mimirquiz-socket-server.onrender.com

# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-vercel-app.vercel.app

# Google Cloud TTS
GOOGLE_CLOUD_PROJECT_ID=...
GOOGLE_CLOUD_PRIVATE_KEY=...
GOOGLE_CLOUD_CLIENT_EMAIL=...
```

---

## Troubleshooting

### "Cannot connect to Socket.IO server"

**Check 1**: Verify Socket.IO server is running
```bash
curl https://your-socket-server.onrender.com/health
```

**Check 2**: Verify CORS settings
- Render `ALLOWED_ORIGINS` includes your Vercel domain
- No trailing slashes in URLs

**Check 3**: Check browser console
```
Failed to connect to wss://... → CORS issue
Connection timeout → Server sleeping (free tier)
```

### "Room not found" errors

**Cause**: Free tier Render servers restart frequently, clearing in-memory rooms

**Solutions**:
1. Upgrade to paid Render plan ($7/month)
2. Implement Redis for persistent room storage
3. Accept limitation for MVP testing

### Render server sleeping (free tier)

**Symptom**: First connection takes 30-60 seconds

**Solution**: Paid plan ($7/month) keeps server always active

**Workaround**: Implement a cron job to ping every 10 minutes:
```bash
# Free service like cron-job.org
URL: https://your-socket-server.onrender.com/health
Interval: Every 10 minutes
```

---

## Upgrading to Production

### For Heavy Traffic

1. **Render**: Upgrade to paid plan ($7-$85/month)
   - Always-on servers
   - Auto-scaling
   - Better performance

2. **Redis**: Add Redis for room persistence
   - Render Redis: $10/month
   - Prevents room loss on restart
   - Enables horizontal scaling

3. **Database**: Already using Neon (good for production)

### Monitoring

**Render Dashboard**:
- View logs in real-time
- Monitor CPU/Memory usage
- Set up alerts

**Vercel Dashboard**:
- View deployment logs
- Monitor function performance
- Analytics

---

## Cost Breakdown

### Free Tier (MVP/Testing)
- **Vercel**: Free (Hobby plan)
- **Render**: Free (with limitations)
- **Neon DB**: Free tier
- **Total**: $0/month

**Limitations**:
- Render sleeps after 15min inactivity
- 750 hours/month on Render free tier
- In-memory rooms (lost on restart)

### Production (Recommended)
- **Vercel**: $20/month (Pro)
- **Render**: $7/month (Starter)
- **Neon DB**: Free tier (sufficient)
- **Total**: $27/month

**Benefits**:
- Always-on Socket.IO server
- Better performance
- Production-grade reliability

---

## Quick Reference

### Deploy Commands
```bash
# Local development (all-in-one)
npm run dev

# Local development (separate)
npm run dev:socket  # Socket.IO only
npm run dev:next    # Next.js only

# Build for production
npm run build
npm start           # Next.js (Vercel)
npm run start:socket # Socket.IO (Render)
```

### Important URLs
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Render Dashboard**: https://dashboard.render.com
- **Socket Health Check**: `https://your-server.onrender.com/health`

---

## Support

If you encounter issues:
1. Check Render logs for Socket.IO errors
2. Check Vercel logs for Next.js errors
3. Check browser console for WebSocket connection issues
4. Verify all environment variables are set correctly

**Common Issues**:
- CORS errors → Check `ALLOWED_ORIGINS`
- Connection timeout → Render free tier sleeping
- Room not found → Server restarted (use Redis)
