@echo off
cd /d "%~dp0"

if not exist backend\node_modules call npm install --prefix backend
if not exist frontend\node_modules call npm install --prefix frontend
if not exist backend\.env copy backend\.env.example backend\.env > nul

echo [build] Building the frontend...
call npm run build
if errorlevel 1 (
    pause
    exit /b 1
)

echo [start] Starting the server...
call npm start
pause
