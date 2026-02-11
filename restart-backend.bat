@echo off
echo ========================================
echo Restarting Backend Server
echo ========================================
echo.

echo Stopping old backend process...
taskkill /F /PID 18612 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
cd backend
start "ERP Backend" cmd /k "npm start"

echo.
echo ========================================
echo Backend server is starting...
echo Check the new window for server logs
echo ========================================
pause
