@echo off
chcp 65001 > nul
cd /d "%~dp0backend"

if not exist venv (
    echo [setup] 仮想環境を作成しています...
    python -m venv venv
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

if not exist .env copy .env.example .env > nul

echo [start] http://localhost:8000 でバックエンドを起動します
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
