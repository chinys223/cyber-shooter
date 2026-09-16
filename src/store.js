import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createGame, stepGame, hitTarget, fireBurst, SECTORS } from "./game";
import { playFeedback, initAudio, setAudioState } from "./audio";

const DECORATIONS = ["pinwheel", "flower", "rocket", "crown"];
const safeStorage = {
  getItem: (key) => {
    try {
      const value = localStorage.getItem(key);
      if (value) JSON.parse(value);
      return value;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      window.dispatchEvent(new Event("game-save-unavailable"));
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Session remains playable. */
    }
  },
};

export const useSaveStore = create(
  persist(
    (set) => ({
      completedLevels: [],
      creatureIds: [],
      decorationIds: [],
      slots: {},
      bestScore: 0,
      isMuted: false,
      reducedMotion: false,
      rewardStage: (stage, score) =>
        set((s) => ({
          completedLevels: [...new Set([...s.completedLevels, stage + 1])],
          creatureIds: [
            ...new Set([
              ...s.creatureIds,
              ["bobo", "tangtang", "dongdong", "captain"][stage],
            ]),
          ],
          decorationIds: [
            ...new Set([...s.decorationIds, SECTORS[stage].reward]),
          ],
          bestScore: Math.max(s.bestScore, score),
        })),
      placeDecoration: (slot, id) =>
        set((s) => {
          if (
            !Number.isInteger(slot) ||
            slot < 0 ||
            slot > 3 ||
            !s.decorationIds.includes(id)
          )
            return s;
          const slots = Object.fromEntries(
            Object.entries(s.slots).filter(
              ([key, value]) => value !== id && Number(key) !== slot,
            ),
          );
          return { slots: { ...slots, [slot]: id } };
        }),
      removeDecoration: (slot) =>
        set((s) => ({ slots: { ...s.slots, [slot]: null } })),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      toggleMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
    }),
    {
      name: "bubble-rescue.save.v1",
      storage: createJSONStorage(() => safeStorage),
      merge: (persisted, current) => {
        const p = persisted && typeof persisted === "object" ? persisted : {};
        const list = (key, valid) =>
          Array.isArray(p[key])
            ? [...new Set(p[key].filter((x) => valid.includes(x)))]
            : [];
        const decorationIds = list("decorationIds", DECORATIONS);
        const slots = {};
        const seen = new Set();
        for (const [key, value] of Object.entries(p.slots || {})) {
          if (
            /^[0-3]$/.test(key) &&
            decorationIds.includes(value) &&
            !seen.has(value)
          ) {
            slots[key] = value;
            seen.add(value);
          }
        }
        return {
          ...current,
          completedLevels: list("completedLevels", [1, 2, 3, 4]),
          creatureIds: list("creatureIds", [
            "bobo",
            "tangtang",
            "dongdong",
            "captain",
          ]),
          decorationIds,
          slots,
          bestScore: Number.isFinite(p.bestScore)
            ? Math.max(0, p.bestScore)
            : 0,
          isMuted: p.isMuted === true,
          reducedMotion: p.reducedMotion === true,
        };
      },
    },
  ),
);

function commitResult(previous, next, set) {
  if (next === previous) return;
  if (previous.phase === "active" && next.phase !== "active")
    useSaveStore.getState().rewardStage(next.stage, next.score);
  playFeedback(next.lastEvent?.kind || "pop", next.combo);
  set({
    game: next,
    ...(next.phase === "complete" ? { screen: "result" } : {}),
  });
}

export const useGameStore = create((set, get) => ({
  screen: "home",
  game: createGame(0),
  selectedDecoration: null,
  saveWarning: false,
  setScreen: (screen) => set({ screen }),
  startLevel: () => {
    initAudio();
    const settings = useSaveStore.getState();
    setAudioState(settings.isMuted, true);
    set({ screen: "playing", game: createGame(get().game.runId + 1) });
  },
  pauseGame: () => {
    if (get().screen === "playing") set({ screen: "paused" });
  },
  resumeGame: () => {
    if (get().screen === "paused") set({ screen: "playing" });
  },
  tick: (dt) => {
    if (get().screen === "playing")
      set((s) => ({ game: stepGame(s.game, dt) }));
  },
  hit: (id) => {
    if (get().screen !== "playing") return;
    const previous = get().game;
    commitResult(previous, hitTarget(previous, id), set);
  },
  burst: () => {
    if (get().screen !== "playing") return;
    const previous = get().game;
    commitResult(previous, fireBurst(previous), set);
  },
  selectDecoration: (id) => set({ selectedDecoration: id }),
  decorate: (slot) => {
    const id = get().selectedDecoration;
    if (id) {
      useSaveStore.getState().placeDecoration(slot, id);
      playFeedback("pop", 1);
      set({ selectedDecoration: null });
    }
  },
}));
