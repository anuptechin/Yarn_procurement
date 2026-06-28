@echo off
REM ===== Yarn Procurement Portal - one-click START (laptop / dev) =====
REM Serves the built app on http://localhost:4043 and opens the browser.
REM (Requires PostgreSQL to be running and the client already built:
REM  run "npm run setup" once after a fresh clone or code change.)

cd /d "%~dp0"
echo.
echo   Starting Yarn Procurement Portal on http://localhost:4043 ...
echo   (close the "YPP" window, or run stop.bat, to stop it)
echo.

REM Launch the server in its own window so this one can exit
start "YPP" cmd /k npm start

REM Give it a moment, then open the browser
timeout /t 4 /nobreak >nul
start "" http://localhost:4043
