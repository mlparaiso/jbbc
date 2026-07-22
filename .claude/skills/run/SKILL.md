---
name: run
description: Launch the JBBC Worship Scheduler app (Vite + React + Firebase) for local development. Use this whenever the user asks to run, start, launch, preview, or "spin up" the app, wants to see a change working in the browser, asks "does this work", or wants a screenshot/click-through of the running app. Also use it before claiming any UI or frontend change is complete. Prefer this over guessing dev commands from scratch — it has the exact port, sign-in caveats, and which routes work without logging in.
---

# Running the JBBC Worship Scheduler app

This is a Vite + React app backed by Firebase (Auth, Firestore, Storage). There is no
backend server to start separately — `npm run dev` is the whole app.

## Steps

1. **Check dependencies are installed.** If `node_modules/` is missing, run `npm install` first.
2. **Check for `.env`.** The app reads Firebase config from `VITE_FIREBASE_*` env vars (see
   `src/firebase.js`). If `.env` is missing, copy `.env.example` and tell the user they need to
   fill in real Firebase project credentials — the app will load with a blank/broken auth screen
   without them. If `.env` already exists (it does in this repo's normal dev setup), no action
   needed.
3. **Start the dev server in the background** so you don't block on it:
   ```
   npm run dev
   ```
   Run this with a background-capable tool (e.g. Bash `run_in_background: true`, or Monitor) —
   never in the foreground, since it never exits on its own.
4. **Wait for the ready line**, then extract the actual URL — Vite defaults to
   `http://localhost:5173/` but will pick the next free port (5174, 5175, ...) if 5173 is busy.
   Don't assume the port; read it from the `➜  Local:` line in the dev server's own output.
5. **Open the app** in a browser tool (Playwright/Chrome DevTools MCP, or tell the user the URL
   if no browser tool is available) at that URL.

## What you'll see, and the auth wall

Most of the app requires signing in with Google OAuth (`loginWithGoogle` in
`src/context/AppContext.jsx`) — there is no test-account bypass or emulator config in this repo,
so an agent without real Google credentials **cannot** sign in interactively. Plan verification
accordingly:

- **Reachable without signing in:**
  - `/login` — the sign-in screen itself. Good for confirming the app boots and Firebase config
    is valid (a broken `.env` shows up here as a blank screen or console errors).
  - `/team/:teamId` and `/team/:teamId/lineup/:lineupId` — the **public** schedule/lineup view,
    for any team with `isPublic: true`. If you have a real `teamId` from a previous session or
    the user gives you one, this is the most useful no-auth path for checking schedule/lineup
    rendering changes (see `src/pages/PublicSchedulePage.jsx`, `PublicLineupDetailPage.jsx`).
- **Requires sign-in** (everything else — Schedule, Dashboard, Team Setup, Lineup create/edit,
  Members): if the user is present and can click through the Google OAuth prompt themselves,
  ask them to sign in once and hand control back to you, or narrate what to click and let them
  verify visually. Don't claim you've "verified" an authenticated flow if you only confirmed the
  code compiles and the login screen loads — say explicitly that live authenticated verification
  needs a human, or a code read-through was substituted.

## Stopping

Kill the background dev server task when you're done (or leave it running if the user is actively
using it — ask if unsure). It has no graceful shutdown beyond the process being killed.
