@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo ERROR: Node.js 20.19+ required & pause & exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm required & pause & exit /b 1)
if not exist frontend\node_modules\vite (echo Installing frontend packages... & call npm --prefix frontend install || (pause & exit /b 1))
echo Building RoboForge frontend...
call npm --prefix frontend run build || (echo Frontend build FAILED & pause & exit /b 1)
node scripts\ensure-port-free.js || (echo Port conflict: Stop the previous RoboForge instance first. & pause & exit /b 1)
echo Starting RoboForge on http://127.0.0.1:3001
start "RoboForge" http://127.0.0.1:3001
node backend\server.js
pause
