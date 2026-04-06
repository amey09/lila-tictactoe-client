import { useEffect, useMemo, useState } from "react";
import {
  Client,
  DefaultSocket,
  Session,
  Socket,
} from "@heroiclabs/nakama-js";

type Mark = "" | "X" | "O";
type MatchStatus = "waiting" | "active" | "draw" | "won";

type Seat = {
  userId: string;
  username: string;
  mark: Mark;
};

type Snapshot = {
  board: Mark[];
  currentTurn: Mark;
  status: MatchStatus;
  winner: Mark;
  moveNumber: number;
  players: Seat[];
};

type SessionBundle = {
  client: Client;
  socket: Socket;
  session: Session;
  userId: string;
  username: string;
};

type CreateMatchResponse = {
  matchId: string;
};

const serverKey = "defaultkey";
const host = import.meta.env.VITE_NAKAMA_HOST || window.location.hostname || "127.0.0.1";
const port = import.meta.env.VITE_NAKAMA_PORT || "7350";
const useSSL =
  String(import.meta.env.VITE_NAKAMA_USE_SSL || "") === "true" ||
  window.location.protocol === "https:";
const moveOpCode = 1;
const stateOpCode = 2;

const emptySnapshot = (): Snapshot => ({
  board: Array<Mark>(9).fill(""),
  currentTurn: "X",
  status: "waiting",
  winner: "",
  moveNumber: 0,
  players: [],
});

