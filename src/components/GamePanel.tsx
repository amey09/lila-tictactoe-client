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
      <div className="board">
        {snapshot.board.map((mark, index) => (
          <button
            key={index}
            className="cell"
            disabled={!canPlay || mark !== ""}
            onClick={() => playMove(index)}
          >
            {mark || "."}
          </button>
        ))}
      </div>

      <div className="game-copy">
        <h2>Match State</h2>
        <p>{statusCopy(snapshot, myMark)}</p>
        <p className="subtle">
          Opcode `1` submits a move. Opcode `2` carries the authoritative board
          snapshot from Nakama.
        </p>
      </div>
    </section>
  );
}
