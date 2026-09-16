let context;
let music;
let muted = false;
let lastSoundAt = -1;

export function initAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!context && AudioContext) context = new AudioContext();
  if (context?.state === "suspended") context.resume().catch(() => {});
  if (!music) {
    music = new Audio("/bgm.mp3");
    music.loop = true;
    music.volume = 0.12;
  }
}

export function setAudioState(isMuted, playing) {
  muted = isMuted;
  if (!music) return;
  if (muted || !playing) music.pause();
  else music.play().catch(() => {});
}

function tone(
  frequency,
  end,
  duration,
  delay = 0,
  type = "sine",
  volume = 0.08,
) {
  if (!context || muted || context.state !== "running") return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, end),
    start + duration,
  );
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

export function playFeedback(kind = "pop", combo = 0) {
  if (!context || muted || context.currentTime - lastSoundAt < 0.045) return;
  lastSoundAt = context.currentTime;
  if (kind === "crack") {
    tone(380, 170, 0.1, 0, "triangle");
    return;
  }
  if (kind === "burst" || kind === "boss") {
    [330, 440, 554, 660, 880].forEach((f, i) =>
      tone(f, f * 1.15, 0.25, i * 0.045, "triangle", 0.07),
    );
    tone(100, 40, 0.35, 0, "sine", 0.12);
    return;
  }
  const pitch = 520 + Math.min(combo, 16) * 35;
  tone(pitch, pitch * 1.8, 0.09, 0, "sine", 0.11);
  tone(pitch * 1.5, pitch * 0.9, 0.18, 0.035, "triangle", 0.035);
  if (kind === "chain")
    [1.3, 1.6, 2].forEach((m, i) =>
      tone(pitch * m, pitch * m, 0.15, 0.07 * (i + 1), "sine", 0.06),
    );
}

// Compatibility for the original, currently unmounted first-person components.
export const playShootSound = () => playFeedback("pop");
export const playHitSound = () => playFeedback("pop");
