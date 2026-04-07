import type { AvailableMatch, LeaderboardEntry } from "../types";

export function LeaderboardScreen(props: {
  availableMatches: AvailableMatch[];
  leaderboard: LeaderboardEntry[];
  refreshMatches: () => void;
  refreshLeaderboard: () => void;
  joinMatch: (matchId: string) => void;
  backHome: () => void;
  busy: boolean;
  bundleReady: boolean;
}) {
  const {
    availableMatches,
    leaderboard,
    refreshMatches,
    refreshLeaderboard,
    joinMatch,
    backHome,
    busy,
    bundleReady,
  } = props;

  return (
    <section className="panel leaderboard-screen">
      <div className="section-head">
        <div>
          <p className="section-eyebrow">Leaderboard</p>
          <h2>Standings, streaks, and open rooms live here.</h2>
          <p className="subtle">
            This screen is progression and discovery, not the place new players should land first.
          </p>
        </div>
        <button className="secondary" onClick={backHome}>
          Back Home
        </button>
      </div>

      <div className="open-matches">
        <div className="leaderboard-head">
          <div>
            <p className="section-eyebrow">Open Rooms</p>
            <h2>Join Existing Matches</h2>
          </div>
          <button className="secondary" onClick={refreshMatches} disabled={busy || !bundleReady}>
            Refresh Open Matches
          </button>
        </div>

        {availableMatches.length ? (
          <div className="stack-list">
            {availableMatches.map((match) => (
              <button key={match.id} className="match-row" onClick={() => joinMatch(match.id)}>
                <span>{match.id}</span>
                <strong>{match.mode} | {match.size}/2</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="subtle">No open matches right now. Queue from Home to create momentum.</p>
        )}
      </div>

      <div className="open-matches leaderboard-block">
        <div className="leaderboard-head">
          <div>
            <p className="section-eyebrow">Standings</p>
            <h2>Top Players</h2>
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
          <p className="subtle">No leaderboard data yet. Finish some rounds and come back.</p>
        )}
      </div>
    </section>
  );
}
