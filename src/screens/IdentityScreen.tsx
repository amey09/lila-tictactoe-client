export function IdentityScreen(props: {
  connected: boolean;
  busy: boolean;
  currentIdentity?: string;
  playerNameInput: string;
  setPlayerNameInput: (value: string) => void;
  continueWithName: () => void;
  error: string;
}) {
  const {
    connected,
    busy,
    currentIdentity,
    playerNameInput,
    setPlayerNameInput,
    continueWithName,
    error,
  } = props;

  return (
    <section className="panel identity-screen">
      <div className="identity-hero">
        <div className="identity-brand-lockup">
          <span className="identity-brand">LILA</span>
          <span className="identity-brand-mark" aria-hidden="true" />
          <span className="identity-brand">TACTICAL GRID</span>
        </div>
        <p className="section-eyebrow">Enter The Arena</p>
        <h1>Claim your callsign. Then queue for the next round.</h1>
        <p className="lede">
          This should feel like a compact competitive game loop, not an assignment screen.
          Lock your visible identity first, then move through queue, live round, result,
          and rematch without friction.
        </p>
        <div className="identity-tags">
          <span className="phase-badge">Fast queue</span>
          <span className="phase-badge">Authoritative match</span>
          <span className="phase-badge">Rematch loop</span>
        </div>
      </div>

      <div className="identity-card-large">
        <p className="section-eyebrow">Player Identity</p>
        <h2>Choose the name other players will actually remember</h2>
        <p className="subtle">
          Your device keeps the underlying account stable. This name is the visible handle
          that follows you through queue, match, reconnect, rematch, and leaderboard.
        </p>

        <div className="identity-form">
          <input
            value={playerNameInput}
            onChange={(event) => setPlayerNameInput(event.target.value)}
            placeholder="Enter your player name"
            maxLength={24}
          />
          <button className="primary" onClick={continueWithName} disabled={busy}>
            Continue
          </button>
        </div>

        <div className="identity-meta">
          <div className="command-chip">
            <span>Connection</span>
            <strong>{connected ? "Online" : "Connecting..."}</strong>
          </div>
          <div className="command-chip">
            <span>Current account</span>
            <strong>{currentIdentity ?? "Connecting..."}</strong>
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </div>
    </section>
  );
}
