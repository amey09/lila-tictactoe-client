import { useEffect, useMemo, useState } from "react";

import { GamePanel } from "./components/GamePanel";
import { LobbyPanel } from "./components/LobbyPanel";
import { StatusPanel } from "./components/StatusPanel";
import {
  bootstrapSession,
  clearStoredMatchId,
  createMatch as createMatchRpc,
  emptySnapshot,
  formatError,
  getStoredMatchId,
  joinMatch as joinMatchRpc,
  loadLeaderboard,
  loadOpenMatches,
  quickMatch as quickMatchRpc,
  reconnectLabel,
  refreshClock,
  sendMove,
} from "./lib/nakama";
import type {
  AvailableMatch,
  LeaderboardEntry,
  MatchMode,
  SessionBundle,
  Snapshot,
} from "./types";

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
          setConnected(true);
          const storedMatchId = getStoredMatchId();
          if (storedMatchId) {
            setActiveMatchId(storedMatchId);
            setMatchIdInput(storedMatchId);
            setSnapshot(emptySnapshot());
            try {
              await joinMatchRpc(nextBundle, storedMatchId);
            } catch {
              clearStoredMatchId();
              setActiveMatchId("");
              setMatchIdInput("");
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

  const canPlay = Boolean(
    bundle &&
      mySeat &&
      snapshot.status === "active" &&
      mySeat.mark === snapshot.currentTurn,
  );

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
    if (!bundle) return;
    setBusy(true);
    setError("");
    try {
      const visibleMatches = await loadOpenMatches(bundle);
      const reusableMatch = visibleMatches.find(
        (match) => match.mode === selectedMode && match.size < 2,
      );

      if (reusableMatch) {
        await joinMatch(reusableMatch.id);
        return;
      }

      const response = await quickMatchRpc(bundle, selectedMode);
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

  return (
    <div className="shell">
      <StatusPanel
        connected={connected}
        username={bundle?.username}
        snapshot={snapshot}
        selectedMode={selectedMode}
        clock={clock}
      />

      <LobbyPanel
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

      <GamePanel
        activeMatchId={activeMatchId}
        connected={connected}
        snapshot={snapshot}
        myMark={mySeat?.mark}
        canPlay={canPlay}
        playMove={(index) => void playMove(index)}
      />
    </div>
  );
}

export default App;
