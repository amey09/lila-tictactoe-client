import type { MatchEvent, Mark, Snapshot } from "../types";
import { statusCopy } from "../lib/nakama";

export function GamePanel(props: {
  activeMatchId: string;
  connected: boolean;
  snapshot: Snapshot;
  myMark?: Mark;
  username?: string;
  opponentName?: string;
  canPlay: boolean;
  playMove: (index: number) => void;
  returnHome: () => void;
  roundDurationSeconds: number;
  postMatchOpen: boolean;
  postMatchCountdown: number;
  dismissPostMatch: () => void;
  rematch: () => void;
  busy: boolean;
  rematchVotes: string[];
  playerCount: number;
  toast: MatchEvent | null;
}) {
  const {
    activeMatchId,
    connected,
    snapshot,
    myMark,
    username,
    opponentName,
    canPlay,
    playMove,
    returnHome,
    roundDurationSeconds,
    postMatchOpen,
    postMatchCountdown,
    dismissPostMatch,
    rematch,
    busy,
    rematchVotes,
    playerCount,
    toast,
  } = props;

  const hasSeat = Boolean(myMark);
  const waitingToJoin = Boolean(activeMatchId) && !hasSeat;
  const waitingForOpponent = hasSeat && snapshot.status === "waiting";
  const activeTurn = hasSeat && snapshot.status === "active" && snapshot.currentTurn === myMark;
  const opponentTurn = hasSeat && snapshot.status === "active" && snapshot.currentTurn !== myMark;
  const roundOver = snapshot.status === "won" || snapshot.status === "draw";

  let phaseTitle = "Start by joining a match";
  let phaseBody = "Use Quick Match for the fastest start, or create a private match and have someone else join it.";
  let phaseTone = "idle";

  if (!connected) {
    phaseTitle = "Connecting to the game server";
    phaseBody = "Wait for the connection badge to turn online before starting a round.";
    phaseTone = "idle";
  } else if (waitingToJoin) {
    phaseTitle = "Joining your seat";
    phaseBody = "The match has been selected. Waiting for the authoritative seat assignment from the server.";
    phaseTone = "idle";
  } else if (waitingForOpponent) {
    phaseTitle = "Waiting for another player";
    phaseBody = "You are in the match. As soon as a second player joins, marks will lock in and the round will begin.";
    phaseTone = "waiting";
  } else if (activeTurn) {
    phaseTitle = `Your move as ${myMark}`;
    phaseBody = "Pick any empty square. The board updates only after the server accepts your move.";
    phaseTone = "play";
  } else if (opponentTurn) {
    phaseTitle = `Waiting for ${snapshot.currentTurn}`;
    phaseBody = "Your opponent is up. Stay on this screen and the board will update automatically when the move is validated.";
    phaseTone = "waiting";
  } else if (roundOver) {
    phaseTitle = snapshot.status === "draw" ? "Round complete: draw" : `Round complete: ${snapshot.winner} wins`;
    phaseBody = "Start another match from the lobby whenever you are ready.";
    phaseTone = "done";
  }

  const rematchReady = myMark ? rematchVotes.length : 0;

  return (
    <section className="panel game">
      {toast ? (
        <div className="match-toast">
          <strong>{toast.username || "Match Update"}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className="game-copy">
        <p className="section-eyebrow">Match</p>
        <h2>Round room</h2>
        <p>{statusCopy(snapshot, myMark)}</p>
        <p className="subtle">
          This screen is the live round HUD. Once both seats are assigned, stay here and play off the board.
        </p>

        <div className="duel-strip">
          <div className="duel-card identity-card">
            <span>You</span>
            <strong>{username ?? "Connecting..."}</strong>
            <small>{myMark ? `${myMark} seat` : "Awaiting seat"}</small>
          </div>
          <div className="duel-card duel-card-center">
            <span>Match ID</span>
            <strong>{activeMatchId || "No active round"}</strong>
          </div>
          <div className="duel-card identity-card">
            <span>Opponent</span>
            <strong>{opponentName ?? "Waiting..."}</strong>
            <small>{opponentName ? "Opponent locked in" : "No second player yet"}</small>
          </div>
        </div>

        <div className="mini-stats">
          <div className="mini-stat-card">
            <span>Mode</span>
            <strong>{snapshot.mode}</strong>
          </div>
          <div className="mini-stat-card">
            <span>Moves</span>
            <strong>{snapshot.moveNumber}</strong>
          </div>
          <div className="mini-stat-card">
            <span>Round time</span>
            <strong>{roundDurationSeconds}s</strong>
          </div>
          <div className="mini-stat-card">
            <span>Status</span>
            <strong>{snapshot.status}</strong>
          </div>
        </div>

        <div className={`phase-card phase-${phaseTone}`}>
          <p className="section-eyebrow">Current Step</p>
          <h3>{phaseTitle}</h3>
          <p>{phaseBody}</p>
          {myMark ? (
            <div className="phase-badges">
              <span className="phase-badge">Playing as {username ?? "Player"}</span>
              <span className="phase-badge">You are {myMark}</span>
              <span className="phase-badge">Turn: {snapshot.currentTurn || "-"}</span>
            </div>
          ) : null}
        </div>

        <div className="match-actions">
          {roundOver ? (
            <button className="primary" onClick={rematch} disabled={busy}>
              Rematch
            </button>
          ) : null}
          <button className="secondary" onClick={returnHome}>
            Return To Home
          </button>
        </div>
      </div>

      <div className="board-wrap">
        <div className="board-frame">
          {!hasSeat || waitingForOpponent ? (
            <div className="board-overlay">
              <strong>{waitingForOpponent ? "Waiting for another player" : "Join a match to begin"}</strong>
              <span>
                {waitingForOpponent
                  ? "Your seat is ready. The board unlocks automatically when the second player arrives."
                  : "Use Quick Match or join an open room from the lobby above."}
              </span>
            </div>
          ) : null}
          <div className="board">
            {snapshot.board.map((mark, index) => (
              <button
                key={index}
                className="cell"
                disabled={!canPlay || mark !== "" || !hasSeat}
                onClick={() => playMove(index)}
                aria-label={`Cell ${index + 1}`}
              >
                <span className="cell-mark">{mark}</span>
                {!mark ? <span className="cell-index">{index + 1}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {postMatchOpen ? (
        <div className="postmatch-modal">
          <div className="postmatch-card">
            <p className="section-eyebrow">Round Complete</p>
            <h3>
              {snapshot.status === "draw"
                ? "No winner this round"
                : snapshot.winner === myMark
                  ? "Victory confirmed"
                  : `${snapshot.winner} takes the round`}
            </h3>
            <div className="phase-badges">
              <span className="phase-badge">Playing as {username ?? "Player"}</span>
              <span className="phase-badge">Room closes in {postMatchCountdown}s</span>
            </div>
            <p className="subtle">
              Review the result, confirm a rematch to stay paired with the same opponent,
              or head back to Home. If nobody responds, this room clears automatically in {postMatchCountdown}s.
            </p>
            <div className="mini-stats postmatch-stats">
              <div className="mini-stat-card">
                <span>Final state</span>
                <strong>{snapshot.status}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Winner</span>
                <strong>{snapshot.winner || "Draw"}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Moves played</span>
                <strong>{snapshot.moveNumber}</strong>
              </div>
              <div className="mini-stat-card">
                <span>Duration</span>
                <strong>{roundDurationSeconds}s</strong>
              </div>
              <div className="mini-stat-card">
                <span>Rematch votes</span>
                <strong>{rematchReady}/{playerCount || 2}</strong>
              </div>
            </div>
            <div className="match-actions">
              <button className="primary" onClick={rematch} disabled={busy}>
                Confirm Rematch
              </button>
              <button className="secondary" onClick={dismissPostMatch}>
                Acknowledge And Exit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
