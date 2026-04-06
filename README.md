# lila-tictactoe-client

Mobile-first multiplayer Tic-Tac-Toe client built with React, TypeScript, and Vite.

## Planned Scope

- lobby and matchmaking flows
- room create and join flows
- real-time board rendering
- leaderboard screen
- responsive public web deployment on Vercel

## Environment

- `VITE_NAKAMA_HOST`
- `VITE_NAKAMA_PORT`
- `VITE_NAKAMA_USE_SSL`

## Current Flow

- authenticate with Nakama using device auth
- create match through backend RPC
- join a match by ID
- receive authoritative board snapshots over the realtime socket
- submit moves over socket opcode `1`
