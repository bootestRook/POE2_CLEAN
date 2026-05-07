@echo off
setlocal

cd /d "%~dp0"
set "PORT=8767"
set "DIST_DIR=dist-map-editor"

echo ========================================
echo MapEditor one-click runner
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

echo Building MapEditor WebApp...
set "VITE_OUT_DIR=%DIST_DIR%"
call npm.cmd run build
if errorlevel 1 (
  echo MapEditor WebApp build failed.
  pause
  exit /b 1
)

if /I "%~1"=="--check" (
  echo MapEditor runner check passed.
  exit /b 0
)

echo Stopping stale MapEditor server on port %PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$portPids = @(Get-NetTCPConnection -State Listen -LocalPort %PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); $targets = Get-CimInstance Win32_Process | Where-Object { ($portPids -contains $_.ProcessId) -and $_.Name -eq 'node.exe' }; foreach ($p in $targets) { Stop-Process -Id $p.ProcessId -Force }"
if errorlevel 1 (
  echo Failed to stop stale MapEditor server.
  pause
  exit /b 1
)

for /f %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($p = 8767; $p -le 8780; $p++) { if (-not (Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue)) { Write-Output $p; break } }"') do set "PORT=%%P"
if "%PORT%"=="" (
  echo Could not find a free MapEditor port between 8767 and 8780.
  pause
  exit /b 1
)

echo Starting MapEditor...
set "CACHE_BUST=%RANDOM%%RANDOM%"
set "BROWSER_URL=http://127.0.0.1:%PORT%/map-editor?clear_cache=1&v=%CACHE_BUST%"
echo Browser URL: "%BROWSER_URL%"
start "" "%BROWSER_URL%"
call npm.cmd exec -- vite preview --host 127.0.0.1 --port %PORT% --strictPort
if errorlevel 1 (
  echo MapEditor preview server failed.
  pause
  exit /b 1
)

endlocal
