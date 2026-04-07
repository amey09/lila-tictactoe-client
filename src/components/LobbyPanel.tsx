import type { AvailableMatch, LeaderboardEntry, MatchMode, Seat } from "../types";

function Meta(props: { label: string; value: string }) {
  return (
    <p className="meta">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </p>
  );
}

export function LobbyPanel(props: {
  busy: boolean;
  bundleReady: boolean;
  selectedMode: MatchMode;
  setSelectedMode: (mode: MatchMode) => void;
  createMatch: () => void;
  quickMatch: () => void;
  refreshMatches: () => void;
  refreshLeaderboard: () => void;
  matchIdInput: string;
  setMatchIdInput: (value: string) => void;
  joinMatch: (matchId?: string) => void;
  activeMatchId: string;
  myMark: string;
  reconnectValue: string;
  players: Seat[];
  availableMatches: AvailableMatch[];
  leaderboard: LeaderboardEntry[];
  error: string;
}) {
  const {
    busy,
    bundleReady,
    selectedMode,
    setSelectedMode,
    createMatch,
    quickMatch,
    refreshMatches,
    refreshLeaderboard,
    matchIdInput,
    setMatchIdInput,
    joinMatch,
    activeMatchId,
    myMark,
    reconnectValue,
    players,
    availableMatches,
    leaderboard,
    error,
  } = props;

  return (
    <section className="panel lobby">
      <div className="section-head">
        <div>
          <p className="section-eyebrow">Home</p>
          <h2>Get into a match fast</h2>
          <p className="subtle">
            Use Quick Match if you just want to play. Use a private room only when you
            already know who should join and want to share a match ID.
          </p>
        </div>

        <div className="mode-picker">
          <button
            className={selectedMode === "classic" ? "secondary selected" : "secondary"}
            onClick={() => setSelectedMode("classic")}
            disabled={busy}
          >
            <span>Classic</span>
            <small>Play without a timer</small>
          </button>
          <button
            className={selectedMode === "timed" ? "secondary selected" : "secondary"}
            onClick={() => setSelectedMode("timed")}
            disabled={busy}
          >
            <span>Timed</span>
            <small>30 seconds per move</small>
          </button>
        </div>
      </div>

      <div className="ops-grid">
        <div className="ops-card ops-card-primary">
          <p className="section-eyebrow">Fastest Path</p>
          <h3>Quick Match</h3>
          <p className="subtle">
            Finds an open room in the selected mode first. If none exist, it creates one
            and seats you automatically.
          </p>
          <button className="primary" onClick={quickMatch} disabled={busy || !bundleReady}>
            Enter Queue
          </button>
        </div>

        <div className="ops-card">
          <p className="section-eyebrow">Private Room</p>
          <h3>Create a shareable match</h3>
          <p className="subtle">
            Start your own room, then send the match ID to another player so they can join directly.
          </p>
          <button
            className="secondary action-button"
            onClick={createMatch}
            disabled={busy || !bundleReady}
          >
            Create Private Match
          </button>
        </div>

        <div className="ops-card">
          <p className="section-eyebrow">Direct Join</p>
          <h3>Paste a match ID</h3>
          <p className="subtle">
            This is best when a friend already created a room and shared the exact match ID.
          </p>
          <div className="join-group">
            <input
              value={matchIdInput}
              onChange={(event) => setMatchIdInput(event.target.value)}
              placeholder="Paste a match ID to join directly"
            />
            <button onClick={() => joinMatch()} disabled={busy || !bundleReady}>
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <p className="section-eyebrow">Current Seat</p>
          <h3>What the server thinks right now</h3>
          <div className="match-meta">
            <Meta label="Active match" value={activeMatchId || "Not joined yet"} />
            <Meta label="Your mark" value={myMark || "Waiting for seat"} />
            <Meta label="Reconnect timer" value={reconnectValue} />
            <Meta
              label="Players"
              value={
                players.length
                  ? players.map((player) => `${player.username} (${player.mark})`).join(", ")
                  : "Waiting for another player"
              }
            />
          </div>
        </div>

        <div className="info-card">
          <p className="section-eyebrow">How It Works</p>
          <h3>Read this once, then just play</h3>
          <div className="helper-list">
            <p>
              <strong>1.</strong> Choose a mode.
            </p>
            <p>
              <strong>2.</strong> Use Quick Match to get seated with the fewest clicks.
            </p>
            <p>
              <strong>3.</strong> When your mark appears, switch to the Match screen and play only when it is your turn.
            </p>
          </div>
        </div>
      </div>

      <div className="open-matches">
        <div className="leaderboard-head">
          <div>
            <p className="section-eyebrow">Browser</p>
            <h2>Open Matches</h2>
          </div>
          <button className="secondary" onClick={refreshMatches} disabled={busy || !bundleReady}>
            Refresh Open Matches
          </button>
        </div>

        {availableMatches.length ? (
          <div className="stack-list">
            {availableMatches.map((match) => (
              <button
                key={match.id}
                className="match-row"
                onClick={() => joinMatch(match.id)}
              >
                <span>{match.id}</span>
                <strong>{match.mode} | {match.size}/2</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="subtle">No open matches right now. Create one or try Quick Match.</p>
        )}
      </div>

      <div className="open-matches leaderboard-block">
        <div className="leaderboard-head">
          <div>
            <p className="section-eyebrow">Standings</p>
            <h2>Leaderboard</h2>
          </div>
          <button className="secondary" onClick={refreshLeaderboard} disabled={!bundleReady}>
            Refresh
          </button>
        </div>

        {leaderboard.length ? (
          <div className="stack-list">
            {leaderboard.map((entry) => (
              <div key={entry.userId} className="match-row leaderboard-row">
                <span>
                  #{entry.rank} {entry.username || entry.userId.slice(0, 8)}
                </span>
                <strong>
                  {entry.wins}W {entry.losses}L {entry.draws}D | streak {entry.winStreak}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="subtle">Finish a few rounds and the leaderboard will populate here.</p>
        )}
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
