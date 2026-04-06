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
}) {
  const { connected, username, snapshot, selectedMode, clock } = props;

  return (
    <section className="panel hero">
      <div className="hero-copy">
        <p className="eyebrow">LILA Games Technical Assignment</p>
        <h1>Play a round in seconds. The server settles every move.</h1>
        <p className="lede">
          Create a room, quick match into an open one, or join an existing match ID.
          The browser never decides outcomes. It only reflects the state validated by Nakama.
        </p>

        <div className="hero-callouts">
          <div className="callout">
            <span>Best first step</span>
            <strong>Use Quick Match</strong>
          </div>
          <div className="callout">
            <span>Current mode</span>
            <strong>{snapshot.mode || selectedMode}</strong>
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
          <Stat label="Timer" value={timerLabel(snapshot.turnDeadlineUnix, clock)} />
          <Stat label="Reconnect" value={reconnectLabel(snapshot.reconnectDeadlineMs, clock)} />
        </div>
        <p className="status-note">
          When the connection is online, create or join a match. When it is your turn,
          tap any empty square on the board.
        </p>
      </div>
    </section>
  );
}
