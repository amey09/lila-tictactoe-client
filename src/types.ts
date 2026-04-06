import type { Client, Session, Socket } from "@heroiclabs/nakama-js";

export type Mark = "" | "X" | "O";
export type MatchStatus = "waiting" | "active" | "draw" | "won";
export type MatchMode = "classic" | "timed";

export type Seat = {
  userId: string;
  username: string;
  mark: Mark;
};

export type Snapshot = {
  board: Mark[];
  currentTurn: Mark;
  status: MatchStatus;
  winner: Mark;
  moveNumber: number;
  players: Seat[];
  mode: MatchMode;
  turnDeadlineUnix: number;
  reconnectDeadlineMs: number;
};

export type SessionBundle = {
  client: Client;
  socket: Socket;
  session: Session;
  userId: string;
  username: string;
};

export type CreateMatchResponse = {
  matchId: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
};

export type AvailableMatch = {
  id: string;
  size: number;
  mode: MatchMode;
};
