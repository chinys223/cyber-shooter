import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
);
const output = new URL("../artifacts/playtest/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_EXECUTABLE
    ? { executablePath: process.env.CHROME_EXECUTABLE }
    : {}),
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  hasTouch: true,
});
page.on("pageerror", (e) => errors.push(e.message));
const snap = (name) =>
  page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
// Use the same module instance as the UI even after Vite hot updates.
const attachStores = () =>
  page.evaluate(async () => {
    const source = await (await fetch("/src/UI.jsx")).text();
    const url = source.match(/from\s+["']([^"']*\/store\.js[^"']*)["']/)?.[1];
    if (!url) throw new Error("Could not resolve the UI store module");
    window.__smokeStores = await import(url);
  });
const state = () =>
  page.evaluate(async () => {
    const { useGameStore, useSaveStore } = window.__smokeStores;
    const s = useGameStore.getState();
    return {
      screen: s.screen,
      game: s.game,
      save: {
        completedLevels: useSaveStore.getState().completedLevels,
        slots: useSaveStore.getState().slots,
        decorationIds: useSaveStore.getState().decorationIds,
      },
    };
  });
async function targetPoint(index = 0) {
  return page.evaluate(async (targetIndex) => {
    const { useGameStore } = window.__smokeStores;
    const { targetPosition } = await import("/src/game.js");
    const g = useGameStore.getState().game;
    const t = g.targets[targetIndex];
    if (!t || g.phase !== "active") return null;
    const canvas = document.querySelector("canvas").getBoundingClientRect();
    const zoom =
      canvas.width < 650
        ? canvas.width / 10
        : Math.min(canvas.width / 20, canvas.height / 12);
    const p = targetPosition(t, g);
    return {
      id: t.id,
      kind: t.kind,
      x:
        canvas.left +
        canvas.width / 2 +
        p.x * Math.min((canvas.width / zoom) * 0.39, 7.1) * zoom,
      y:
        canvas.top +
        canvas.height / 2 -
        (p.y *
          Math.min(
            (canvas.height / zoom) * 0.265,
            canvas.width / zoom < 12 ? 5.2 : 3.4,
          ) +
          0.15) *
          zoom,
    };
  }, index);
}
async function hitFirst(touch = false) {
  const target = await targetPoint();
  if (target) {
    if (touch) await page.touchscreen.tap(target.x, target.y);
    else await page.mouse.click(target.x, target.y);
  }
  await page.waitForTimeout(target?.kind === "armored" ? 280 : 100);
  return target;
}

try {
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:5173", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1500);
  await attachStores();
  await snap("desktop-home");
  await page.getByRole("button", { name: "開始大冒險" }).click();
  await page.waitForTimeout(500);
  await snap("desktop-playing");
  await hitFirst();
  assert.equal(
    (await state()).game.rescued,
    1,
    "Real canvas click must rescue a target",
  );
  await page.getByRole("button", { name: "暫停遊戲" }).click();
  const paused = await state();
  await page.waitForTimeout(500);
  assert.equal(
    (await state()).game.time,
    paused.game.time,
    "Pause must freeze game time",
  );
  await page.getByRole("button", { name: "繼續冒險" }).click();
  const captured = new Set([0]);
  let usedBurst = false;
  for (let n = 0; n < 600; n++) {
    const s = await state();
    if (s.screen === "result") break;
    if (s.screen === "paused")
      await page.getByRole("button", { name: "繼續冒險" }).click();
    if (!captured.has(s.game.stage)) {
      await snap(`desktop-sector-${s.game.stage + 1}`);
      captured.add(s.game.stage);
    }
    if (
      s.game.energy >= 100 &&
      s.game.phase === "active" &&
      s.game.targets.length &&
      !usedBurst
    ) {
      await page.getByRole("button", { name: /星光大招/ }).click();
      usedBurst = true;
    } else await hitFirst();
    if (s.game.phase === "interlude" || !s.game.targets.length)
      await page.waitForTimeout(180);
  }
  let s = await state();
  assert.equal(
    s.screen,
    "result",
    "The complete journey must be playable using real pointer input",
  );
  assert.equal(s.game.bossHits, 3);
  assert.equal(s.save.decorationIds.length, 4);
  assert.equal(usedBurst, true);
  await snap("desktop-result");
  await page.getByRole("button", { name: "去布置我的小島" }).click();
  await page.getByRole("button", { name: /星光風車/ }).click();
  await page.locator(".slot-picker > button").nth(1).click();
  assert.equal((await state()).save.slots[1], "pinwheel");
  await snap("desktop-island");
  await page.reload({ waitUntil: "networkidle" });
  await attachStores();
  assert.equal(
    (await state()).save.slots[1],
    "pinwheel",
    "Decorations survive reload",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  await snap("mobile-home");
  await page.getByRole("button", { name: "開始大冒險" }).click();
  await page.waitForTimeout(500);
  await hitFirst(true);
  assert.equal(
    (await state()).game.rescued,
    1,
    "Portrait target must respond to real touch events",
  );
  const from = await targetPoint(0);
  const to = await targetPoint(1);
  assert.ok(from && to);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });
  for (let i = 1; i <= 14; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * i) / 14,
          y: from.y + ((to.y - from.y) * i) / 14,
        },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(150);
  assert.ok(
    (await state()).game.rescued >= 3,
    "Sliding a finger across two targets must rescue both",
  );
  await snap("mobile-playing");
  await page.getByRole("button", { name: "暫停遊戲" }).click();
  await page.getByRole("button", { name: "結束這趟，回小島" }).click();
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.locator(".decoration-card").first().tap();
    await page.locator(".slot-picker > button").nth(2).tap();
    assert.equal((await state()).save.slots[2], "pinwheel");
    assert.equal(Object.values((await state()).save.slots).filter((id) => id === "pinwheel").length, 1);
    await page.locator(".decoration-card").first().tap();
    await page.locator(".slot-picker > button").first().tap();
    assert.equal((await state()).save.slots[0], "pinwheel");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await snap("mobile-island");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, [], "No uncaught browser exceptions");
  console.log(
    JSON.stringify(
      {
        passed: true,
        realPointerFullJourney: true,
        burst: usedBurst,
        pause: true,
        persistence: true,
        portraitTouch: true,
        touchSwipe: true,
        browserErrors: errors,
        screenshots: output.href,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await snap("failure").catch(() => {});
  console.error("Browser smoke failure:", error);
  console.error("State:", JSON.stringify(await state().catch(() => null)));
  console.error("Browser errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
