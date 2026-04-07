import { GamePanel } from "../components/GamePanel";
import type { MatchEvent, Mark, Snapshot } from "../types";

export function MatchScreen(props: {
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
  postMatchDurationSeconds: number;
  postMatchOpen: boolean;
  postMatchCountdown: number;
  dismissPostMatch: () => void;
  rematch: () => void;
  busy: boolean;
  rematchVotes: string[];
  playerCount: number;
  toast: MatchEvent | null;
}) {
  return <GamePanel {...props} />;
}
