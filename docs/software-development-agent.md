# Automated MIMIR Quiz Platform – Software Development Agent Specification

## Mission
Engineer a robust, automated web platform for MIMIR-format quizzes, supporting XLSX quiz file management, voice-based gameplay, scoring, dispute resolution, role-based dashboards, and secure, scalable infrastructure.

## Functional Requirements

### 1. File Handling & Ingestion
- Accept XLSX quiz files via web upload with required columns: round number, player number, question, question image URL, answer, answer URL.
- Prompt metadata capture: author, topic, league, optional description.
- Validate file structure before import; reject or flag if columns/format missing.
- Persist files in managed storage (e.g., cloud, server), indexed by author, topic, league, and file ID.

### 2. Game Management & Voice Workflow
- Let players/admin select any previously-uploaded quiz set from file library.
- Present each question using text-to-speech only to the nominated player.
- Activate voice recognition only for the responding player; others muted.
- Enforce 30s answer timer for addressed player, 5s for those answering on a passed question.
- If answered correctly, score and proceed after a 3s pause.
- On wrong/pass, auto-switch microphone access to next player per MIMIR rules.
- On revealing the answer, enable all microphones and listen up to 5s for any "overrule" command.
  - If "overrule" heard, ask the challenger to say either "I was correct" or "I was wrong." Adjust score accordingly.
  - Log all "overrule" events and final outcomes.
- Disable microphones (except during allowed window) and clearly show active mic in UI at all times.

### 3. Data Persistence & Audit
- Save full game session data: timestamps, quiz set ID, league/topic/author, all player answers, timing, points, attempts.
- Log every administrative or player-initiated override, correction, or dispute.
- Store usage statistics for each quiz file, league, topic.

### 4. Dashboards
- Admin dashboard: upload management, game/session retrieval, league/topic/stats explorer, audit logs, and user controls.
- Player dashboard: personal history, scores by session, performance trends, past answers.
- League/dashboard: aggregated stats, file library, standing/leaderboards, activity heatmaps.

### 5. Security & UX
- Integrate user authentication and authorization: only authorized upload, play, or admin access.
- Use role-appropriate access controls for dashboards and data views.
- Clearly indicate all microphone activation and listening windows in the UI.
- Ensure cross-device/browser compatibility.

### 6. Hosting
- Deploy web app and serverless/API endpoints on Vercel.
- Use Neon PostgreSQL for all persistent data and references to quiz files.
- Integrate with object storage (e.g., S3 or Vercel Blob) for XLSX and media assets.
- Use secure environment variable management for connection strings, secrets, etc.
