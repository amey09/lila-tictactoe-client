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
          <p className="section-eyebrow">Match Setup</p>
          <h2>Start a round</h2>
          <p className="subtle">
            New here? Pick a mode, then press Quick Match. If a room is already open,
            you will be dropped straight into it.
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

      <div className="lobby-actions">
        <button className="primary" onClick={createMatch} disabled={busy || !bundleReady}>
          Create a Private Match
        </button>
        <button className="primary" onClick={quickMatch} disabled={busy || !bundleReady}>
          Quick Match
        </button>
        <button className="secondary" onClick={refreshMatches} disabled={busy || !bundleReady}>
          Refresh Open Matches
        </button>
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

      <div className="info-grid">
        <div className="info-card">
          <p className="section-eyebrow">Current Seat</p>
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
          <div className="helper-list">
            <p>
              <strong>1.</strong> Choose a mode.
            </p>
            <p>
              <strong>2.</strong> Use Quick Match for the fastest start.
            </p>
            <p>
              <strong>3.</strong> When your mark is shown and it is your turn, tap an empty square.
            </p>
          </div>
        </div>
      </div>

      <div className="open-matches">
        <div className="leaderboard-head">
          <div>
            <p className="section-eyebrow">Join Existing Rooms</p>
            <h2>Open Matches</h2>
          </div>
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
                <strong>{match.mode} · {match.size}/2</strong>
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
                  {entry.wins}W {entry.losses}L {entry.draws}D · streak {entry.winStreak}
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
