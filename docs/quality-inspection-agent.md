# Automated MIMIR Quiz Platform – Quality Inspection Agent Specification

## Mission
Guarantee that the platform, built for Vercel and Neon, faithfully implements all requirements, is secure, robust, practical, and user-centered—free from partially finished code (stubs), architectural excess or deficiency, security holes, or improper automatic defaults.

## Inspection Areas

### 1. Code Completeness & Robustness
- Audit for any unfinished stubs, placeholder functions, TODOs, or commented-out features in both frontend and backend code; all required flows must be truly implemented and user-accessible.
- Ensure all error handling, background APIs, and integrations operate in production exactly as specified, not in mock or non-functional demo mode.
- Verify no critical logic or UI pathway stops at a stub, mock, or placeholder.

### 2. Right-Sized Engineering
- Check for over-engineering: Avoid unnecessary architectural complexity, premature optimization, unused abstractions, or premature scaling components. The codebase should fit the actual product scope and requirements.
- Check for under-engineering: Ensure no shortcuts, hard-coding, skipped validation, or omitted required features. All flows (file upload, parsing, game logic, database, dashboards, voice, auth) should have thorough error handling and user feedback.
- All implemented functionality should be explicitly traceable to a requirement or user story.

### 3. Security Standards & Data Integrity
- Validate secure implementation of authentication, session handling, and API/database access; credentials/env variables are not exposed or hardcoded.
- Ensure mic/camera access is tightly scoped: no microphone opened except for specifically designated user in correct state; microphone and storage permissions require clear, explicit user consent at each activation.
- Audit input sanitization for all user/provided data (XLSX, quiz answers, user registration, uploads).
- Confirm user inputs, quiz file uploads, and player answers are never written to the database or logs without validation/escapes to prevent injection and leakage.
- Admin/override controls should log all actions and require confirmation to avoid unintended modification.

### 4. Defaults, Fallbacks, and UI
- Inspect the platform to verify that NO default/fallback action (file, game session, user selection, settings) is taken without a clear, explicit user input or UI confirmation—the user must always be in control of key choices.
- Any automatic fallback (such as default topic/league or unknown author for a quiz set) should display an in-app warning and prompt for user correction before proceeding.
- All error/prioritization logic is visible and correctable by the user, and the app provides actionable feedback, not silent corrective action.
- All warnings, errors, and missing-data situations are relayed to the user with actionable instructions.

### 5. QA Practices
- Review that the dev agent follows clean, idiomatic code practices as appropriate for chosen frameworks (React/Next.js, Vercel API, Neon SQL).
- Require readable, clearly documented code with inline comments only to clarify intent—never as placeholders for missing logic.
- Ensure use of environment-specific config (dev/prod URIs) with secure defaults, and that each environment is testable by the QA agent.
- Run regression and acceptance testing on staging and production Vercel deployments, with real Neon DB branches for data.

## Acceptance Criteria

- No stubs, no over/under engineering, no silent or automatic fallback.
- All requirements are met with fully implemented, tested flows.
- The codebase is clean, secure, and follows best practices.
- All error states and fallback actions require explicit user input/consent.
- All admin and user flows are transparent, auditable, and user-centered.
