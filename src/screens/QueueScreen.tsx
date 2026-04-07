import type { MatchMode } from "../types";

export function QueueScreen(props: {
  mode: MatchMode;
  activeMatchId: string;
  hasSeat: boolean;
  playerCount: number;
  cancel: () => void;
}) {
  const { mode, activeMatchId, hasSeat, playerCount, cancel } = props;

  const headline = hasSeat
    ? playerCount >= 2
      ? "Opponent found. Loading the round."
      : "Seat secured. Waiting for an opponent."
    : "Searching for a live round.";

  const body = hasSeat
    ? playerCount >= 2
      ? "Both seats are occupied. The live match screen is next."
      : "The room exists and your seat is locked. The second player is the only remaining requirement."
    : "Stay in queue. The system will reuse an open room first, then create one if needed.";

  return (
    <section className="panel queue-screen">
      <div className="queue-stage">
        <p className="section-eyebrow">Matchmaking</p>
        <h1>{headline}</h1>
        <p className="lede">{body}</p>

        <div className="queue-pulse queue-pulse-large" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="queue-stats">
          <div className="command-chip">
            <span>Mode</span>
            <strong>{mode}</strong>
          </div>
          <div className="command-chip">
            <span>Seat</span>
            <strong>{hasSeat ? "Locked in" : "Searching"}</strong>
          </div>
          <div className="command-chip">
            <span>Players</span>
            <strong>{playerCount}/2</strong>
          </div>
          <div className="command-chip">
            <span>Match</span>
            <strong>{activeMatchId || "Finding room..."}</strong>
          </div>
        </div>

        <div className="match-actions">
          <button className="secondary" onClick={cancel}>
            Cancel Queue
          </button>
        </div>
      </div>
    </section>
  );
}
