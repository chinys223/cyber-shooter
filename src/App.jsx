import { Component, Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { useGameStore, useSaveStore } from "./store";
import { UIRoot } from "./UI";
import {
  BubbleTarget,
  Captain,
  GameEffects,
  Island3D,
  SpaceBackdrop,
} from "./GameComponents";
import { setAudioState } from "./audio";

function Scene() {
  const screen = useGameStore((s) => s.screen);
  const targets = useGameStore((s) => s.game.targets);
  const stage = useGameStore((s) => s.game.stage);
  const { size } = useThree();
  const elapsed = useRef(0);
  const inGame = ["playing", "paused", "result"].includes(screen);
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.05);
    if (elapsed.current >= 0.025) {
      useGameStore.getState().tick(elapsed.current);
      elapsed.current = 0;
    }
  });
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 0, 20]}
        zoom={
          size.width < 650
            ? size.width / 10
            : Math.min(size.width / 20, size.height / 12)
        }
        near={0.1}
        far={150}
      />
      <SpaceBackdrop />
      {inGame ? (
        <>
          {stage === 3 && <Captain />}
          {targets.map((t) => (
            <BubbleTarget key={t.id} target={t} />
          ))}
          <GameEffects />
        </>
      ) : (
        <Island3D preview={screen === "home"} />
      )}
    </>
  );
}

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="scene-error">
          <h2>太空船需要重新啟動</h2>
          <p>3D 畫面未能載入，請重新整理再試一次。</p>
          <button className="primary-button" onClick={() => location.reload()}>
            重新啟動
          </button>
        </div>
      );
    return this.props.children;
  }
}

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const stage = useGameStore((s) => s.game.stage);
  const muted = useSaveStore((s) => s.isMuted);
  const reduced = useSaveStore((s) => s.reducedMotion);
  useEffect(() => {
    setAudioState(muted, screen === "playing");
    return () => setAudioState(muted, false);
  }, [muted, screen]);
  useEffect(() => {
    const pause = () => useGameStore.getState().pauseGame();
    const visibility = () => {
      if (document.hidden) pause();
    };
    const onKey = (e) => {
      if (e.repeat) return;
      const s = useGameStore.getState();
      if (e.code === "Escape") {
        if (s.screen === "paused") s.resumeGame();
        else s.pauseGame();
      }
      if (
        e.code === "Space" &&
        s.screen === "playing" &&
        !["BUTTON", "INPUT", "SELECT"].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        s.burst();
      }
    };
    const saveWarning = () => useGameStore.setState({ saveWarning: true });
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", onKey);
    window.addEventListener("game-save-unavailable", saveWarning);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("game-save-unavailable", saveWarning);
    };
  }, []);
  return (
    <main
      className={`game-shell screen-${screen} sector-${stage} ${reduced ? "reduced-motion" : ""}`}
    >
      <div className="space-haze" aria-hidden="true" />
      <SceneBoundary>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 20], zoom: 65, near: 0.1, far: 150 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
          aria-label="太空救援遊戲場景：點擊泡泡，或按 Tab 選擇目標後按 Enter。"
          fallback={
            <div className="scene-error">
              這個瀏覽器無法顯示 3D 場景，請使用支援 WebGL 的瀏覽器。
            </div>
          }
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </SceneBoundary>
      <UIRoot />
    </main>
  );
}
