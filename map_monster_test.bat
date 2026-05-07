@echo off
setlocal

cd /d "%~dp0"
set "PORT=8770"

echo ========================================
echo Monster Test Scene runner
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js and add it to PATH.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing WebApp dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Building WebApp...
call npm.cmd run build
if errorlevel 1 (
  echo WebApp build failed.
  pause
  exit /b 1
)

if /I "%~1"=="--check" (
  echo Monster Test runner check passed.
  exit /b 0
)

echo Stopping stale Monster Test server on port %PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$portPids = @(Get-NetTCPConnection -State Listen -LocalPort %PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); $targets = Get-CimInstance Win32_Process | Where-Object { ($portPids -contains $_.ProcessId) -and $_.Name -eq 'node.exe' }; foreach ($p in $targets) { Stop-Process -Id $p.ProcessId -Force }"
if errorlevel 1 (
  echo Failed to stop stale Monster Test server.
  pause
  exit /b 1
)

echo Starting Monster Test Scene...
set "CACHE_BUST=%RANDOM%%RANDOM%"
set "BROWSER_URL=http://127.0.0.1:%PORT%/monster-test?clear_cache=1&v=%CACHE_BUST%"
echo Browser URL: "%BROWSER_URL%"
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process '%BROWSER_URL%'"
call npm.cmd exec -- vite preview --host 127.0.0.1 --port %PORT%

endlocal
