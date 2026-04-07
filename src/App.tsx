import { useEffect, useMemo, useRef, useState } from "react";

import {
  bootstrapSession,
  clearStoredMatchId,
  createMatch as createMatchRpc,
  emptySnapshot,
  formatError,
  getStoredMatchId,
  getStoredPlayerName,
  joinMatch as joinMatchRpc,
  leaveMatch as leaveMatchRpc,
  loadLeaderboard,
  loadOpenMatches,
  quickMatch as quickMatchRpc,
  refreshClock,
  sendRematchVote,
  sendMove,
} from "./lib/nakama";
import { HomeScreen } from "./screens/HomeScreen";
import { IdentityScreen } from "./screens/IdentityScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { PrivateLobbyScreen } from "./screens/PrivateLobbyScreen";
import { QueueScreen } from "./screens/QueueScreen";
import { RoundTransition } from "./components/RoundTransition";
import type {
  AvailableMatch,
  LeaderboardEntry,
  MatchEvent,
  MatchMode,
  Seat,
  SessionBundle,
  Snapshot,
} from "./types";

type AppScreen =
  | "identity"
  | "home"
  | "queue"
  | "privateLobby"
  | "match"
  | "leaderboard";

type QueueIntent = "quick" | "private" | "directJoin" | "rejoin" | null;
type LastResult = {
  result: string;
  durationSeconds: number;
  moveNumber: number;
  mode: MatchMode;
} | null;

