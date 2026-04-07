import { Client } from "@heroiclabs/nakama-js";

const host = process.env.NAKAMA_HOST || "64.227.173.59";
const port = process.env.NAKAMA_PORT || "7350";
const useSSL = String(process.env.NAKAMA_SSL || "false") === "true";
const serverKey = process.env.NAKAMA_SERVER_KEY || "4b6d6c73cd764c88b8f84313b9af71ff";
const iterations = Number(process.env.STRESS_ITERATIONS || "100");
const moveOpCode = 1;
const rematchOpCode = 3;
const stateOpCode = 2;

async function mk(id) {
  const client = new Client(serverKey, host, port, useSSL);
  const session = await client.authenticateDevice(id, true);
  const socket = client.createSocket(useSSL, false);
  await socket.connect(session, true);
  return { client, session, socket };
}

function waitForState(socket, predicate, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for match state")), timeoutMs);
    socket.onmatchdata = (message) => {
      if (message.op_code !== stateOpCode) return;
      const state = JSON.parse(new TextDecoder().decode(message.data));
      if (predicate(state)) {
        clearTimeout(timer);
        resolve(state);
      }
    };
  });
}

async function runSingle(index) {
  const a = await mk(`stress-a-${index}-${Date.now()}`);
  const b = await mk(`stress-b-${index}-${Date.now()}`);

  try {
    const created = await a.client.rpc(a.session, "create_match", { mode: "classic" });
    const matchId = created.payload.matchId;
    await a.socket.joinMatch(matchId);
    await b.socket.joinMatch(matchId);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const finalStatePromise = waitForState(a.socket, (state) => state.status === "won");
    const moves = [0, 3, 1, 4, 2];
    const sockets = [a.socket, b.socket, a.socket, b.socket, a.socket];

    for (let i = 0; i < moves.length; i++) {
      await sockets[i].sendMatchState(matchId, moveOpCode, JSON.stringify({ cell: moves[i] }));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const finalState = await finalStatePromise;
    if (finalState.winner !== "X") {
      throw new Error(`Unexpected winner ${finalState.winner} on iteration ${index}`);
    }

    if (index % 10 === 0) {
      const rematchPromise = waitForState(a.socket, (state) => state.moveNumber === 0 && state.status === "active");
      await a.socket.sendMatchState(matchId, rematchOpCode, JSON.stringify({ ready: true }));
      await b.socket.sendMatchState(matchId, rematchOpCode, JSON.stringify({ ready: true }));
      const rematchState = await rematchPromise;
      if (rematchState.moveNumber !== 0) {
        throw new Error(`Rematch did not reset cleanly on iteration ${index}`);
      }
    }

    return {
      matchId,
      winner: finalState.winner,
      moves: finalState.moveNumber,
    };
  } finally {
    try {
      a.socket.disconnect(false);
    } catch {}
    try {
      b.socket.disconnect(false);
    } catch {}
  }
}

async function main() {
  const failures = [];
  for (let i = 1; i <= iterations; i++) {
    try {
      const result = await runSingle(i);
      if (i % 10 === 0 || i === iterations) {
        console.log(JSON.stringify({ progress: i, result }));
      }
    } catch (error) {
      failures.push({
        iteration: i,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(JSON.stringify(failures[failures.length - 1]));
      break;
    }
  }

  if (failures.length) {
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, iterations }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
