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
      <div>
        <p className="eyebrow">LILA Multiplayer Assignment</p>
        <h1>Server-authoritative Tic-Tac-Toe</h1>
        <p className="lede">
          React client talking to Nakama over RPC + realtime sockets. The board
          only updates from server-validated state.
        </p>
      </div>
      <div className="status-grid">
        <Stat label="Connection" value={connected ? "Online" : "Offline"} />
        <Stat label="Player" value={username ?? "Connecting..."} />
        <Stat label="Turn" value={snapshot.currentTurn || "-"} />
        <Stat label="Result" value={resultLabel(snapshot)} />
        <Stat label="Mode" value={snapshot.mode || selectedMode} />
        <Stat label="Timer" value={timerLabel(snapshot.turnDeadlineUnix, clock)} />
        <Stat label="Reconnect" value={reconnectLabel(snapshot.reconnectDeadlineMs, clock)} />
      </div>
    </section>
  );
}