function suggestAvailableName(base: string) {
  const trimmed = base.trim().slice(0, 18) || "Player";
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${trimmed}${suffix}`.slice(0, 24);
}

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
  const [appScreen, setAppScreen] = useState<AppScreen>(
    getStoredPlayerName().trim() ? "home" : "identity",
  );
  const [queueIntent, setQueueIntent] = useState<QueueIntent>(null);
  const [postMatchOpen, setPostMatchOpen] = useState(false);
  const [postMatchDeadline, setPostMatchDeadline] = useState(0);
  const [roundStartedAt, setRoundStartedAt] = useState(0);
  const [postMatchDurationSeconds, setPostMatchDurationSeconds] = useState(0);
  const [playerNameInput, setPlayerNameInput] = useState(getStoredPlayerName());
  const [toast, setToast] = useState<MatchEvent | null>(null);
  const [lastResult, setLastResult] = useState<LastResult>(null);
  const [transitionCard, setTransitionCard] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);
  const previousStatusRef = useRef(snapshot.status);
  const previousTurnRef = useRef(snapshot.currentTurn);
  const previousEventSequenceRef = useRef(0);
  const previousSeatRef = useRef(false);
  const suppressDisconnectRef = useRef(false);

  useEffect(() => refreshClock(setClock), []);

  const hasSavedIdentity = Boolean(getStoredPlayerName().trim());

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

  function handleDisconnect() {
    if (suppressDisconnectRef.current) {
      return;
    }
    setConnected(false);
    setError("Socket disconnected. Refresh to reconnect.");
  }

  async function establishSession(desiredUsername?: string) {
    return bootstrapSession((nextSnapshot) => setSnapshot(nextSnapshot), handleDisconnect, desiredUsername);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBusy(true);
      setError("");

      try {
        const nextBundle = await establishSession(getStoredPlayerName());

        if (cancelled) return;

        setBundle(nextBundle);
        setConnected(true);
        setPlayerNameInput(nextBundle.username);

        const storedMatchId = getStoredMatchId();
        if (storedMatchId) {
          setQueueIntent("rejoin");
          setActiveMatchId(storedMatchId);
          setMatchIdInput(storedMatchId);
          setSnapshot(emptySnapshot());
          setAppScreen("match");

          try {
            await joinMatchRpc(nextBundle, storedMatchId);
          } catch {
            clearStoredMatchId();
            setActiveMatchId("");
            setMatchIdInput("");
            setAppScreen(getStoredPlayerName().trim() ? "home" : "identity");
          }
        } else {
          setAppScreen(getStoredPlayerName().trim() ? "home" : "identity");
        }

        void refreshOpenMatches(nextBundle);
        void refreshLeaderboard(nextBundle);
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

  useEffect(() => {
    if (!bundle) return;

    if (!hasSavedIdentity) {
      setAppScreen("identity");
      return;
    }

    if (activeMatchId) {
      if (queueIntent === "private" && mySeat && snapshot.status === "waiting" && snapshot.players.length < 2) {
        setAppScreen("privateLobby");
        return;
      }

      if (mySeat) {
        setAppScreen("match");
        return;
      }

      if (appScreen !== "queue") {
        setAppScreen("queue");
      }
      return;
    }

    if (appScreen !== "leaderboard" && appScreen !== "home" && appScreen !== "identity") {
      setAppScreen("home");
    }
  }, [
    activeMatchId,
    appScreen,
    bundle,
    hasSavedIdentity,
    mySeat,
    queueIntent,
    snapshot.players.length,
    snapshot.status,
  ]);

  async function joinMatch(
    matchIdArg?: string,
    nextScreen: AppScreen = "match",
    nextIntent: QueueIntent = "directJoin",
  ) {
    if (!bundle) return;

    const nextMatchId = (matchIdArg ?? matchIdInput).trim();
    if (!nextMatchId) {
      setError("Enter a match ID first.");
      return;
    }

    setBusy(true);
    setError("");
    setSnapshot(emptySnapshot());
    setQueueIntent(nextIntent);
    setAppScreen(nextScreen);

    try {
      await joinMatchRpc(bundle, nextMatchId);
      setActiveMatchId(nextMatchId);
      setMatchIdInput(nextMatchId);
      await refreshOpenMatches();
      await refreshLeaderboard();
    } catch (joinError) {
      setError(formatError(joinError, "Unable to join match."));
      setAppScreen(hasSavedIdentity ? "home" : "identity");
    } finally {
      setBusy(false);
    }
  }

  async function createPrivateMatch() {
    if (!bundle) return;
    setBusy(true);
    setError("");
    setQueueIntent("private");
    setAppScreen("privateLobby");
    try {
      const response = await createMatchRpc(bundle, selectedMode);
      await joinMatch(response.matchId, "privateLobby", "private");
    } catch (createError) {
      setError(formatError(createError, "Unable to create match."));
      setAppScreen("home");
      setBusy(false);
    }
  }

  async function quickMatchForMode(mode: MatchMode) {
    if (!bundle) return;
    setBusy(true);
    setError("");
    setQueueIntent("quick");
    setAppScreen("queue");

    try {
      const visibleMatches = await loadOpenMatches(bundle);
      const reusableMatch = visibleMatches.find(
        (match) => match.mode === mode && match.size < 2,
      );

      if (reusableMatch) {
        await joinMatch(reusableMatch.id, "queue", "quick");
        return;
      }

      const response = await quickMatchRpc(bundle, mode);
      await joinMatch(response.matchId, "queue", "quick");
    } catch (quickMatchError) {
      setError(formatError(quickMatchError, "Unable to find a match."));
      setAppScreen("home");
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

    const normalized = playerNameInput.trim().slice(0, 24);
    if (!normalized) {
      setError("Enter a name before continuing.");
      setBusy(false);
      return;
    }

    const preservedMatchId = activeMatchId;
    const preservedIntent = queueIntent;
    const preservedScreen = appScreen;

    try {
      const nextBundle = await establishSession(normalized);
      suppressDisconnectRef.current = true;
      try {
        bundle.socket.disconnect(false);
      } catch {}

      setBundle(nextBundle);
      setConnected(true);
      setPlayerNameInput(nextBundle.username);

      if (preservedMatchId) {
        setSnapshot(emptySnapshot());
        await joinMatchRpc(nextBundle, preservedMatchId);
        setActiveMatchId(preservedMatchId);
        setMatchIdInput(preservedMatchId);
        setQueueIntent(preservedIntent);
        setAppScreen(preservedScreen === "identity" ? "home" : preservedScreen);
      } else {
        setAppScreen("home");
      }

      await refreshOpenMatches(nextBundle);
      await refreshLeaderboard(nextBundle);
    } catch (saveError) {
      const message = formatError(saveError, "Unable to save player name.");
      if (message.toLowerCase().includes("already in use")) {
        const suggestion = suggestAvailableName(normalized);
        setPlayerNameInput(suggestion);
        setError(`"${normalized}" is already taken. Try "${suggestion}" or edit the name.`);
      } else {
        setError(message);
      }
      setConnected(true);
    } finally {
      window.setTimeout(() => {
        suppressDisconnectRef.current = false;
      }, 1200);
      setBusy(false);
    }
  }

  async function resetToHome() {
    if (bundle && activeMatchId) {
      try {
        await leaveMatchRpc(bundle, activeMatchId);
      } catch {}
    } else {
      clearStoredMatchId();
    }

    setActiveMatchId("");
    setMatchIdInput("");
    setSnapshot(emptySnapshot());
    setQueueIntent(null);
    setPostMatchOpen(false);
    setPostMatchDeadline(0);
    setRoundStartedAt(0);
    setPostMatchDurationSeconds(0);
    setAppScreen(hasSavedIdentity ? "home" : "identity");
  }

  async function rematch() {
    if (!bundle || !activeMatchId) return;
    setBusy(true);
    setError("");
    try {
      await sendRematchVote(bundle, activeMatchId);
    } catch (rematchError) {
      setError(formatError(rematchError, "Unable to confirm rematch."));
    } finally {
      setBusy(false);
    }
  }

  function copyMatchId() {
    if (!activeMatchId) return;
    void navigator.clipboard?.writeText(activeMatchId);
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
      const finalDuration = roundStartedAt
        ? Math.max(0, Math.round((Date.now() - roundStartedAt) / 1000))
        : 0;
      setPostMatchDurationSeconds(
        finalDuration,
      );
      setLastResult({
        result:
          snapshot.status === "draw"
            ? "Draw"
            : snapshot.winner === mySeat?.mark
              ? "Victory"
              : `${snapshot.winner} won`,
        durationSeconds: finalDuration,
        moveNumber: snapshot.moveNumber,
        mode: snapshot.mode,
      });
      setPostMatchOpen(true);
      setPostMatchDeadline(Date.now() + 12000);
    }

    previousStatusRef.current = snapshot.status;
  }, [roundStartedAt, snapshot.status]);

  useEffect(() => {
    if (!postMatchOpen || !postMatchDeadline) return;
    if (clock >= postMatchDeadline) {
      void resetToHome();
    }
  }, [clock, postMatchDeadline, postMatchOpen]);

  useEffect(() => {
    const hadSeat = previousSeatRef.current;
    const hasSeatNow = Boolean(mySeat);

    if (!hadSeat && hasSeatNow && (queueIntent === "quick" || queueIntent === "private" || queueIntent === "directJoin")) {
      setTransitionCard({
        title: `${mySeat?.mark ?? "Seat"} locked in`,
        subtitle: opponentSeat?.username
          ? `Opponent ${opponentSeat.username} detected. Entering the board.`
          : "Seat assigned. Waiting for the round to fully spin up.",
      });
      const timer = window.setTimeout(() => setTransitionCard(null), 1400);
      previousSeatRef.current = hasSeatNow;
      return () => window.clearTimeout(timer);
    }

    previousSeatRef.current = hasSeatNow;
  }, [mySeat, opponentSeat?.username, queueIntent]);

  useEffect(() => {
    if (!snapshot.lastEvent || snapshot.eventSequence === previousEventSequenceRef.current) {
      return;
    }

    previousEventSequenceRef.current = snapshot.eventSequence;
    setToast(snapshot.lastEvent);

    if (snapshot.lastEvent.type === "rematch_started") {
      setPostMatchOpen(false);
      setPostMatchDeadline(0);
      setRoundStartedAt(Date.now());
      setPostMatchDurationSeconds(0);
      setAppScreen("match");
      setTransitionCard({
        title: "Rematch accepted",
        subtitle: "Same room. Same opponent. Fresh round.",
      });
      window.setTimeout(() => setTransitionCard(null), 1300);
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [snapshot.eventSequence, snapshot.lastEvent]);

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

    function playSequence(tones: Array<[number, number, OscillatorType, number, number?]>) {
      tones.forEach(([frequency, duration, type, gain, delay]) =>
        playTone(frequency, duration, type, gain, delay ?? 0),
      );
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

    if (snapshot.lastEvent?.type === "rematch_started") {
      playSequence([
        [520, 70, "triangle", 0.02, 0],
        [700, 90, "triangle", 0.02, 90],
        [920, 110, "triangle", 0.02, 200],
      ]);
    }

    if (snapshot.lastEvent?.type === "player_rejoined") {
      playSequence([
        [480, 70, "sine", 0.015, 0],
        [620, 70, "sine", 0.015, 85],
      ]);
    }

    if (snapshot.lastEvent?.type === "player_disconnected") {
      playTone(260, 120, "sawtooth", 0.012);
    }

    previousTurnRef.current = snapshot.currentTurn;
  }, [mySeat, snapshot.currentTurn, snapshot.lastEvent?.type, snapshot.status, snapshot.winner]);

  return (
    <div className="shell">
      {appScreen === "identity" ? (
        <IdentityScreen
          connected={connected}
          busy={busy}
          currentIdentity={bundle?.username}
          playerNameInput={playerNameInput}
          setPlayerNameInput={setPlayerNameInput}
          continueWithName={() => void savePlayerName()}
          error={error}
        />
      ) : null}

      {appScreen === "home" ? (
        <HomeScreen
          connected={connected}
          username={bundle?.username}
          snapshot={snapshot}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          clock={clock}
          activeMatchId={activeMatchId}
          myMark={mySeat?.mark}
          opponentName={opponentSeat?.username}
          playerNameInput={playerNameInput}
          setPlayerNameInput={setPlayerNameInput}
          savePlayerName={() => void savePlayerName()}
          matchIdInput={matchIdInput}
          setMatchIdInput={setMatchIdInput}
          joinRoom={() => void joinMatch(undefined, "match", "directJoin")}
          busy={busy}
          playNow={() => void quickMatchForMode(selectedMode)}
          createPrivateMatch={() => void createPrivateMatch()}
          openLeaderboard={() => setAppScreen("leaderboard")}
          lastResult={lastResult}
          error={error}
        />
      ) : null}

      {appScreen === "queue" ? (
        <QueueScreen
          mode={selectedMode}
          activeMatchId={activeMatchId}
          hasSeat={Boolean(mySeat)}
          playerCount={snapshot.players.length}
          cancel={() => void resetToHome()}
        />
      ) : null}

      {appScreen === "privateLobby" ? (
        <PrivateLobbyScreen
          activeMatchId={activeMatchId}
          players={snapshot.players}
          myMark={mySeat?.mark}
          username={bundle?.username}
          opponentName={opponentSeat?.username}
          copyMatchId={copyMatchId}
          leaveLobby={() => void resetToHome()}
        />
      ) : null}

      {appScreen === "match" ? (
        <MatchScreen
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
          postMatchDurationSeconds={postMatchDurationSeconds}
          postMatchOpen={postMatchOpen}
          postMatchCountdown={postMatchCountdown}
          dismissPostMatch={() => void resetToHome()}
          rematch={() => void rematch()}
          busy={busy}
          rematchVotes={snapshot.rematchVotes}
          playerCount={snapshot.players.length}
          toast={toast}
        />
      ) : null}

      {appScreen === "leaderboard" ? (
        <LeaderboardScreen
          availableMatches={availableMatches}
          leaderboard={leaderboard}
          refreshMatches={() => void refreshOpenMatches()}
          refreshLeaderboard={() => void refreshLeaderboard()}
          joinMatch={(matchId) => void joinMatch(matchId, "match", "directJoin")}
          backHome={() => setAppScreen("home")}
          busy={busy}
          bundleReady={Boolean(bundle)}
        />
      ) : null}

      {transitionCard ? (
        <RoundTransition title={transitionCard.title} subtitle={transitionCard.subtitle} />
      ) : null}
    </div>
  );
}

export default App;
