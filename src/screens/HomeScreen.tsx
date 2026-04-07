import { StatusPanel } from "../components/StatusPanel";
import type { MatchMode, Snapshot } from "../types";

export function HomeScreen(props: {
  connected: boolean;
  username?: string;
  snapshot: Snapshot;
  selectedMode: MatchMode;
  setSelectedMode: (mode: MatchMode) => void;
  clock: number;
  activeMatchId: string;
  myMark?: string;
  opponentName?: string;
  playerNameInput: string;
  setPlayerNameInput: (value: string) => void;
  savePlayerName: () => void;
  matchIdInput: string;
  setMatchIdInput: (value: string) => void;
  joinRoom: () => void;
  busy: boolean;
  playNow: () => void;
  createPrivateMatch: () => void;
  openLeaderboard: () => void;
  lastResult?: {
    result: string;
    durationSeconds: number;
    moveNumber: number;
    mode: MatchMode;
  } | null;
  error: string;
}) {
  const {
    connected,
    username,
    snapshot,
    selectedMode,
    setSelectedMode,
    clock,
    activeMatchId,
    myMark,
    opponentName,
    playerNameInput,
    setPlayerNameInput,
    savePlayerName,
    matchIdInput,
    setMatchIdInput,
    joinRoom,
    busy,
    playNow,
    createPrivateMatch,
    openLeaderboard,
    lastResult,
    error,
  } = props;

  return (
    <>
      <StatusPanel
        connected={connected}
        username={username}
        snapshot={snapshot}
        selectedMode={selectedMode}
        clock={clock}
        activeMatchId={activeMatchId}
        myMark={myMark}
        opponentName={opponentName}
      />

      <section className="panel home-screen">
        <div className="section-head">
          <div>
            <p className="section-eyebrow">Home</p>
            <h2>One more round should always feel like the obvious next step.</h2>
            <p className="subtle">
              The product loop starts here: pick a mode, jump into queue, finish a round,
              and come back wanting one more.
            </p>
          </div>

          <div className="mode-picker">
            <button
              className={selectedMode === "classic" ? "secondary selected" : "secondary"}
              onClick={() => setSelectedMode("classic")}
            >
              <span>Classic</span>
              <small>Slower reads, no move timer</small>
            </button>
            <button
              className={selectedMode === "timed" ? "secondary selected" : "secondary"}
              onClick={() => setSelectedMode("timed")}
            >
              <span>Timed</span>
              <small>Pressure every move</small>
            </button>
          </div>
        </div>

        <div className="home-actions-grid">
          <button className="home-cta home-cta-primary" onClick={playNow}>
            <span className="section-eyebrow">Primary Action</span>
            <strong>Play Now</strong>
            <small>Queue immediately in the selected mode and get back into the loop fast.</small>
          </button>

          <button className="home-cta" onClick={createPrivateMatch}>
            <span className="section-eyebrow">Private Match</span>
            <strong>Create Room</strong>
            <small>Generate a room and share the match ID with a friend.</small>
          </button>

          <button className="home-cta" onClick={openLeaderboard}>
            <span className="section-eyebrow">Progress</span>
            <strong>Leaderboard</strong>
            <small>Check standings, streaks, and who is ahead.</small>
          </button>
        </div>

        <div className="home-loop-grid">
          <div className="ops-card">
            <p className="section-eyebrow">Player Identity</p>
            <h3>Change your visible name any time</h3>
            <p className="subtle">
              Your visible name should stay editable after onboarding. Update it here and carry it into queue, match, and leaderboard.
            </p>
            <div className="join-group profile-group">
              <input
                value={playerNameInput}
                onChange={(event) => setPlayerNameInput(event.target.value)}
                placeholder="Enter your player name"
                maxLength={24}
              />
              <button onClick={savePlayerName} disabled={busy}>
                Save Name
              </button>
            </div>
            <p className="subtle profile-meta">
              Current identity: <strong>{username ?? "Connecting..."}</strong> | Connection: <strong>{connected ? "Online" : "Offline"}</strong>
            </p>
          </div>

          <div className="ops-card">
            <p className="section-eyebrow">Direct Join</p>
            <h3>Paste a room ID and join immediately</h3>
            <p className="subtle">
              Quick Match stays primary, but room ID entry should remain visible for players who already know where they want to go.
            </p>
            <div className="join-group profile-group">
              <input
                value={matchIdInput}
                onChange={(event) => setMatchIdInput(event.target.value)}
                placeholder="Paste a match ID"
              />
              <button onClick={joinRoom} disabled={busy}>
                Join Room
              </button>
            </div>
          </div>

          <div className="ops-card">
            <p className="section-eyebrow">Next Best Action</p>
            <h3>{lastResult ? "The cleanest next move is another round." : "Start with a quick match."}</h3>
            <p className="subtle">
              {lastResult
                ? "The product should keep the player moving. Don't stop on analysis when a fresh round is one click away."
                : "A first-time player should be able to understand the loop immediately: pick mode, queue, play, rematch."}
            </p>
            <div className="phase-badges">
              <span className="phase-badge">Mode: {selectedMode}</span>
              <span className="phase-badge">{connected ? "Server online" : "Connecting..."}</span>
            </div>
          </div>

          <div className="ops-card">
            <p className="section-eyebrow">Last Round</p>
            <h3>{lastResult ? lastResult.result : "No rounds finished yet"}</h3>
            <p className="subtle">
              {lastResult
                ? "Use the last result as momentum. Wins should feel repeatable, losses should feel immediately answerable."
                : "Once you finish a round, the latest result summary will appear here."}
            </p>
            {lastResult ? (
              <div className="mini-stats compact-stats">
                <div className="mini-stat-card">
                  <span>Mode</span>
                  <strong>{lastResult.mode}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Moves</span>
                  <strong>{lastResult.moveNumber}</strong>
                </div>
                <div className="mini-stat-card">
                  <span>Duration</span>
                  <strong>{lastResult.durationSeconds}s</strong>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </section>
    </>
  );
}
