import { useGameStore, useSaveStore } from "./store";
import { SECTORS, DIFFICULTIES, comboWindow } from "./game";
import { initAudio } from "./audio";

const DECOR = [
  { id: "pinwheel", icon: "✿", name: "星光風車", where: "完成出發站" },
  { id: "flower", icon: "♫", name: "音符小花", where: "完成連鎖帶" },
  { id: "rocket", icon: "➶", name: "迷你火箭", where: "完成流星雨" },
  { id: "crown", icon: "♛", name: "船長王冠", where: "交到船長朋友" },
];

function trapModalFocus(event) {
  if (event.key !== "Tab") return;
  const buttons = event.currentTarget.querySelectorAll("button:not(:disabled)");
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function ComboMeter() {
  const remaining = useGameStore((s) =>
    s.game.combo > 0
      ? Math.max(
          0,
          Math.round((1 - (s.game.time - s.game.lastHitAt) / comboWindow(s.game)) * 20),
        )
      : 0,
  );
  return (
    <div className="combo-meter" aria-hidden="true">
      <i style={{ width: `${remaining * 5}%` }} />
    </div>
  );
}

function SoundButton() {
  const muted = useSaveStore((s) => s.isMuted);
  return (
    <button
      className="icon-button"
      aria-label={muted ? "開啟聲音" : "關閉聲音"}
      title={muted ? "開啟聲音" : "關閉聲音"}
      onClick={() => {
        initAudio();
        useSaveStore.getState().toggleMute();
      }}
    >
      {muted ? "♪̸" : "♫"}
    </button>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-orbit">✦</span>
      <span>
        星光救援隊<small>STARLIGHT RESCUE</small>
      </span>
    </div>
  );
}

function HomeScreen() {
  const difficulty = useGameStore((s) => s.difficulty);
  const best = useSaveStore((s) => s.bestScore);
  const collection = useSaveStore((s) => s.decorationIds.length);
  return (
    <section className="home-screen">
      <header className="topbar">
        <Brand />
        <div className="top-actions">
          <span className="best-score">
            最佳紀錄 <b>{best.toLocaleString()}</b>
          </span>
          <SoundButton />
        </div>
      </header>
      <div className="hero-copy">
        <div className="eyebrow">
          <span /> 太空小隊，準備出發
        </div>
        <h1>
          小小英雄，
          <br />
          大大<span>冒險。</span>
        </h1>
        <p className="hero-description">
          戳破泡泡、串起彩虹，
          <br />
          把愛搗蛋的烏雲船長，變成新朋友。
        </p>
        <div className="difficulty-picker" role="group" aria-label="冒險難度">
          {Object.entries(DIFFICULTIES).map(([id, mode]) => (
            <button key={id} aria-pressed={difficulty === id} onClick={() => useGameStore.getState().setDifficulty(id)}>{mode.name}</button>
          ))}
          <small>8 關冒險 · 後段加速與三層護甲</small>
        </div>
        <button
          className="primary-button start-button"
          onClick={() => useGameStore.getState().startLevel()}
        >
          開始大冒險 <span>↗</span>
        </button>
        <button
          className="text-button island-link"
          onClick={() => useGameStore.getState().setScreen("island")}
        >
          我的太空小島 <span>{collection} / 4 收藏</span> →
        </button>
        <div className="hero-note">不用學方向鍵，點一下就會玩。</div>
      </div>
      <div className="hero-character-tag">
        <span className="online-dot" /> 啵啵與夥伴們{" "}
        <small>正在等你一起出發！</small>
      </div>
      <div className="mission-strip">
        <div>
          <span className="feature-icon mint">✧</span>
          <p>
            <b>一滑，連成一串</b>
            <small>連擊越多，星光越亮</small>
          </p>
        </div>
        <div>
          <span className="feature-icon peach">ϟ</span>
          <p>
            <b>集滿，放個大招</b>
            <small>整片泡泡一起啵！</small>
          </p>
        </div>
        <div>
          <span className="feature-icon lilac">♛</span>
          <p>
            <b>最後，挑戰船長</b>
            <small>戳戳鼻子，化敵為友</small>
          </p>
        </div>
      </div>
      <footer className="home-footer">
        <span>霓虹泡泡樂園 · 7 個星區 + 船長挑戰</span>
        <span>為好奇的小小探險家打造 ✦</span>
      </footer>
    </section>
  );
}

function GameHUD() {
  const stage = useGameStore((s) => s.game.stage);
  const score = useGameStore((s) => s.game.score);
  const cleared = useGameStore((s) => s.game.cleared);
  const combo = useGameStore((s) => s.game.combo);
  const energy = useGameStore((s) => s.game.energy);
  const phase = useGameStore((s) => s.game.phase);
  const banner = useGameStore((s) =>
    s.game.time < s.game.bannerUntil ? s.game.banner : "",
  );
  const bursting = useGameStore((s) => s.game.time - s.game.burstAt < 0.7);
  const targets = useGameStore((s) => s.game.targets);
  const sector = SECTORS[stage];
  const ready = energy >= 100 && phase === "active";
  return (
    <>
      <header className="game-topbar">
        <div className="sector-heading">
          <span className="sector-number">
            {sector.boss ? "♛" : `0${stage + 1}`}
          </span>
          <div>
            <small>{sector.boss ? "最後的好朋友" : "救援進行中"}</small>
            <h2>{sector.name}</h2>
          </div>
        </div>
        <div className="route" aria-label={`目前第 ${stage + 1} 區，共 ${SECTORS.length} 區`}>
          {SECTORS.map((s, i) => (
            <span
              key={s.name}
              className={i === stage ? "current" : i < stage ? "done" : ""}
            >
              {i < stage ? "✓" : s.boss ? "♛" : i + 1}
            </span>
          ))}
        </div>
        <div className="top-actions">
          <SoundButton />
          <button
            className="icon-button"
            aria-label="暫停遊戲"
            onClick={() => useGameStore.getState().pauseGame()}
          >
            Ⅱ
          </button>
        </div>
      </header>
      <div className="progress-row">
        <div className="progress-track">
          <div
            style={{
              width: `${Math.min(100, (cleared / sector.total) * 100)}%`,
              background: sector.color,
            }}
          />
        </div>
        <span>
          {cleared} <i>/ {sector.total}</i>
        </span>
      </div>
      {banner && phase !== "interlude" && (
        <div className="mission-hint" key={banner}>
          {banner}
        </div>
      )}
      <div className="score-panel">
        <span>星光分數</span>
        <strong>{score.toLocaleString()}</strong>
        {combo >= 2 && (
          <div className={`combo-tag ${combo >= 8 ? "hot" : ""}`} key={combo}>
            <b>{combo}</b> 連擊{" "}
            <span>×{Math.min(4, 1 + Math.floor(combo / 4))}</span>
            <ComboMeter />
          </div>
        )}
      </div>
      <div className="game-bottom">
        <p className="control-hint">
          <span>☝</span> 點一下救援
          <br />
          <small>按住滑過泡泡，接出連擊</small>
        </p>
        <button
          className={`burst-button ${ready ? "ready" : ""}`}
          disabled={!ready || !targets.length}
          onClick={() => useGameStore.getState().burst()}
          aria-label={`星光大招，能量 ${energy}%`}
        >
          <span className="burst-icon" style={{ "--charge": `${energy}%` }}>
            ϟ
          </span>
          <span>
            <b>{ready ? "放大招！" : "星光充能"}</b>
            <small>
              {ready ? "點一下，全場啵！" : `${energy}% · 救援就能充電`}
            </small>
          </span>
          {ready && <kbd>SPACE</kbd>}
        </button>
      </div>
      <div className="keyboard-targets" aria-label="鍵盤救援目標">
        {targets.map((t, i) => (
          <button key={t.id} onClick={() => useGameStore.getState().hit(t.id)}>
            救援目標 {i + 1}
            {t.kind === "armored"
                ? `（護甲剩 ${t.hp} 層）`
              : t.kind === "rainbow"
                ? "（連鎖）"
                : ""}
          </button>
        ))}
      </div>
      {bursting && <div className="burst-flash" aria-hidden="true" />}
      {phase === "interlude" && (
        <div className="interlude">
          <div className="interlude-card">
            <span className="interlude-icon">✦</span>
            <small>太棒了！又多一個新朋友</small>
            <h2>
              {sector.name}
              <br />
              <em>救援成功！</em>
            </h2>
            <p>已收藏：{DECOR.find((d) => d.id === sector.reward).name}</p>
            <div className="next-sector">
              下一站 · {SECTORS[stage + 1]?.name} →
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PauseMenu() {
  const reduced = useSaveStore((s) => s.reducedMotion);
  return (
    <div className="modal-backdrop">
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        onKeyDown={trapModalFocus}
      >
        <span className="modal-symbol">☾</span>
        <div className="eyebrow">太空船休息一下</div>
        <h2 id="pause-title">冒險等你回來</h2>
        <p>泡泡和小夥伴都在原地等你。</p>
        <button
          autoFocus
          className="primary-button"
          onClick={() => useGameStore.getState().resumeGame()}
        >
          繼續冒險 →
        </button>
        <button
          className="secondary-button"
          onClick={() => useGameStore.getState().startLevel()}
        >
          重新出發
        </button>
        <button
          className="text-button"
          onClick={() => useGameStore.getState().setScreen("island")}
        >
          結束這趟，回小島
        </button>
        <div className="pause-settings">
          <SoundButton />
          <button
            className={`setting-toggle ${reduced ? "active" : ""}`}
            onClick={() => useSaveStore.getState().toggleMotion()}
          >
            柔和動態 {reduced ? "開" : "關"}
          </button>
        </div>
        <small className="muted-text">已取得的收藏會保留</small>
      </section>
    </div>
  );
}

function ResultScreen() {
  const score = useGameStore((s) => s.game.score);
  const combo = useGameStore((s) => s.game.bestCombo);
  const rescued = useGameStore((s) => s.game.rescued);
  return (
    <div className="modal-backdrop result-backdrop">
      <section
        className="modal-card result-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        onKeyDown={trapModalFocus}
      >
        <div className="victory-stars">
          ✦ <span>♛</span> ✦
        </div>
        <div className="eyebrow">任務完成 · 宇宙又晴天了</div>
        <h2 id="result-title">
          你交到了一整隊
          <br />
          <em>太空好朋友！</em>
        </h2>
        <p>連烏雲船長，都被你逗笑了。</p>
        <div className="result-stats">
          <div>
            <strong>{score.toLocaleString()}</strong>
            <small>星光分數</small>
          </div>
          <div>
            <strong>{combo}</strong>
            <small>最高連擊</small>
          </div>
          <div>
            <strong>{rescued}</strong>
            <small>成功救援</small>
          </div>
        </div>
        <div className="reward-row">
          {DECOR.map((d) => (
            <span key={d.id} title={d.name}>
              {d.icon}
            </span>
          ))}
          <p>
            4 件太空收藏
            <br />
            <small>已放進你的收藏櫃</small>
          </p>
        </div>
        <button
          autoFocus
          className="primary-button"
          onClick={() => useGameStore.getState().setScreen("island")}
        >
          去布置我的小島 →
        </button>
        <button
          className="secondary-button"
          onClick={() => useGameStore.getState().startLevel()}
        >
          再冒險一次，挑戰新連擊
        </button>
        <button
          className="text-button"
          onClick={() => useGameStore.getState().setScreen("home")}
        >
          回首頁，休息一下
        </button>
      </section>
    </div>
  );
}

function IslandScreen() {
  const owned = useSaveStore((s) => s.decorationIds);
  const selected = useGameStore((s) => s.selectedDecoration);
  const slots = useSaveStore((s) => s.slots);
  const notice = useGameStore((s) => s.decorationNotice);
  return (
    <section className="island-screen">
      <header className="topbar">
        <button
          className="back-button"
          onClick={() => useGameStore.getState().setScreen("home")}
        >
          ← 回首頁
        </button>
        <Brand />
        <SoundButton />
      </header>
      <div className="island-heading">
        <div className="eyebrow">YOUR LITTLE UNIVERSE</div>
        <h1>我的太空小島</h1>
        <p>
          {selected
            ? "點島上的數字，或下方按鈕，把收藏放上去。"
            : "抓住小鳥拖著飛，放手自由落下；點一下也會跳！"}
        </p>
      </div>
      <div className="island-stage" aria-hidden="true" />
      <div className="collection-panel">
        <div className="collection-title">
          <h2>
            冒險收藏櫃 <span>{owned.length} / 4</span>
          </h2>
          <button
            className="text-button"
            onClick={() => useGameStore.getState().startLevel()}
          >
            去救援，找收藏 ↗
          </button>
        </div>
        <div className="decoration-list">
          {DECOR.map((d) => (
            <button
              key={d.id}
              className={`decoration-card ${selected === d.id ? "selected" : ""}`}
              aria-pressed={selected === d.id}
              disabled={!owned.includes(d.id)}
              onClick={() => useGameStore.getState().selectDecoration(d.id)}
            >
              <span>{d.icon}</span>
              <b>{d.name}</b>
              <small>
                {owned.includes(d.id)
                  ? Object.values(slots).includes(d.id)
                    ? "已擺放 · 可換位置"
                    : "點一下擺放"
                  : d.where}
              </small>
            </button>
          ))}
        </div>
        <p className="decoration-notice" role="status">{notice || (selected ? `已選：${DECOR.find((d) => d.id === selected)?.name}，請選擇位置` : owned.length ? "選擇上方小物，即可擺放或換位置" : "先完成第一關，就能取得風車！")}</p>
          <div className="slot-picker">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                disabled={!selected}
                onClick={() => useGameStore.getState().decorate(i)}
              >
                位置 {i + 1} · {slots[i] ? DECOR.find((d) => d.id === slots[i])?.name : "空位"}
              </button>
            ))}
            <button
              className="text-button"
              onClick={() => useGameStore.getState().selectDecoration(null)}
            >
              取消
            </button>
          </div>
      </div>
    </section>
  );
}

export function UIRoot() {
  const screen = useGameStore((s) => s.screen);
  const saveWarning = useGameStore((s) => s.saveWarning);
  return (
    <div className="ui-root">
      {screen === "home" && <HomeScreen />}
      {(screen === "playing" || screen === "paused") && <GameHUD />}
      {screen === "paused" && <PauseMenu />}
      {screen === "result" && <ResultScreen />}
      {screen === "island" && <IslandScreen />}
      {saveWarning && (
        <p className="save-warning" role="status">
          這個瀏覽器暫時無法保存；你仍可以繼續玩。
        </p>
      )}
    </div>
  );
}
