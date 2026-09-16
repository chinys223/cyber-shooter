export const SECTORS = [
  {
    name: "星光出發站",
    subtitle: "點泡泡救夥伴，也可以按住滑過去！",
    total: 9,
    limit: 3,
    color: "#72f1dd",
    reward: "pinwheel",
  },
  {
    name: "彩虹連鎖帶",
    subtitle: "彩虹泡泡會把附近的泡泡一起啵掉！",
    total: 12,
    limit: 4,
    color: "#b7a0ff",
    reward: "flower",
  },
  {
    name: "蹦蹦流星雨",
    subtitle: "雙層泡泡要點兩下。集滿星光，放大招！",
    total: 15,
    limit: 5,
    color: "#ffbb70",
    reward: "rocket",
  },
  {
    name: "烏雲船長",
    subtitle: "先點亮三顆衛星，再戳船長的鼻子！",
    total: 12,
    limit: 3,
    color: "#ff94c7",
    reward: "crown",
  },
];

const COLORS = ["#ffd36d", "#ff99c1", "#91ead7", "#bba5ff"];
const LAYOUT = [
  [-0.62, 0.35],
  [0.55, 0.55],
  [0.03, -0.35],
  [-0.57, -0.48],
  [0.66, -0.38],
  [0, 0.65],
];

export function createGame(runId = 1) {
  return spawnWave({
    runId,
    time: 0,
    stage: 0,
    phase: "active",
    serial: 0,
    spawned: 0,
    cleared: 0,
    rescued: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    energy: 0,
    lastHitAt: -100,
    nextSpawnAt: 0,
    targets: [],
    effects: [],
    shot: null,
    bossHits: 0,
    bossOpen: false,
    transitionAt: 0,
    banner: "準備好了嗎？出發！",
    bannerUntil: 2.5,
    burstAt: -100,
    lastEvent: null,
  });
}

function makeTarget(g, slot) {
  const serial = g.serial + 1;
  let kind = "normal";
  if (g.stage >= 1 && serial % 4 === 0) kind = "rainbow";
  if (g.stage >= 2 && serial % 3 === 0) kind = "armored";
  const layoutIndex = (slot + g.stage + (g.runId % 2)) % LAYOUT.length;
  const [x, y] = LAYOUT[layoutIndex];
  return {
    id: `${g.runId}-${serial}`,
    serial,
    slot,
    x,
    y,
    kind,
    hp: kind === "armored" ? 2 : 1,
    color: COLORS[serial % COLORS.length],
    seed: serial * 1.73,
    bornAt: g.time,
    hitAt: -100,
  };
}

function spawnWave(game) {
  let g = { ...game };
  if (g.stage === 3) return spawnBossNodes(g);
  const { limit, total } = SECTORS[g.stage];
  const targets = [...g.targets];
  for (let slot = 0; slot < limit && g.spawned < total; slot++) {
    if (targets.some((t) => t.slot === slot)) continue;
    const target = makeTarget(g, slot);
    targets.push(target);
    g = { ...g, serial: g.serial + 1, spawned: g.spawned + 1 };
  }
  return { ...g, targets };
}

function spawnBossNodes(g) {
  const targets = [0, 1, 2].map((slot) => ({
    id: `${g.runId}-satellite-${g.bossHits}-${slot}`,
    kind: "satellite",
    slot,
    hp: 1,
    x: 0,
    y: 0,
    color: COLORS[slot],
    seed: slot,
    bornAt: g.time,
    hitAt: -100,
  }));
  return { ...g, targets, bossOpen: false };
}

export function targetPosition(target, game) {
  const age = game.time - target.bornAt;
  if (target.kind === "core") return { x: 0, y: 0.08 };
  if (target.kind === "satellite") {
    const angle = (target.slot * Math.PI * 2) / 3 + game.time * 0.38;
    return { x: Math.cos(angle) * 0.66, y: 0.08 + Math.sin(angle) * 0.66 };
  }
  const speed = game.stage === 2 ? 1.2 : 0.65;
  const travel = game.stage === 2 ? 0.17 : 0.09;
  return {
    x: target.x + Math.sin(age * speed + target.seed) * travel,
    y: target.y + Math.sin(age * speed * 1.3 + target.seed) * travel,
  };
}

export function stepGame(game, dt) {
  if (game.phase === "complete") return game;
  const time = game.time + Math.max(0, Math.min(dt, 0.1));
  let g = { ...game, time };
  if (g.combo && time - g.lastHitAt > 3.2) g.combo = 0;
  if (g.effects.some((e) => time - e.at > 1.15))
    g.effects = g.effects.filter((e) => time - e.at <= 1.15);
  if (g.phase === "interlude" && time >= g.transitionAt) {
    const stage = g.stage + 1;
    g = spawnWave({
      ...g,
      stage,
      phase: "active",
      cleared: 0,
      spawned: 0,
      targets: [],
      banner: SECTORS[stage].subtitle,
      bannerUntil: time + 4,
      nextSpawnAt: time,
    });
  } else if (
    g.phase === "active" &&
    g.stage < 3 &&
    time >= g.nextSpawnAt &&
    g.targets.length < SECTORS[g.stage].limit &&
    g.spawned < SECTORS[g.stage].total
  ) {
    g = spawnWave(g);
  }
  return g;
}

