import { statusCopy } from "../lib/nakama";
import type { Mark, Snapshot } from "../types";

export function GamePanel(props: {
  snapshot: Snapshot;
  myMark?: Mark;
  canPlay: boolean;
  playMove: (index: number) => void;
}) {
  const { snapshot, myMark, canPlay, playMove } = props;

  return (
    <section className="panel game">
      <div className="game-copy">
        <p className="section-eyebrow">Board</p>
        <h2>Play only when it is your turn</h2>
        <p>{statusCopy(snapshot, myMark)}</p>
        <p className="subtle">
          If the square is empty and your turn indicator matches your mark, tap to submit that move.
          The board updates only after the server accepts it.
        </p>
      </div>

      <div className="board-wrap">
        <div className="board-frame">
          <div className="board">
            {snapshot.board.map((mark, index) => (
              <button
                key={index}
                className="cell"
                disabled={!canPlay || mark !== ""}
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
    </section>
  );
}
