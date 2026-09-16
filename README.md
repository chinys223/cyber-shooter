# 星光救援隊：霓虹泡泡樂園

保留科幻、霓虹與雷射主題的 3D 兒童救援遊戲。三個星區依序加入連鎖泡泡、雙層泡泡與更活潑的移動，最後挑戰烏雲船長。救援能累積連擊和星光大招，完成星區則取得小島收藏。

## 啟動

```powershell
cd "C:\r3f-game"
npm run dev
```

開啟終端機顯示的網址。首次取得專案且尚未有相依套件時，先執行 `npm install`。

## 玩法

- 點擊泡泡救出夥伴；按住滑過普通泡泡，可以接出連擊。
- 彩虹泡泡會連鎖救援附近目標；有金色環的雙層泡泡要分開點兩下。
- 在 3.2 秒內接上下一次救援可延續連擊，最高四倍得分；中斷不扣既有分數。
- 星光集滿後，點「放大招」或按空白鍵，一次清除目前泡泡。
- 船長關先點亮三顆環繞衛星，再戳鼻子；完成三輪即可交到船長朋友。
- Esc 暫停／繼續；切換分頁會自動暫停。Tab 可選擇救援目標，Enter 觸發。
- 每完成一個星區即保存收藏。小島先選收藏，再點位置 1–4；點角色會回應。
- 右上角可靜音；暫停選單可開啟柔和動態。未完成的當局不保存，已取得收藏保留。

## 檢查

```powershell
npm test
npm run lint
npm run build
```

`scripts/browser-smoke.mjs` 提供 Chrome／Playwright 的瀏覽器流程測試，需先啟動開發伺服器，並提供可用的 Playwright 安裝。可透過 `PLAYWRIGHT_MODULE` 指向其 `index.mjs`，以及 `CHROME_EXECUTABLE` 指向 Chrome 執行檔；`GAME_URL` 預設為 `http://127.0.0.1:5173`。截圖存至 `artifacts/playtest/`，不納入 Git。

## 文件

- [目前實作與驗證紀錄](docs/redesign/04-playable-redesign.md)
- [原始規劃文件](docs/redesign/README.md)
- [兒童試玩計畫](docs/redesign/03-playtest-plan.md)

React、React Three Fiber、Three.js、Zustand、Vite。角色與場景使用程式幾何模型，不依賴外部模型或字型下載。
