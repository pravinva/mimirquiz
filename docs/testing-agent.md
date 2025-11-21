# Automated MIMIR Quiz Platform – Testing Agent Specification

## Mission
Design and execute a rigorous test suite that covers all input types, edge cases, security scenarios, interaction flows, and data outcomes for the MIMIR quiz app.

## Test Plan

### Unit and Integration Tests
- Import multiple XLSX quiz sets, varying metadata (author, topic, league), and confirm correct parsing, storage, and retrieval.
- Simulate full games: all answer, pass, and dispute flows (incl. timing, voice capture, mic switching).
- Test passing logic, attempt ordering, and scoring per MIMIR specification.
- Insert "overrule" commands during 5s post-answer reveal, with follow-ups ("I was correct/wrong"), and confirm correct system behavior.
- Test correct/incorrect handling and logging of admin override actions.

### Functional and Regression Tests
- Automated browser and API tests for:
  - File upload
  - Game play
  - Dashboard navigation/filtering
  - Voice recognition, TTS
  - Microphone activation handoff and restriction
- Multi-user simulation for competitive/league play.
- Security regression: mic/camera access, file permissions, user privacy.

### Manual/User Acceptance Testing
- On real devices/broad browser support.
- Accessibility checks for UI/mic notifications.
- Stress tests on file upload size/volume, game concurrency.
- User walkthroughs matching actual tournament and league scenarios.

### Reporting
- Provide summary reports for every test run including: number of cases, pass/fail, uncovered conditions.
- Ensure all defects and edge case findings are logged and matched against requirements.

## Hosting/Integration
- Validate against live Vercel deployments with Neon database.
- Use seeded demo data for repeatable regression.
- Verify correct configuration of environment variables, secure mic use, secure file/BLOB storage.
