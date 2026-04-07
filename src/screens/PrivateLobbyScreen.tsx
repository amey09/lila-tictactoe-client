import type { Seat } from "../types";

export function PrivateLobbyScreen(props: {
  activeMatchId: string;
  players: Seat[];
  myMark?: string;
  username?: string;
  opponentName?: string;
  copyMatchId: () => void;
  leaveLobby: () => void;
}) {
  const { activeMatchId, players, myMark, username, opponentName, copyMatchId, leaveLobby } =
    props;
  const ready = players.length >= 2;

  return (
    <section className="panel private-lobby-screen">
      <div className="section-head">
        <div>
          <p className="section-eyebrow">Private Lobby</p>
          <h2>Hold the room until your opponent joins.</h2>
          <p className="subtle">
            This is the social handoff state: you create, share the room, and wait until
            both seats are ready. As soon as the second player lands, the app should carry
            both of you into the round.
          </p>
        </div>
      </div>

      <div className="private-lobby-grid">
        <div className="ops-card room-card">
          <p className="section-eyebrow">Room ID</p>
          <h3>{activeMatchId}</h3>
          <p className="subtle">
            Share this with your friend if they are joining directly instead of using queue.
          </p>
          <div className="match-actions">
            <button className="primary" onClick={copyMatchId}>
              Copy Match ID
            </button>
            <button className="secondary" onClick={leaveLobby}>
              Leave Lobby
            </button>
          </div>
        </div>

        <div className="ops-card room-seat-card">
          <p className="section-eyebrow">Seat Status</p>
          <div className="duel-strip">
            <div className="duel-card identity-card">
              <span>You</span>
              <strong>{username ?? "Connecting..."}</strong>
              <small>{myMark ? `${myMark} seat assigned` : "Waiting for seat"}</small>
            </div>
            <div className="duel-card identity-card">
              <span>Opponent</span>
              <strong>{opponentName ?? "Waiting..."}</strong>
              <small>{opponentName ? "Ready to start" : "Invite still open"}</small>
            </div>
          </div>
          <p className="subtle">
            Players in room: {players.length}/2
          </p>
        </div>
      </div>

      <div className={`phase-card ${ready ? "phase-play" : "phase-waiting"}`}>
        <p className="section-eyebrow">Lobby State</p>
        <h3>{ready ? "Both players are in. Entering the round." : "Room is live. Waiting for the second player."}</h3>
        <p>
          {ready
            ? "The private lobby has done its job. The app should carry both players into the actual match."
            : "Share the room ID and keep this screen open. The goal is social clarity, not forcing players to understand backend concepts."}
        </p>
      </div>
    </section>
  );
}
