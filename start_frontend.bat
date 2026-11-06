@echo off
chcp 65001 > nul
cd /d "%~dp0frontend"

if not exist node_modules (
    echo [setup] npm パッケージをインストールしています...
    call npm install
)

echo [start] http://localhost:3000 でフロントエンドを起動します
call npm start
pause
