@echo off
REM ===== Yarn Procurement Portal - one-click STOP (laptop / dev) =====
REM Kills whatever is listening on port 4043 (the app server).

echo.
echo   Stopping Yarn Procurement Portal (port 4043) ...

set "found="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4043 ^| findstr LISTENING') do (
    set "found=1"
    taskkill /F /PID %%a >nul 2>&1
)

if defined found (
    echo   Stopped.
) else (
    echo   Nothing was running on port 4043.
)
echo.
timeout /t 2 /nobreak >nul