export function hitTarget(game, id, isBurst = false) {
  if (game.phase !== "active") return game;
  const target = game.targets.find((t) => t.id === id);
  if (!target || game.time - target.hitAt < 0.22) return game;
  const p = targetPosition(target, game);
  const shot = {
    ...p,
    at: game.time,
    serial: `${id}-${target.hp}-${game.time}`,
  };
  if (target.hp > 1) {
    return {
      ...game,
      shot,
      targets: game.targets.map((t) =>
        t.id === id ? { ...t, hp: t.hp - 1, hitAt: game.time } : t,
      ),
      effects: [
        ...game.effects,
        {
          ...p,
          at: game.time,
          id: shot.serial,
          color: "#ffffff",
          text: "再一下！",
          kind: "crack",
        },
      ],
      lastEvent: { kind: "crack", count: 0 },
    };
  }
  let ids = [id];
  if (target.kind === "rainbow" && !isBurst) {
    ids = game.targets
      .filter((t) => {
        const q = targetPosition(t, game);
        return t.id === id || Math.hypot(q.x - p.x, q.y - p.y) < 1.15;
      })
      .map((t) => t.id);
  }
  const rescued = game.targets.filter((t) => ids.includes(t.id));
  const combo =
    (game.time - game.lastHitAt <= 3.2 ? game.combo : 0) + rescued.length;
  const multiplier = Math.min(4, 1 + Math.floor(combo / 4));
  const gained = rescued.length * 100 * multiplier;
  let g = {
    ...game,
    shot,
    combo,
    bestCombo: Math.max(game.bestCombo, combo),
    score: game.score + gained,
    energy: Math.min(100, game.energy + rescued.length * 14),
    lastHitAt: game.time,
    rescued: game.rescued + rescued.length,
    cleared: game.cleared + rescued.length,
    targets: game.targets.filter((t) => !ids.includes(t.id)),
    nextSpawnAt: game.time + 0.48,
    effects: [
      ...game.effects,
      ...rescued.map((t, i) => ({
        ...targetPosition(t, game),
        color: t.color,
        id: `${t.id}-pop`,
        at: game.time,
        kind: "pop",
        seed: t.seed,
        text:
          i === 0
            ? rescued.length > 1
              ? `${rescued.length} 連鎖！`
              : `+${100 * multiplier}`
            : "+100",
      })),
    ].slice(-24),
    lastEvent: {
      kind:
        rescued.length > 1 ? "chain" : target.kind === "core" ? "boss" : "pop",
      count: rescued.length,
    },
  };
  if (game.stage === 3) {
    if (target.kind === "core") {
      g.bossHits++;
      g.banner = [
        "船長打了個大噴嚏！",
        "烏雲快變成彩虹了！",
        "船長也成為好朋友了！",
      ][g.bossHits - 1];
      g.bannerUntil = g.time + 2.2;
      if (g.bossHits === 3)
        return { ...g, phase: "complete", score: g.score + 1000, targets: [] };
      return spawnBossNodes(g);
    }
    if (g.targets.length === 0) {
      g.bossOpen = true;
      g.targets = [
        {
          id: `${g.runId}-nose-${g.bossHits}`,
          kind: "core",
          slot: 0,
          hp: 1,
          color: "#ffbc85",
          x: 0,
          y: 0.08,
          seed: 0,
          bornAt: g.time,
          hitAt: -100,
        },
      ];
      g.banner = "現在！戳戳發光的鼻子！";
      g.bannerUntil = g.time + 3;
    }
  } else if (g.cleared >= SECTORS[g.stage].total) {
    g.phase = "interlude";
    g.transitionAt = g.time + 2.3;
    g.banner = `${SECTORS[g.stage].name}，救援完成！`;
    g.bannerUntil = g.transitionAt;
  }
  return g;
}

export function fireBurst(game) {
  if (game.phase !== "active" || game.energy < 100 || !game.targets.length)
    return game;
  let g = { ...game, energy: 0 };
  const ids = game.targets.map((t) => t.id);
  for (const id of ids) {
    // A charged blast breaks both layers, without touching targets spawned by the blast.
    const t = g.targets.find((t) => t.id === id);
    if (t?.hp > 1)
      g = {
        ...g,
        targets: g.targets.map((x) => (x.id === id ? { ...x, hp: 1 } : x)),
      };
    g = hitTarget(g, id, true);
  }
  return {
    ...g,
    energy: 0,
    burstAt: game.time,
    banner: "星光大爆發！",
    bannerUntil: game.time + 1.8,
    lastEvent: { kind: "burst", count: ids.length },
  };
}
