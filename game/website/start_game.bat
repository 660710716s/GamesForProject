@echo off
echo ==============================================
echo 🚀 Starting Adaptive Puzzle Platform
echo ==============================================

echo [1/2] Booting up Backend (FastAPI)...
start "Backend Server" cmd /k "cd backend && .venv\Scripts\python.exe -m uvicorn main:app --reload"

echo [2/2] Booting up Frontend (React)...
start "Frontend Server" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ✅ Servers are starting! 
echo.
echo -> Backend API will be available at: http://localhost:8000
echo -> Frontend UI will be available at: http://localhost:5173
echo.
echo You can minimize this window.
pause
