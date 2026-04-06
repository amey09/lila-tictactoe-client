# Frontend Integration Guide

## Purpose

This document is the complete handoff for a frontend developer integrating with the current multiplayer Tic-Tac-Toe backend.

It is written to be used directly by another engineer or by an agent workflow such as Gemini CLI.

This guide covers:

- system overview
- repo layout
- live and local endpoints
- backend RPCs
- realtime socket behavior
- match state contracts
- feature list
- expected frontend flows
- local development steps
- deployment notes
- testing checklist
- known constraints and pitfalls

## Project Status

The project is already functional end to end.

Implemented:

- server-authoritative multiplayer Tic-Tac-Toe
- create match
- quick match
- join by match ID
- open match discovery
- classic mode
- timed mode
- disconnect grace handling
- win/loss/draw persistence
- leaderboard RPC
- public deployment

Not fully polished:

- TLS / custom domain
- deep reconnect UX polish
- production hardening beyond assignment scope

## Repositories

Backend repo:

- `https://github.com/amey09/lila-tictactoe-backend`

Client repo:

- `https://github.com/amey09/lila-tictactoe-client`

## Live Deployment

Frontend:

- `http://64.227.173.59`

Backend HTTP API:

- `http://64.227.173.59:7350`

Backend WebSocket:

- `ws://64.227.173.59:7350/ws`

Important:

- current live deployment is HTTP, not HTTPS
- because of that, frontend logic must not rely on secure-context-only browser APIs without fallback
- `crypto.randomUUID()` already has a fallback in the current client code

## Local Development

### Backend

Path:

- [lila-tictactoe-backend](D:\Code\LILA%20Games\lila-tictactoe-backend)

Run:

```bash
docker compose -f infra/docker-compose.local.yml up --build
```

Local backend endpoints:

- API: `http://127.0.0.1:7350`
- WebSocket: `ws://127.0.0.1:7350/ws`
- Console: `http://127.0.0.1:7351`

Console credentials from [local.yml](D:\Code\LILA%20Games\lila-tictactoe-backend\local.yml):

- username: `admin`
- password: `password`

### Client

Path:

- [lila-tictactoe-client](D:\Code\LILA%20Games\lila-tictactoe-client)

Run:

```bash
npm install
npm run dev
```

Typical local client URL:

- `http://127.0.0.1:5173`

### Local FE -> Deployed BE Setup

If a frontend developer wants to run the frontend locally but connect to the deployed backend on the droplet, use:

```env
VITE_NAKAMA_HOST=64.227.173.59
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
```

That setup works when the frontend itself is also running over plain HTTP locally, for example:

- `http://127.0.0.1:5173`

Important warning:

- if the frontend is served over `https`, the browser will block connections to `ws://64.227.173.59:7350/ws`
- in that case, the backend must also be exposed over TLS and WebSocket Secure (`wss://`)

## Frontend Environment Variables

Defined in [.env.example](D:\Code\LILA%20Games\lila-tictactoe-client\.env.example):

- `VITE_NAKAMA_HOST`
- `VITE_NAKAMA_PORT`
- `VITE_NAKAMA_USE_SSL`

Current client fallback behavior:

- if env vars are not present, host falls back to `window.location.hostname`
- if host is still unavailable, it falls back to `127.0.0.1`
- SSL is enabled automatically if the page is loaded over `https:`

Current code reference:

- [App.tsx](D:\Code\LILA%20Games\lila-tictactoe-client\src\App.tsx)

## High-Level Architecture

Frontend responsibilities:

- authenticate the player
- connect a socket to Nakama
- call RPCs for match creation / quick match / leaderboard
- join matches
- send move intent
- render only authoritative board state from backend snapshots
- display mode, timer, reconnect grace, and leaderboard

Backend responsibilities:

- own all game state
- validate move legality
- enforce turn order
- detect winner / draw
- handle timed mode forfeits
- handle disconnect grace and forfeit
- persist player stats
- maintain leaderboard data

Rule:

- frontend never decides winner, loser, turn validity, or timeout result

## Backend Contract

### Match Module

Registered match module name:

- `tic_tac_toe`

### RPCs

Registered in:

- [main.go](D:\Code\LILA%20Games\lila-tictactoe-backend\main.go)

Implemented in:

- [create_room.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\rpc\create_room.go)

Available RPC ids:

- `create_match`
- `find_or_create_match`
- `get_leaderboard`

### RPC: `create_match`

Purpose:

- create a new authoritative match

Input payload:

```json
{
  "mode": "classic"
}
```

or

```json
{
  "mode": "timed"
}
```

If omitted:

