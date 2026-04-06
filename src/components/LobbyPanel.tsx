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
      <div className="mode-picker">
        <button
          className={selectedMode === "classic" ? "secondary selected" : "secondary"}
          onClick={() => setSelectedMode("classic")}
          disabled={busy}
        >
          Classic
        </button>
        <button
          className={selectedMode === "timed" ? "secondary selected" : "secondary"}
          onClick={() => setSelectedMode("timed")}
          disabled={busy}
        >
          Timed
        </button>
      </div>

      <div className="lobby-actions">
        <button className="primary" onClick={createMatch} disabled={busy || !bundleReady}>
          Create Match
        </button>
        <button className="primary" onClick={quickMatch} disabled={busy || !bundleReady}>
          Quick Match
        </button>
        <button className="secondary" onClick={refreshMatches} disabled={busy || !bundleReady}>
          Refresh Matches
        </button>
        <div className="join-group">
          <input
            value={matchIdInput}
            onChange={(event) => setMatchIdInput(event.target.value)}
            placeholder="Paste match ID"
          />
          <button onClick={() => joinMatch()} disabled={busy || !bundleReady}>
            Join
          </button>
        </div>
      </div>

      <div className="match-meta">
        <Meta label="Active match" value={activeMatchId || "Not joined"} />
        <Meta label="Your mark" value={myMark || "-"} />
        <Meta label="Reconnect" value={reconnectValue} />
        <Meta
          label="Players"
          value={
            players.length
              ? players.map((player) => `${player.username} (${player.mark})`).join(", ")
              : "Waiting for players"
          }
        />
      </div>

      <div className="open-matches">
        <h2>Open Matches</h2>
        {availableMatches.length ? (
          availableMatches.map((match) => (
            <button
              key={match.id}
              className="match-row"
              onClick={() => joinMatch(match.id)}
            >
              <span>{match.id}</span>
              <strong>{match.mode} • {match.size}/2</strong>
            </button>
          ))
        ) : (
          <p className="subtle">No open authoritative matches listed yet.</p>
        )}
      </div>

      <div className="open-matches">
        <div className="leaderboard-head">
          <h2>Leaderboard</h2>
          <button className="secondary" onClick={refreshLeaderboard} disabled={!bundleReady}>
            Refresh
          </button>
        </div>
        {leaderboard.length ? (
          leaderboard.map((entry) => (
            <div key={entry.userId} className="match-row leaderboard-row">
              <span>
                #{entry.rank} {entry.username || entry.userId.slice(0, 8)}
              </span>
              <strong>
                {entry.wins}W {entry.losses}L {entry.draws}D • streak {entry.winStreak}
              </strong>
            </div>
          ))
        ) : (
          <p className="subtle">No leaderboard records yet.</p>
        )}
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
