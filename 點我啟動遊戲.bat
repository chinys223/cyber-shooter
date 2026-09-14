@echo off
chcp 65001 >nul
echo ===================================
echo 正在準備啟動 3D 遊戲...
echo ===================================
echo.

:: 檢查並安裝依賴 (如果 node_modules 不存在或不完整)
if not exist "node_modules\" (
    echo 第一次執行，正在安裝必要的套件 (可能需要幾分鐘)...
    call npm install
)

echo 正在啟動遊戲伺服器並自動開啟瀏覽器...
call npm run dev -- --open

pause
