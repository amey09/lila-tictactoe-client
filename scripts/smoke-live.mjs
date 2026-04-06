import { Client } from "@heroiclabs/nakama-js";

const host = process.env.NAKAMA_HOST || "64.227.173.59";
const port = process.env.NAKAMA_PORT || "7350";
const useSSL = String(process.env.NAKAMA_SSL || "false") === "true";
const serverKey = process.env.NAKAMA_SERVER_KEY || "defaultkey";

async function mk(id) {
  const client = new Client(serverKey, host, port, useSSL);
  const session = await client.authenticateDevice(id, true);
  const socket = client.createSocket(useSSL, false);
  await socket.connect(session, true);
  return { client, session, socket };
}

async function main() {
  const a = await mk(`smoke-a-${Date.now()}`);
  const b = await mk(`smoke-b-${Date.now()}`);

  try {
    const quick = await a.client.rpc(a.session, "find_or_create_match", { mode: "classic" });
    const matchId = quick.payload.matchId;

    let received = false;
    const waitForMove = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timed out waiting for authoritative move state")), 10000);
      const handler = (message) => {
        if (message.op_code !== 2) return;
        const state = JSON.parse(new TextDecoder().decode(message.data));
        if (state.moveNumber >= 1) {
          clearTimeout(timer);
          received = true;
          resolve(state);
        }
      };

      a.socket.onmatchdata = handler;
      b.socket.onmatchdata = handler;
    });

    await a.socket.joinMatch(matchId);
    await b.socket.joinMatch(matchId);
    await new Promise((resolve) => setTimeout(resolve, 800));
    await a.socket.sendMatchState(matchId, 1, JSON.stringify({ cell: 0 }));

    const state = await waitForMove;
    const leaderboard = await a.client.rpc(a.session, "get_leaderboard", {});

    console.log(JSON.stringify({
      matchId,
      moveValidated: received,
      state,
      leaderboard: leaderboard.payload,
    }));
  } finally {
    try {
      a.socket.disconnect(false);
    } catch {}
    try {
      b.socket.disconnect(false);
    } catch {}
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
