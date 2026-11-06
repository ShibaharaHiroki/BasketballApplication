@echo off
cd /d "%~dp0frontend"

if not exist node_modules (
    echo [setup] Installing npm packages...
    call npm install
)

echo [start] Starting the frontend dev server...
call npm start
pause