function getOrCreateDeviceId() {
  const key = "lila.deviceId";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

function getStoredMatchId() {
  return window.localStorage.getItem("lila.lastMatchId") ?? "";
}

function App() {
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [matchIdInput, setMatchIdInput] = useState(getStoredMatchId());
  const [activeMatchId, setActiveMatchId] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [availableMatches, setAvailableMatches] = useState<Array<{ id: string; size: number }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBusy(true);
      setError("");

      try {
        const client = new Client(serverKey, host, port, useSSL);
        const deviceId = getOrCreateDeviceId();
        const session = await client.authenticateDevice(deviceId, true);
        const socket = client.createSocket(useSSL, false) as DefaultSocket;
        await socket.connect(session, true);

        socket.onmatchdata = (message) => {
          const incomingOpCode = message.op_code;
          if (incomingOpCode !== stateOpCode) return;

          const rawState = new TextDecoder().decode(message.data);
          const next = JSON.parse(rawState) as Snapshot;
          setSnapshot(next);
        };

        socket.ondisconnect = () => {
          setConnected(false);
          setError("Socket disconnected. Refresh to reconnect.");
        };

        const account = await client.getAccount(session);
        const userId = account.user?.id ?? "";
        const username = account.user?.username ?? "Player";

        if (!cancelled) {
          setBundle({
            client,
            socket,
            session,
            userId,
            username,
          });
          setConnected(true);
          void loadOpenMatches(client, session, setAvailableMatches);
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(formatError(bootstrapError, "Unable to connect to Nakama."));
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const mySeat = useMemo(() => {
    if (!bundle) return undefined;
    return snapshot.players.find((player) => player.userId === bundle.userId);
  }, [bundle, snapshot.players]);

  const canPlay = Boolean(
    bundle &&
      mySeat &&
      snapshot.status === "active" &&
      mySeat.mark === snapshot.currentTurn,
  );

  async function createMatch() {
    if (!bundle) return;

    setBusy(true);
    setError("");

    try {
      const raw = await bundle.client.rpc(bundle.session, "create_match", {});
      const response = raw.payload as CreateMatchResponse;
      await joinMatch(response.matchId);
    } catch (createError) {
      setError(formatError(createError, "Unable to create match."));
    } finally {
      setBusy(false);
    }
  }

  async function joinMatch(matchIdArg?: string) {
    if (!bundle) return;

    const nextMatchId = (matchIdArg ?? matchIdInput).trim();
    if (!nextMatchId) {
      setError("Enter a match ID first.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await bundle.socket.joinMatch(nextMatchId);
      setActiveMatchId(nextMatchId);
      setMatchIdInput(nextMatchId);
      window.localStorage.setItem("lila.lastMatchId", nextMatchId);
      setSnapshot(emptySnapshot());
      await loadOpenMatches(bundle.client, bundle.session, setAvailableMatches);
    } catch (joinError) {
      setError(formatError(joinError, "Unable to join match."));
    } finally {
      setBusy(false);
    }
  }

  async function playMove(index: number) {
    if (!bundle || !activeMatchId || !canPlay || snapshot.board[index] !== "") {
      return;
    }

    try {
      await bundle.socket.sendMatchState(
        activeMatchId,
        moveOpCode,
        JSON.stringify({ cell: index }),
      );
    } catch (moveError) {
      setError(formatError(moveError, "Unable to send move."));
    }
  }

  return (
    <div className="shell">
      <section className="panel hero">
        <div>
          <p className="eyebrow">LILA Multiplayer Assignment</p>
          <h1>Server-authoritative Tic-Tac-Toe</h1>
          <p className="lede">
            React client talking to Nakama over RPC + realtime sockets. The
            board only updates from server-validated state.
          </p>
        </div>
        <div className="status-grid">
          <Stat label="Connection" value={connected ? "Online" : "Offline"} />
          <Stat label="Player" value={bundle?.username ?? "Connecting..."} />
          <Stat label="Turn" value={snapshot.currentTurn || "-"} />
          <Stat label="Result" value={resultLabel(snapshot)} />
        </div>
      </section>

      <section className="panel lobby">
        <div className="lobby-actions">
          <button className="primary" onClick={createMatch} disabled={busy || !bundle}>
            Create Match
          </button>
          <button className="secondary" onClick={() => bundle && void loadOpenMatches(bundle.client, bundle.session, setAvailableMatches)} disabled={busy || !bundle}>
            Refresh Matches
          </button>
          <div className="join-group">
            <input
              value={matchIdInput}
              onChange={(event) => setMatchIdInput(event.target.value)}
              placeholder="Paste match ID"
            />
            <button onClick={() => void joinMatch()} disabled={busy || !bundle}>
              Join
            </button>
          </div>
        </div>

        <div className="match-meta">
          <Meta label="Active match" value={activeMatchId || "Not joined"} />
          <Meta label="Your mark" value={mySeat?.mark || "-"} />
          <Meta
            label="Players"
            value={
              snapshot.players.length
                ? snapshot.players.map((player) => `${player.username} (${player.mark})`).join(", ")
                : "Waiting for players"
            }
          />
        </div>

        <div className="open-matches">
          <h2>Open Matches</h2>
          {availableMatches.length ? (
            availableMatches.map((match) => (
              <button
                key={match.id}
                className="match-row"
                onClick={() => void joinMatch(match.id)}
              >
                <span>{match.id}</span>
                <strong>{match.size}/2 players</strong>
              </button>
            ))
          ) : (
            <p className="subtle">No open authoritative matches listed yet.</p>
          )}
        </div>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel game">
        <div className="board">
          {snapshot.board.map((mark, index) => (
            <button
              key={index}
              className="cell"
              disabled={!canPlay || mark !== ""}
              onClick={() => void playMove(index)}
            >
              {mark || "·"}
            </button>
          ))}
        </div>

        <div className="game-copy">
          <h2>Match State</h2>
          <p>{statusCopy(snapshot, mySeat?.mark)}</p>
          <p className="subtle">
            Opcode `1` submits a move. Opcode `2` carries the authoritative board
            snapshot from Nakama.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function Meta(props: { label: string; value: string }) {
  return (
    <p className="meta">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </p>
  );
}

function resultLabel(snapshot: Snapshot) {
  if (snapshot.status === "won") return `${snapshot.winner} wins`;
  if (snapshot.status === "draw") return "Draw";
  return snapshot.status;
}

function statusCopy(snapshot: Snapshot, myMark?: Mark) {
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

function formatError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: string }).message || "");
    if (message) return message;
  }

  return fallback;
}

async function loadOpenMatches(
  client: Client,
  session: Session,
  setAvailableMatches: (matches: Array<{ id: string; size: number }>) => void,
) {
  try {
    const result = await client.listMatches(session, 10, true, "", 0, 2, "");
    setAvailableMatches(
      (result.matches ?? [])
        .filter((match) => Boolean(match.match_id))
        .map((match) => ({
          id: match.match_id as string,
          size: match.size ?? 0,
        })),
    );
  } catch {
    setAvailableMatches([]);
  }
}

export default App;
