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

export function clearStoredMatchId() {
  window.localStorage.removeItem("lila.lastMatchId");
}

export async function bootstrapSession(
  onMatchData: (snapshot: Snapshot) => void,
  onDisconnect: () => void,
): Promise<SessionBundle> {
  const client = new Client(serverKey, host, port, useSSL);
  const session = await client.authenticateDevice(getOrCreateDeviceId(), true);
  const socket = client.createSocket(useSSL, false) as DefaultSocket;
  await socket.connect(session, true);

  socket.onmatchdata = (message) => {
    if (message.op_code !== stateOpCode) return;
    const rawState = new TextDecoder().decode(message.data);
    onMatchData(JSON.parse(rawState) as Snapshot);
  };

  socket.ondisconnect = onDisconnect;

  const account = await client.getAccount(session);

  return {
    client,
    socket,
    session,
    userId: account.user?.id ?? "",
    username: account.user?.username ?? "Player",
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
