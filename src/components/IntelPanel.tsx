import type { AvailableMatch, LeaderboardEntry } from "../types";

export function IntelPanel(props: {
  availableMatches: AvailableMatch[];
  leaderboard: LeaderboardEntry[];
  refreshMatches: () => void;
  refreshLeaderboard: () => void;
  joinMatch: (matchId: string) => void;
  bundleReady: boolean;
  busy: boolean;
}) {
  const {
    availableMatches,
    leaderboard,
    refreshMatches,
    refreshLeaderboard,
    joinMatch,
    bundleReady,
    busy,
  } = props;

  return (
    <section className="panel lobby">
      <div className="section-head">
        <div>
          <p className="section-eyebrow">Intel</p>
          <h2>Read the room before you queue</h2>
          <p className="subtle">
            This screen is the match browser and standings view. Use it when you want to
            inspect active rooms or see who has been winning.
          </p>
        </div>
      </div>

      <div className="open-matches">
        <div className="leaderboard-head">
          <div>
            <p className="section-eyebrow">Match Browser</p>
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
          <p className="subtle">No open matches right now. Switch to Home and create one.</p>
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
    </section>
  );
}
