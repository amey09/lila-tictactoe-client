import { reconnectLabel, resultLabel, timerLabel } from "../lib/nakama";
import type { MatchMode, Snapshot } from "../types";

function Stat(props: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function StatusPanel(props: {
  connected: boolean;
  username?: string;
  snapshot: Snapshot;
  selectedMode: MatchMode;
  clock: number;
  activeMatchId: string;
  myMark?: string;
  opponentName?: string;
}) {
  const {
    connected,
    username,
    snapshot,
    selectedMode,
    clock,
    activeMatchId,
    myMark,
    opponentName,
  } = props;

  return (
    <section className="panel hero">
      <div className="hero-copy">
        <p className="eyebrow">LILA Games Technical Assignment</p>
        <h1>Queue fast. Read the board. Run it back.</h1>
        <p className="lede">
          The goal is a compact replayable multiplayer loop: identify yourself once, get into
          a match fast, understand the state instantly, and feel pushed toward one more round.
        </p>

        <div className="hero-callouts">
          <div className="callout">
            <span>Recommended start</span>
            <strong>Quick Match</strong>
          </div>
          <div className="callout">
            <span>Seat</span>
            <strong>{myMark ? `You are ${myMark}` : "Not seated"}</strong>
          </div>
          <div className="callout">
            <span>Opponent</span>
            <strong>{opponentName ?? "Waiting for join"}</strong>
          </div>
          <div className="callout">
            <span>Round result</span>
            <strong>{resultLabel(snapshot)}</strong>
          </div>
        </div>
      </div>

      <div className="status-card">
        <p className="status-card-title">Live Session</p>
        <div className="status-grid">
          <Stat label="Connection" value={connected ? "Online" : "Offline"} />
          <Stat label="Player" value={username ?? "Connecting..."} />
          <Stat label="Turn" value={snapshot.currentTurn || "-"} />
          <Stat label="Mode" value={snapshot.mode || selectedMode} />
          <Stat label="Match" value={activeMatchId ? "Live" : "No active round"} />
          <Stat label="Timer" value={timerLabel(snapshot.turnDeadlineUnix, clock)} />
          <Stat label="Reconnect" value={reconnectLabel(snapshot.reconnectDeadlineMs, clock)} />
        </div>
        <p className="status-note">
          Move through the screens from left to right: Home to find a game, Match to play it,
          Intel to inspect rooms and the leaderboard.
        </p>
      </div>
    </section>
  );
}