- defaults to `classic`

Response:

```json
{
  "matchId": "uuid.nakama1"
}
```

### RPC: `find_or_create_match`

Purpose:

- quick match behavior
- tries to find an existing open match for the selected mode
- creates one if none is available

Input payload:

```json
{
  "mode": "classic"
}
```

or

```json
{
  "mode": "timed"
}
```

Response:

```json
{
  "matchId": "uuid.nakama1"
}
```

### RPC: `get_leaderboard`

Purpose:

- fetch top players

Input payload:

```json
{}
```

Response shape:

```json
{
  "entries": [
    {
      "rank": 1,
      "userId": "user-id",
      "username": "player-name",
      "wins": 10,
      "losses": 2,
      "draws": 1,
      "winStreak": 4
    }
  ]
}
```

## Realtime Socket Contract

### Authentication

Current client uses Nakama device authentication.

Reference:

- [App.tsx](D:\Code\LILA%20Games\lila-tictactoe-client\src\App.tsx)

Flow:

1. create or reuse local device ID
2. call `authenticateDevice`
3. create socket
4. connect socket with session

### Match Join

Client joins with:

- `socket.joinMatch(matchId)`

### Match State Opcodes

Used in client and backend:

- `1` = move submission
- `2` = authoritative match snapshot broadcast

Backend reference:

- [runtime.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\runtime.go)

### Client Move Submission

Client sends:

```json
{
  "cell": 0
}
```

through socket opcode `1`.

Example:

```ts
socket.sendMatchState(matchId, 1, JSON.stringify({ cell: 0 }))
```

### Server Snapshot Broadcast

Server broadcasts opcode `2`.

Snapshot shape:

```json
{
  "board": ["X", "", "", "", "", "", "", "", ""],
  "currentTurn": "O",
  "status": "active",
  "winner": "",
  "moveNumber": 1,
  "players": [
    {
      "userId": "user-a",
      "username": "playerA",
      "mark": "X"
    },
    {
      "userId": "user-b",
      "username": "playerB",
      "mark": "O"
    }
  ],
  "mode": "classic",
  "turnDeadlineUnix": 0,
  "reconnectDeadlineMs": 0
}
```

Defined in:

- [state.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\state.go)

## Match State Fields

### `board`

- array of 9 marks
- values are `""`, `"X"`, `"O"`

### `currentTurn`

- mark whose turn it is

### `status`

Possible values:

- `waiting`
- `active`
- `draw`
- `won`

### `winner`

- `""` unless the match is won
- `"X"` or `"O"` when won

### `moveNumber`

- integer move count

### `players`

Array of:

```json
{
  "userId": "string",
  "username": "string",
  "mark": "X"
}
```

### `mode`

Possible values:

- `classic`
- `timed`

### `turnDeadlineUnix`

- Unix time in milliseconds
- `0` in classic mode
- non-zero in timed mode while active

Frontend should display:

- seconds remaining = `Math.max(0, ceil((turnDeadlineUnix - Date.now()) / 1000))`

### `reconnectDeadlineMs`

- Unix time in milliseconds
- `0` when no reconnect grace window is active
- non-zero when a player leaves during an active match and grace is running

Frontend should display:

- reconnect countdown if `reconnectDeadlineMs > Date.now()`

## Game Modes

### Classic

- no turn timer

### Timed

- each turn gets 30 seconds
- if the active player times out, the other player wins

Backend constants:

- `TurnSeconds = 30`
- `DisconnectGraceSeconds = 30`

Defined in:

- [state.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\state.go)

## Disconnect Handling

Implemented behavior:

- if a player disconnects during an active game, state goes to waiting
- reconnect grace window starts
- if player does not return before the deadline, they forfeit
- remaining player wins

Relevant backend logic:

- [runtime.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\runtime.go)

## Persistence

Current persistent stats:

- wins
- losses
- draws
- win streak

Storage collection:

- `player_stats`

Storage key:

- `summary`

Leaderboard id:

- `tictactoe_wins`

Implemented in:

- [service.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\leaderboard\service.go)

Ranking behavior:

- score = total wins
- subscore = win streak

## Current Frontend Features

Implemented in:

- [App.tsx](D:\Code\LILA%20Games\lila-tictactoe-client\src\App.tsx)
- [styles.css](D:\Code\LILA%20Games\lila-tictactoe-client\src\styles.css)

Current UI supports:

- connection status
- player identity
- create match
- quick match
- join by match ID
- refresh open matches
- mode selection
- active match summary
- reconnect timer display
- game board rendering
- server-authoritative move submission
- leaderboard rendering

## Expected Frontend Integration Tasks

