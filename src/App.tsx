import { useEffect, useMemo, useRef, useState } from "react";

import { GamePanel } from "./components/GamePanel";
import { IntelPanel } from "./components/IntelPanel";
import { LobbyPanel } from "./components/LobbyPanel";
import { StatusPanel } from "./components/StatusPanel";
import {
  bootstrapSession,
  clearStoredMatchId,
  createMatch as createMatchRpc,
  emptySnapshot,
  formatError,
  getStoredMatchId,
  getStoredPlayerName,
  joinMatch as joinMatchRpc,
  loadLeaderboard,
  loadOpenMatches,
  quickMatch as quickMatchRpc,
  reconnectLabel,
  refreshClock,
  sendMove,
  updatePlayerName,
} from "./lib/nakama";
import type {
  AvailableMatch,
  LeaderboardEntry,
  MatchMode,
  Seat,
  SessionBundle,
  Snapshot,
} from "./types";

type Screen = "home" | "match" | "intel";

function App() {
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [matchIdInput, setMatchIdInput] = useState(getStoredMatchId());
  const [activeMatchId, setActiveMatchId] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [selectedMode, setSelectedMode] = useState<MatchMode>("classic");
  const [availableMatches, setAvailableMatches] = useState<AvailableMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clock, setClock] = useState(Date.now());
  const [screen, setScreen] = useState<Screen>("home");
  const [postMatchOpen, setPostMatchOpen] = useState(false);
  const [postMatchDeadline, setPostMatchDeadline] = useState(0);
  const [roundStartedAt, setRoundStartedAt] = useState(0);
  const [playerNameInput, setPlayerNameInput] = useState(getStoredPlayerName());
  const previousStatusRef = useRef(snapshot.status);
  const previousTurnRef = useRef(snapshot.currentTurn);

  useEffect(() => refreshClock(setClock), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBusy(true);
      setError("");

      try {
        const nextBundle = await bootstrapSession(
          (nextSnapshot) => setSnapshot(nextSnapshot),
          () => {
            setConnected(false);
            setError("Socket disconnected. Refresh to reconnect.");
          },
        );

        if (!cancelled) {
          setBundle(nextBundle);
          if (!getStoredPlayerName()) {
            setPlayerNameInput(nextBundle.username);
          }
          setConnected(true);
          const storedMatchId = getStoredMatchId();
          if (storedMatchId) {
            setActiveMatchId(storedMatchId);
            setMatchIdInput(storedMatchId);
            setScreen("match");
            setSnapshot(emptySnapshot());
            try {
              await joinMatchRpc(nextBundle, storedMatchId);
            } catch {
              clearStoredMatchId();
              setActiveMatchId("");
              setMatchIdInput("");
              setScreen("home");
            }
          }
          void refreshOpenMatches(nextBundle);
          void refreshLeaderboard(nextBundle);
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(formatError(bootstrapError, "Unable to connect to Nakama."));
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const mySeat = useMemo(() => {
    if (!bundle) return undefined;
    return snapshot.players.find((player) => player.userId === bundle.userId);
  }, [bundle, snapshot.players]);

  const opponentSeat = useMemo<Seat | undefined>(() => {
    if (!bundle) return undefined;
    return snapshot.players.find((player) => player.userId !== bundle.userId);
  }, [bundle, snapshot.players]);

  const canPlay = Boolean(
    bundle &&
      mySeat &&
      snapshot.status === "active" &&
      mySeat.mark === snapshot.currentTurn,
  );

  const postMatchCountdown = postMatchDeadline
    ? Math.max(0, Math.ceil((postMatchDeadline - clock) / 1000))
    : 0;

  const roundDurationSeconds = roundStartedAt
    ? Math.max(0, Math.round((clock - roundStartedAt) / 1000))
    : 0;

  async function refreshOpenMatches(nextBundle = bundle) {
    if (!nextBundle) return;
    try {
      setAvailableMatches(await loadOpenMatches(nextBundle));
    } catch {
      setAvailableMatches([]);
    }
  }

  async function refreshLeaderboard(nextBundle = bundle) {
    if (!nextBundle) return;
    try {
      setLeaderboard(await loadLeaderboard(nextBundle));
    } catch {
      setLeaderboard([]);
    }
  }

  async function createMatch() {
    if (!bundle) return;
    setBusy(true);
    setError("");
    try {
      const response = await createMatchRpc(bundle, selectedMode);
      await joinMatch(response.matchId);
    } catch (createError) {
      setError(formatError(createError, "Unable to create match."));
    } finally {
      setBusy(false);
    }
  }

  async function quickMatch() {
    await quickMatchForMode(selectedMode);
  }

  async function quickMatchForMode(mode: MatchMode) {
    if (!bundle) return;
    setBusy(true);
    setError("");
    try {
      const visibleMatches = await loadOpenMatches(bundle);
      const reusableMatch = visibleMatches.find(
        (match) => match.mode === mode && match.size < 2,
      );

      if (reusableMatch) {
        await joinMatch(reusableMatch.id);
        return;
      }

      const response = await quickMatchRpc(bundle, mode);
      await joinMatch(response.matchId);
    } catch (quickMatchError) {
      setError(formatError(quickMatchError, "Unable to find a match."));
    } finally {
      setBusy(false);
    }
  }

  async function joinMatch(matchIdArg?: string) {
    if (!bundle) return;

    const nextMatchId = (matchIdArg ?? matchIdInput).trim();
    if (!nextMatchId) {
      setError("Enter a match ID first.");
      return;
    }

    setBusy(true);
    setError("");
    setSnapshot(emptySnapshot());

    try {
      await joinMatchRpc(bundle, nextMatchId);
      setActiveMatchId(nextMatchId);
      setMatchIdInput(nextMatchId);
      setScreen("match");
      await refreshOpenMatches();
      await refreshLeaderboard();
    } catch (joinError) {
      setError(formatError(joinError, "Unable to join match."));
    } finally {
      setBusy(false);
    }
  }

  async function playMove(index: number) {
    if (!bundle || !activeMatchId || !canPlay || snapshot.board[index] !== "") {
      return;
    }

    try {
      await sendMove(bundle, activeMatchId, index);
    } catch (moveError) {
      setError(formatError(moveError, "Unable to send move."));
    }
  }

  async function savePlayerName() {
    if (!bundle) return;
    setBusy(true);
    setError("");
    try {
      const username = await updatePlayerName(bundle, playerNameInput);
      setBundle({
        ...bundle,
        username,
      });
    } catch (saveError) {
      setError(formatError(saveError, "Unable to save player name."));
    } finally {
      setBusy(false);
    }
  }

  function resetToHome() {
    clearStoredMatchId();
    setActiveMatchId("");
    setMatchIdInput("");
    setSnapshot(emptySnapshot());
    setPostMatchOpen(false);
    setPostMatchDeadline(0);
    setRoundStartedAt(0);
    setScreen("home");
  }

  async function rematch() {
    const nextMode = snapshot.mode || selectedMode;
    resetToHome();
    setSelectedMode(nextMode);
    await quickMatchForMode(nextMode);
  }

  useEffect(() => {
    if (activeMatchId && !roundStartedAt && (snapshot.status === "active" || snapshot.status === "waiting")) {
      setRoundStartedAt(Date.now());
    }

    if (!activeMatchId) {
      setRoundStartedAt(0);
    }
  }, [activeMatchId, roundStartedAt, snapshot.status]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const roundEnded = snapshot.status === "won" || snapshot.status === "draw";
    const newlyEnded = roundEnded && previousStatus !== snapshot.status;

    if (newlyEnded) {
      setPostMatchOpen(true);
      setPostMatchDeadline(Date.now() + 12000);
    }

    previousStatusRef.current = snapshot.status;
  }, [snapshot.status]);

  useEffect(() => {
    if (!postMatchOpen || !postMatchDeadline) return;
    if (clock >= postMatchDeadline) {
      resetToHome();
    }
  }, [clock, postMatchDeadline, postMatchOpen]);

  useEffect(() => {
    const audioContextCtor =
      window.AudioContext ||
      // @ts-expect-error webkit fallback
      window.webkitAudioContext;

    if (!audioContextCtor) return;

    function playTone(
      frequency: number,
      durationMs: number,
      type: OscillatorType,
      gainValue: number,
      delayMs = 0,
    ) {
      const context = new audioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = gainValue;
      oscillator.connect(gain);
      gain.connect(context.destination);
      const startAt = context.currentTime + delayMs / 1000;
      oscillator.start(startAt);
      oscillator.stop(startAt + durationMs / 1000);
      oscillator.onended = () => {
        void context.close();
      };
    }

    const previousTurn = previousTurnRef.current;
    if (
      mySeat &&
      snapshot.status === "active" &&
      snapshot.currentTurn === mySeat.mark &&
      previousTurn !== snapshot.currentTurn
    ) {
      playTone(660, 90, "triangle", 0.02);
    }

    if (snapshot.status === "won" && previousStatusRef.current !== "won") {
      if (mySeat?.mark === snapshot.winner) {
        playTone(660, 80, "triangle", 0.018);
        playTone(880, 130, "triangle", 0.018, 110);
      } else {
        playTone(220, 180, "sawtooth", 0.015);
      }
    }

    if (snapshot.status === "draw" && previousStatusRef.current !== "draw") {
      playTone(420, 140, "sine", 0.015);
    }

    previousTurnRef.current = snapshot.currentTurn;
  }, [mySeat, snapshot.currentTurn, snapshot.status, snapshot.winner]);

  const showMatchScreen = screen === "match" || Boolean(activeMatchId);

  return (
    <div className="shell">
      <StatusPanel
        connected={connected}
        username={bundle?.username}
        snapshot={snapshot}
        selectedMode={selectedMode}
        clock={clock}
        activeMatchId={activeMatchId}
        myMark={mySeat?.mark}
        opponentName={opponentSeat?.username}
      />

      <section className="panel command-center">
        <div className="command-head">
          <div>
            <p className="section-eyebrow">Control Center</p>
            <h2>Pick a screen and move through the round like a real multiplayer flow.</h2>
          </div>
          <div className="screen-tabs" role="tablist" aria-label="Main screens">
            <button
              className={screen === "home" ? "secondary selected" : "secondary"}
              onClick={() => setScreen("home")}
            >
              Home
            </button>
            <button
              className={showMatchScreen ? "secondary selected" : "secondary"}
              onClick={() => setScreen("match")}
            >
              Match
            </button>
            <button
              className={screen === "intel" ? "secondary selected" : "secondary"}
              onClick={() => setScreen("intel")}
            >
              Intel
            </button>
          </div>
        </div>

        <div className="command-strip">
          <div className="command-chip">
            <span>Session</span>
            <strong>{bundle?.username ?? "Connecting..."}</strong>
          </div>
          <div className="command-chip">
            <span>You are</span>
            <strong>{mySeat?.mark ?? "Not seated"}</strong>
          </div>
          <div className="command-chip">
            <span>Opponent</span>
            <strong>{opponentSeat?.username ?? "Waiting..."}</strong>
          </div>
          <div className="command-chip">
            <span>Active match</span>
            <strong>{activeMatchId || "None"}</strong>
          </div>
        </div>
      </section>

      {screen === "home" ? (
        <LobbyPanel
          username={bundle?.username}
          playerNameInput={playerNameInput}
          setPlayerNameInput={setPlayerNameInput}
          savePlayerName={() => void savePlayerName()}
          connected={connected}
          busy={busy}
          bundleReady={Boolean(bundle)}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          createMatch={() => void createMatch()}
          quickMatch={() => void quickMatch()}
          refreshMatches={() => void refreshOpenMatches()}
          refreshLeaderboard={() => void refreshLeaderboard()}
          matchIdInput={matchIdInput}
          setMatchIdInput={setMatchIdInput}
          joinMatch={(matchId) => void joinMatch(matchId)}
          activeMatchId={activeMatchId}
          myMark={mySeat?.mark ?? "-"}
          reconnectValue={reconnectLabel(snapshot.reconnectDeadlineMs, clock)}
          players={snapshot.players}
          availableMatches={availableMatches}
          leaderboard={leaderboard}
          error={error}
        />
      ) : null}

      {showMatchScreen && screen !== "intel" ? (
        <GamePanel
          activeMatchId={activeMatchId}
          connected={connected}
          snapshot={snapshot}
          myMark={mySeat?.mark}
          username={bundle?.username}
          opponentName={opponentSeat?.username}
          canPlay={canPlay}
          playMove={(index) => void playMove(index)}
          returnHome={resetToHome}
          roundDurationSeconds={roundDurationSeconds}
          postMatchOpen={postMatchOpen}
          postMatchCountdown={postMatchCountdown}
          dismissPostMatch={resetToHome}
          rematch={() => void rematch()}
          busy={busy}
        />
      ) : null}

      {screen === "intel" ? (
        <IntelPanel
          availableMatches={availableMatches}
          leaderboard={leaderboard}
          refreshMatches={() => void refreshOpenMatches()}
          refreshLeaderboard={() => void refreshLeaderboard()}
          joinMatch={(matchId) => void joinMatch(matchId)}
          bundleReady={Boolean(bundle)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

export default App;
