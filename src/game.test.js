import test from "node:test";
import assert from "node:assert/strict";
import { stepFlight } from "./islandPhysics.js";

test("released birds fall, bounce, and settle safely at home", () => {
  let body = { x: 1.8, y: 2, vx: 3, vy: 0 };
  let bounced = false;
  for (let i = 0; i < 1200; i++) {
    const previous = body;
    body = stepFlight(body, 1 / 120, 0);
    if (previous.vy < 0 && body.vy > 0) bounced = true;
    assert.ok(body.y >= 0 && body.y <= 2.5);
    assert.ok(Math.abs(body.x) <= 2.1);
  }
  assert.equal(bounced, true);
  assert.equal(body.y, 0);
  assert.ok(Math.abs(body.x) < 0.001);
  assert.equal(body.vy, 0);
});
import {
  createGame,
  stepGame,
  hitTarget,
  fireBurst,
  targetPosition,
  SECTORS,
} from "./game.js";

function advance(g, seconds) {
  for (let t = 0; t < seconds; t += 0.05) g = stepGame(g, 0.05);
  return g;
}

test("a repeated target event cannot score or rescue twice", () => {
  const g = createGame();
  const hit = hitTarget(g, g.targets[0].id);
  assert.equal(hit.rescued, 1);
  assert.equal(hitTarget(hit, g.targets[0].id), hit);
  assert.equal(hitTarget(g, "unknown"), g);
});

test("complete journey reaches each sector, reveals captain nose, and ends once", () => {
  let g = createGame();
  const seen = new Set();
  const cores = [];
  let iterations = 0;
  while (g.phase !== "complete" && iterations++ < 800) {
    seen.add(g.stage);
    if (g.targets.length && g.phase === "active") {
      const t = g.targets[0];
      if (t.kind === "core") {
        assert.equal(g.bossOpen, true);
        assert.equal(g.targets.length, 1);
        cores.push(g.bossHits);
      }
      g = hitTarget(g, t.id);
    }
    g = advance(g, 0.5);
  }
  assert.deepEqual([...seen], SECTORS.map((_, i) => i));
  assert.deepEqual(cores, [0, 1, 2]);
  assert.equal(g.phase, "complete");
  assert.equal(
    g.rescued,
    SECTORS.reduce((n, s) => n + s.total, 0),
  );
  assert.equal(g.bossHits, 3);
  assert.equal(stepGame(g, 0.1), g);
  assert.equal(hitTarget(g, "anything"), g);
});

test("double-layer bubbles need two separated hits and cannot score on crack", () => {
  let g = {
    ...createGame(),
    stage: 2,
    targets: [
      {
        id: "armor",
        kind: "armored",
        hp: 2,
        hitAt: -100,
        x: 0,
        y: 0,
        bornAt: 0,
        seed: 0,
        color: "#fff",
      },
    ],
  };
  g = hitTarget(g, "armor");
  assert.equal(g.rescued, 0);
  assert.equal(g.targets[0].hp, 1);
  assert.equal(hitTarget(g, "armor"), g);
  g = advance(g, 0.3);
  g = hitTarget(g, "armor");
  assert.equal(g.rescued, 1);
});

test("rainbow chains nearby bubbles but not distant ones", () => {
  const target = (id, x, kind = "normal") => ({
    id,
    x,
    y: 0,
    kind,
    hp: 1,
    hitAt: -100,
    bornAt: 0,
    seed: 0,
    color: "#fff",
  });
  const g = {
    ...createGame(),
    targets: [
      target("rainbow", -0.65, "rainbow"),
      target("near", -0.4),
      target("far", 0.9),
    ],
  };
  const hit = hitTarget(g, "rainbow");
  assert.equal(hit.rescued, 2);
  assert.deepEqual(
    hit.targets.map((t) => t.id),
    ["far"],
  );
});

test("burst is charged, clears armor, and does not hit newly revealed captain nose", () => {
  const initial = createGame();
  assert.equal(fireBurst(initial), initial);
  const burst = fireBurst({ ...initial, energy: 100 });
  assert.equal(burst.targets.length, 0);
  assert.equal(burst.energy, 0);
  let boss = {
    ...initial,
    stage: SECTORS.length - 1,
    energy: 100,
    targets: [0, 1, 2].map((slot) => ({
      id: `s${slot}`,
      kind: "satellite",
      slot,
      hp: 1,
      bornAt: 0,
      hitAt: -100,
      color: "#fff",
    })),
  };
  boss = fireBurst(boss);
  assert.equal(boss.bossHits, 0);
  assert.equal(boss.bossOpen, true);
  assert.equal(boss.targets[0].kind, "core");
});

test("interludes reject hits and advance on active game time only", () => {
  const g = { ...createGame(), phase: "interlude", transitionAt: 2.3 };
  assert.equal(hitTarget(g, g.targets[0].id), g);
  const later = advance(g, 1);
  assert.equal(later.stage, 0);
  assert.equal(advance(later, 1.5).stage, 1);
});

test("combo expires and targets remain inside the planned field over time", () => {
  let g = createGame();
  g = hitTarget(g, g.targets[0].id);
  g = advance(g, 3.5);
  assert.equal(g.combo, 0);
  assert.equal(g.bestCombo, 1);
  for (let i = 0; i < 200; i++) {
    g = stepGame(g, 0.1);
    for (const target of g.targets) {
      const p = targetPosition(target, g);
      assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1);
    }
  }
  assert.notEqual(createGame(2).targets[0].id, createGame(1).targets[0].id);
});

test("all difficulties can finish eight sectors and keep moving targets in bounds", () => {
  for (const difficulty of ["easy", "normal", "hard"]) {
    let g = createGame(10, difficulty);
    let tripleArmor = false;
    for (let i = 0; i < 1000 && g.phase !== "complete"; i++) {
      for (const target of g.targets) {
        const p = targetPosition(target, g);
        assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1);
        if (target.hp === 3) tripleArmor = true;
      }
      if (g.targets.length) g = hitTarget(g, g.targets[0].id);
      g = advance(g, 0.5);
    }
    assert.equal(g.phase, "complete", difficulty);
    assert.equal(g.stage, 7);
    assert.equal(tripleArmor, true);
  }
});

test("hard mode shortens the combo window and changes target movement", () => {
  const easy = createGame(1, "easy");
  const hard = createGame(1, "hard");
  const easyHit = advance(hitTarget(easy, easy.targets[0].id), 2.1);
  const hardHit = advance(hitTarget(hard, hard.targets[0].id), 2.1);
  assert.equal(easyHit.combo, 1);
  assert.equal(hardHit.combo, 0);
  assert.notDeepEqual(targetPosition(easy.targets[1], easyHit), targetPosition(hard.targets[1], hardHit));
});

test("triple armor needs three hits but a charged burst can clear it", () => {
  const base = createGame();
  const target = { ...base.targets[0], kind: "armored", hp: 3 };
  const initial = { ...base, targets: [target], energy: 100 };
  let g = hitTarget(initial, target.id);
  assert.equal(g.targets[0].hp, 2);
  g = hitTarget(advance(g, 0.3), target.id);
  assert.equal(g.targets[0].hp, 1);
  assert.equal(g.rescued, 0);
  g = hitTarget(advance(g, 0.3), target.id);
  assert.equal(g.rescued, 1);
  assert.equal(fireBurst(initial).targets.length, 0);
});
