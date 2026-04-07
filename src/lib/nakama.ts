import { Client, DefaultSocket, type Session } from "@heroiclabs/nakama-js";

import type {
  AvailableMatch,
  CreateMatchResponse,
  LeaderboardEntry,
  MatchMode,
  SessionBundle,
  Snapshot,
} from "../types";

export const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY || "defaultkey";
export const host =
  import.meta.env.VITE_NAKAMA_HOST || window.location.hostname || "127.0.0.1";
export const port = import.meta.env.VITE_NAKAMA_PORT || "7350";
export const useSSL =
  String(import.meta.env.VITE_NAKAMA_USE_SSL || "") === "true" ||
  window.location.protocol === "https:";
export const moveOpCode = 1;
export const stateOpCode = 2;
export const rematchOpCode = 3;

export const emptySnapshot = (): Snapshot => ({
  board: Array(9).fill(""),
  currentTurn: "X",
  status: "waiting",
  winner: "",
  moveNumber: 0,
  players: [],
  mode: "classic",
  turnDeadlineUnix: 0,
  reconnectDeadlineMs: 0,
  rematchVotes: [],
  eventSequence: 0,
  lastEvent: null,
});

export function getOrCreateDeviceId() {
  const key = "lila.deviceId";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `lila-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function getStoredMatchId() {
  return window.localStorage.getItem("lila.lastMatchId") ?? "";
}

export function getStoredPlayerName() {
  return window.localStorage.getItem("lila.playerName") ?? "";
}

export function storePlayerName(value: string) {
  if (value.trim()) {
    window.localStorage.setItem("lila.playerName", value.trim());
    return;
  }

  window.localStorage.removeItem("lila.playerName");
}

export function clearStoredMatchId() {
  window.localStorage.removeItem("lila.lastMatchId");
}

async function pause(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveUsername(
  client: Client,
  session: Session,
  desiredUsername?: string,
) {
  const normalizedDesired = desiredUsername?.trim().slice(0, 24) ?? "";
  const account = await client.getAccount(session);
  const currentUsername = account.user?.username ?? "Player";

  if (!normalizedDesired || currentUsername === normalizedDesired) {
    if (normalizedDesired && currentUsername === normalizedDesired) {
      storePlayerName(currentUsername);
    }
    return {
      session,
      username: currentUsername,
      userId: account.user?.id ?? "",
    };
  }

  await client.updateAccount(session, { username: normalizedDesired });

  let nextSession = session;
  let nextUsername = currentUsername;
  let nextUserId = account.user?.id ?? "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await pause(150 * (attempt + 1));
    nextSession = await client.authenticateDevice(getOrCreateDeviceId(), true);
    const nextAccount = await client.getAccount(nextSession);
    nextUsername = nextAccount.user?.username ?? "Player";
    nextUserId = nextAccount.user?.id ?? "";
    if (nextUsername === normalizedDesired) {
      storePlayerName(nextUsername);
      return {
        session: nextSession,
        username: nextUsername,
        userId: nextUserId,
      };
    }
  }

  storePlayerName(normalizedDesired);
  return {
    session: nextSession,
    username: normalizedDesired,
    userId: nextUserId,
  };
}

export async function bootstrapSession(
  onMatchData: (snapshot: Snapshot) => void,
  onDisconnect: () => void,
  desiredUsername?: string,
): Promise<SessionBundle> {
  const client = new Client(serverKey, host, port, useSSL);
  const initialSession = await client.authenticateDevice(getOrCreateDeviceId(), true);
  const resolved = await resolveUsername(client, initialSession, desiredUsername || getStoredPlayerName());
  const socket = client.createSocket(useSSL, false) as DefaultSocket;
  await socket.connect(resolved.session, true);

  socket.onmatchdata = (message) => {
    if (message.op_code !== stateOpCode) return;
    const rawState = new TextDecoder().decode(message.data);
    onMatchData(JSON.parse(rawState) as Snapshot);
  };

  socket.ondisconnect = onDisconnect;

  return {
    client,
    socket,
    session: resolved.session,
    userId: resolved.userId,
    username: resolved.username,
  };
}

export async function createMatch(
  bundle: SessionBundle,
  mode: MatchMode,
): Promise<CreateMatchResponse> {
  const raw = await bundle.client.rpc(bundle.session, "create_match", { mode });
  return raw.payload as CreateMatchResponse;
}

export async function quickMatch(
  bundle: SessionBundle,
  mode: MatchMode,
): Promise<CreateMatchResponse> {
  const raw = await bundle.client.rpc(bundle.session, "find_or_create_match", { mode });
  return raw.payload as CreateMatchResponse;
}

export async function loadOpenMatches(
  bundle: SessionBundle,
): Promise<AvailableMatch[]> {
  const result = await bundle.client.listMatches(bundle.session, 10, true, "", 0, 2, "");
  return (result.matches ?? [])
    .filter((match) => Boolean(match.match_id))
    .map((match) => ({
      id: match.match_id as string,
      size: match.size ?? 0,
      mode: match.label === "timed" ? "timed" : "classic",
    }));
}

export async function loadLeaderboard(
  bundle: SessionBundle,
): Promise<LeaderboardEntry[]> {
  const result = await bundle.client.rpc(bundle.session, "get_leaderboard", {});
  const payload = result.payload as { entries?: LeaderboardEntry[] };
  return payload.entries ?? [];
}

export async function joinMatch(bundle: SessionBundle, matchId: string) {
  await bundle.socket.joinMatch(matchId);
  window.localStorage.setItem("lila.lastMatchId", matchId);
}

export async function leaveMatch(bundle: SessionBundle, matchId: string) {
  await bundle.socket.leaveMatch(matchId);
  clearStoredMatchId();
}

export async function updatePlayerName(bundle: SessionBundle, username: string) {
  const normalized = username.trim().slice(0, 24);
  if (!normalized) {
    throw new Error("Enter a name before saving.");
  }

  await bundle.client.updateAccount(bundle.session, {
    username: normalized,
  });
  storePlayerName(normalized);

  return normalized;
}

export async function sendMove(
  bundle: SessionBundle,
  matchId: string,
  index: number,
) {
  await bundle.socket.sendMatchState(
    matchId,
    moveOpCode,
    JSON.stringify({ cell: index }),
  );
}

export async function sendRematchVote(bundle: SessionBundle, matchId: string) {
  await bundle.socket.sendMatchState(matchId, rematchOpCode, JSON.stringify({ ready: true }));
}

export function formatError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: string }).message || "");
    if (message) return message;
  }

  return fallback;
}

export function timerLabel(deadline: number, now: number) {
  if (!deadline) return "-";
  return `${Math.max(0, Math.ceil((deadline - now) / 1000))}s`;
}

export function reconnectLabel(deadline: number, now: number) {
  if (!deadline || deadline <= now) return "-";
  return `${Math.max(0, Math.ceil((deadline - now) / 1000))}s left`;
}

export function resultLabel(snapshot: Snapshot) {
  if (snapshot.status === "won") return `${snapshot.winner} wins`;
  if (snapshot.status === "draw") return "Draw";
  return snapshot.status;
}

export function statusCopy(snapshot: Snapshot, myMark?: string) {
  if (snapshot.status === "won") {
    return myMark && snapshot.winner === myMark
      ? "You won. The server accepted the final move and closed the round."
      : `Player ${snapshot.winner} won this round.`;
  }

  if (snapshot.status === "draw") {
    return "The board is full and the server marked the round as a draw.";
  }

  if (!myMark) {
    return "Join a match to receive your seat and the current board snapshot.";
  }

  if (snapshot.currentTurn === myMark) {
    return "Your turn. Tap an empty cell to submit a move to the server.";
  }

  return `Waiting for player ${snapshot.currentTurn} to move.`;
}

export function refreshClock(setClock: (value: number) => void) {
  const timer = window.setInterval(() => setClock(Date.now()), 500);
  return () => window.clearInterval(timer);
}
