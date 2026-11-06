@echo off
cd /d "%~dp0backend"

if not exist node_modules (
    echo [setup] Installing npm packages...
    call npm install
)

if not exist .env copy .env.example .env > nul

echo [start] Starting the API server in watch mode...
call npm run dev
pause
