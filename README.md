# lila-tictactoe-client

Mobile-first multiplayer Tic-Tac-Toe client built with React, TypeScript, and Vite.

## Features

- device-auth bootstrap against Nakama
- create match
- quick match
- join by match ID
- open match discovery
- classic and timed mode selection
- live countdown display
- leaderboard screen section

## Environment

- `VITE_NAKAMA_HOST`
- `VITE_NAKAMA_PORT`
- `VITE_NAKAMA_USE_SSL`

Defaults are deployment-friendly:

- local dev falls back to `127.0.0.1:7350`
- deployed app falls back to the current browser host

## Local Run

```bash
npm install
npm run dev
```

Typical local URL:

- `http://127.0.0.1:5173`

## Live Deployment

Current live frontend:

- `http://64.227.173.59`

## Current Flow

- authenticate with Nakama using device auth
- create or quick match through backend RPC
- join a match by ID or from listed open matches
- receive authoritative board snapshots over the realtime socket
- submit moves over socket opcode `1`
- view leaderboard results from `get_leaderboard`

## Manual Test Flow

1. Open one normal browser window.
2. Open one incognito window.
3. Wait for both clients to show `Connection: Online`.
4. Create or quick match in the first window.
5. Join from the second window.
6. Play a full round and verify:
   - turn changes on both clients
   - timed mode countdown updates
   - game result is synchronized
   - leaderboard refresh shows the updated win count

## Smoke Test

Against the live deployment:

```bash
npm run smoke:live
```

Override host/port if needed:

```bash
NAKAMA_HOST=127.0.0.1 NAKAMA_PORT=7350 npm run smoke:live
```
