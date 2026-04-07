import { chromium } from "playwright";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://64.227.173.59";

async function clearStorage(page) {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function waitForIdentity(page) {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.getByPlaceholder("Enter your player name").waitFor({ timeout: 20000 });
}

async function continueWithName(page, name) {
  await page.getByPlaceholder("Enter your player name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForFunction(
    () => document.body?.textContent?.includes("Current identity:"),
    undefined,
    { timeout: 20000 },
  );
}

async function waitForHomeConnected(page) {
  const start = Date.now();
  let lastText = "";
  while (Date.now() - start < 20000) {
    const text = (await page.locator("body").textContent()) || "";
    lastText = text;
    if (text.includes("Current identity:") && (text.includes("Connection: Online") || text.includes("Server online"))) {
      return;
    }
    if (text.includes("Unable to")) {
      throw new Error(`Home transition failed. Page text: ${text}`);
    }
    await page.waitForTimeout(400);
  }
  throw new Error(`Timed out waiting for connected home state. Page text: ${lastText}`);
}

async function saveNameFromHome(page, nextName) {
  const inputs = await page.locator('input[placeholder="Enter your player name"]').all();
  const homeInput = inputs[inputs.length - 1];
  await homeInput.fill(nextName);
  await page.getByRole("button", { name: "Save Name" }).click();
  await page.waitForFunction(
    (name) => document.body?.textContent?.includes(`Current identity: ${name}`),
    nextName,
    { timeout: 20000 },
  );
}

async function createPrivateRoom(page) {
  await page.getByRole("button", { name: "Create Room" }).click();
  const body = page.locator("body");
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const text = (await body.textContent()) || "";
    const match = text.match(/Room ID\s*([0-9a-f-]+\.nakama1)/i);
    if (match) return match[1];
    await page.waitForTimeout(300);
  }
  throw new Error("Timed out reading private room match id");
}

async function directJoinRoom(page, matchId) {
  await page.getByPlaceholder("Paste a match ID").fill(matchId);
  await page.getByRole("button", { name: "Join Room" }).click();
}

async function extractMark(page) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const text = (await page.locator("body").textContent()) || "";
    const match = text.match(/You are\s*([XO])/);
    if (match) return match[1];
    await page.waitForTimeout(300);
  }
  throw new Error("Timed out waiting for seat mark");
}

async function waitForPlayablePage(pageA, pageB) {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    if ((await pageA.locator(".board .cell:not([disabled])").count()) > 0) return pageA;
    if ((await pageB.locator(".board .cell:not([disabled])").count()) > 0) return pageB;
    await pageA.waitForTimeout(250);
  }
  throw new Error("Timed out waiting for playable board");
}

async function waitForRoundComplete(pageA, pageB) {
  await Promise.all([
    pageA.waitForFunction(() => document.body?.textContent?.includes("Round Complete"), undefined, {
      timeout: 20000,
    }),
    pageB.waitForFunction(() => document.body?.textContent?.includes("Round Complete"), undefined, {
      timeout: 20000,
    }),
  ]);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const baseName = `Live${Date.now().toString().slice(-5)}`;
    const nameA = `${baseName}A`;
    const nameB = `${baseName}B`;
    const renamedA = `${baseName}AX`;

    await clearStorage(pageA);
    await clearStorage(pageB);

    await waitForIdentity(pageA);
    await continueWithName(pageA, nameA);
    await waitForHomeConnected(pageA);

    await waitForIdentity(pageB);
    await continueWithName(pageB, nameB);
    await waitForHomeConnected(pageB);

    await saveNameFromHome(pageA, renamedA);

    const matchId = await createPrivateRoom(pageA);
    await directJoinRoom(pageB, matchId);

    const [firstMarkA, firstMarkB] = await Promise.all([extractMark(pageA), extractMark(pageB)]);
    if (firstMarkA === firstMarkB) {
      throw new Error(`Expected different marks but got ${firstMarkA} and ${firstMarkB}`);
    }

    const playOrder = [0, 3, 1, 4, 2];
    for (let i = 0; i < playOrder.length; i += 1) {
      const activePage = i % 2 === 0
        ? (firstMarkA === "X" ? pageA : pageB)
        : (firstMarkA === "X" ? pageB : pageA);
      await activePage.locator(".board .cell:not([disabled])").first().click();
      await activePage.waitForTimeout(300);
    }

    await waitForRoundComplete(pageA, pageB);

    await pageA.getByRole("button", { name: "Play Again" }).click();
    await pageB.getByRole("button", { name: "Play Again" }).click();

    await pageA.waitForFunction(() => !document.body?.textContent?.includes("Round Complete"), undefined, {
      timeout: 15000,
    });
    await pageB.waitForFunction(() => !document.body?.textContent?.includes("Round Complete"), undefined, {
      timeout: 15000,
    });

    const [rematchMarkA, rematchMarkB] = await Promise.all([extractMark(pageA), extractMark(pageB)]);

    console.log(JSON.stringify({
      renamedA,
      renameVisible: ((await pageA.locator("body").textContent()) || "").includes(`Current identity: ${renamedA}`),
      matchId,
      firstMarkA,
      firstMarkB,
      rematchMarkA,
      rematchMarkB,
      rotated: firstMarkA === rematchMarkB && firstMarkB === rematchMarkA,
    }));

    await contextA.close();
    await contextB.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
