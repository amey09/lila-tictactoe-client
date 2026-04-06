import { chromium } from "playwright";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://64.227.173.59";

async function waitForOnline(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByText("Online", { exact: true }).waitFor({ timeout: 20000 });
}

async function extractMark(page) {
  const start = Date.now();
  let lastText = "";
  while (Date.now() - start < 20000) {
    const text = (await page.locator(".lobby").textContent()) || "";
    lastText = text;
    const match = text.match(/Your mark\s+([XO])/);
    if (match) return match[1];
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for seat assignment. Lobby text: ${lastText}`);
}

const browser = await chromium.launch({ headless: true });

try {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await waitForOnline(pageA);
  await waitForOnline(pageB);

  await pageA.getByRole("button", { name: "Create a Private Match" }).click();

  const lobbyTextA = (await pageA.locator(".lobby").textContent()) || "";
  const matchIdMatch = lobbyTextA.match(/Active match\s+([a-f0-9-]+\.nakama1|[a-f0-9-]+-[a-f0-9-]+-[a-f0-9-]+-[a-f0-9-]+-[a-f0-9-]+\.nakama1)/i);
  if (!matchIdMatch) {
    throw new Error(`Unable to read created match id from lobby text: ${lobbyTextA}`);
  }

  await pageB.getByPlaceholder("Paste a match ID to join directly").fill(matchIdMatch[1]);
  await pageB.getByRole("button", { name: "Join" }).click();

  const [markA, markB] = await Promise.all([extractMark(pageA), extractMark(pageB)]);
  if (markA === markB) {
    throw new Error(`Expected different marks but got ${markA} and ${markB}`);
  }

  const playPage = markA === "X" ? pageA : pageB;
  await playPage.getByRole("button", { name: "Cell 1" }).click();

  const cellA = await pageA.locator(".board .cell-mark").first().textContent();
  const cellB = await pageB.locator(".board .cell-mark").first().textContent();

  if (!cellA || !cellB) {
    throw new Error("Expected both pages to show the first authoritative move");
  }

  console.log(
    JSON.stringify({
      markA,
      markB,
      firstCellA: cellA,
      firstCellB: cellB,
    }),
  );

  await contextA.close();
  await contextB.close();
} finally {
  await browser.close();
}