If another frontend dev is continuing the UI, these are the main tasks they can safely work on.

### Safe Enhancements

- improve responsive layout
- split single-file app into components
- add route structure
- add better error banners
- add loading states
- improve leaderboard presentation
- improve timed mode visuals
- add rematch UX if desired

### Current Logical Boundaries

Do not change these semantics unless backend changes too:

- opcodes
- RPC ids
- snapshot field names
- mode string values
- match status values

## Recommended Component Split

Suggested future frontend structure:

- `lib/nakama.ts`
- `hooks/useNakamaSession.ts`
- `hooks/useMatchSocket.ts`
- `components/Lobby.tsx`
- `components/ModePicker.tsx`
- `components/Board.tsx`
- `components/Leaderboard.tsx`
- `components/StatusPanel.tsx`

Current code is intentionally kept in one main file to move fast during assignment execution.

## How To Play And Test

### Manual Browser Test

1. Open `http://64.227.173.59`
2. Hard refresh once
3. Wait until connection shows `Online`
4. Open a second browser window or incognito
5. In one window:
   - click `Create Match` or `Quick Match`
6. In the other window:
   - click `Refresh Matches`
   - join a listed match, or use `Quick Match`
7. Play moves from both windows

### What To Verify

- both clients connect successfully
- match appears in open matches
- move order alternates correctly
- invalid move attempts are ignored
- timed mode displays countdown
- disconnect during active timed/classic match shows reconnect grace
- winner or draw is synchronized across both clients
- leaderboard refresh shows updated records

## Smoke Tests Already Performed

These were already verified during implementation:

- live backend auth
- live `create_match`
- live `find_or_create_match`
- live two-client socket join
- live authoritative move progression
- live leaderboard update after completed game

## Important Constraints

### Windows Plugin Build

Do not try to build the Nakama Go plugin directly on Windows with:

```bash
go build --buildmode=plugin
```

That build mode is not supported on Windows.

Correct approach:

- use Docker build for local backend runtime packaging
- CI and Linux container builds validate plugin output

### HTTP vs HTTPS

Current live app is HTTP.

That means:

- avoid secure-context-only assumptions in frontend code
- if moving frontend to Vercel later, backend must also be exposed via TLS/wss

## Key Files

Backend:

- [main.go](D:\Code\LILA%20Games\lila-tictactoe-backend\main.go)
- [state.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\state.go)
- [rules.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\rules.go)
- [handler.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\handler.go)
- [runtime.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\match\runtime.go)
- [create_room.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\rpc\create_room.go)
- [service.go](D:\Code\LILA%20Games\lila-tictactoe-backend\internal\leaderboard\service.go)

Client:

- [App.tsx](D:\Code\LILA%20Games\lila-tictactoe-client\src\App.tsx)
- [styles.css](D:\Code\LILA%20Games\lila-tictactoe-client\src\styles.css)
- [package.json](D:\Code\LILA%20Games\lila-tictactoe-client\package.json)
- [README.md](D:\Code\LILA%20Games\lila-tictactoe-client\README.md)

## If The Other Frontend Dev Wants A Faster Start

Tell them to do this:

1. clone `lila-tictactoe-client`
2. read this guide first
3. run `npm install`
4. run `npm run dev`
5. connect to the live backend or local backend
6. keep [App.tsx](D:\Code\LILA%20Games\lila-tictactoe-client\src\App.tsx) behaviorally correct while refactoring UI

## Minimal Backend Usage Snippets

### Create Match

```ts
const rpc = await client.rpc(session, "create_match", { mode: "classic" });
const matchId = (rpc.payload as { matchId: string }).matchId;
await socket.joinMatch(matchId);
```

### Quick Match

```ts
const rpc = await client.rpc(session, "find_or_create_match", { mode: "timed" });
const matchId = (rpc.payload as { matchId: string }).matchId;
await socket.joinMatch(matchId);
```

### Leaderboard

```ts
const rpc = await client.rpc(session, "get_leaderboard", {});
const entries = (rpc.payload as { entries: Array<any> }).entries;
```

### Move

```ts
await socket.sendMatchState(matchId, 1, JSON.stringify({ cell: 4 }));
```

## Final Notes

This backend-client contract is now stable enough for UI iteration.

If the other frontend developer wants to redesign or refactor heavily, the safest approach is:

- keep RPC ids unchanged
- keep socket opcode semantics unchanged
- keep snapshot field names unchanged
- preserve mode strings: `classic`, `timed`
- preserve match statuses: `waiting`, `active`, `draw`, `won`

If backend changes later, this file should be updated first before UI work continues.
