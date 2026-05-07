@echo off
setlocal

cd /d "%~dp0"
set "SEED=%~1"
if "%SEED%"=="" set "SEED=map-editor-preview"
set "OUT=map\procedural_map_v1.json"

echo ========================================
echo Procedural Map JSON generator
echo ========================================
echo Seed: %SEED%
echo Output: %OUT%
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

call node scripts\generate-procedural-map-json.mjs --seed "%SEED%" --out "%OUT%"
if errorlevel 1 (
  echo Procedural map generation failed.
  pause
  exit /b 1
)

echo.
echo Generated %OUT%
echo Open mapEditor.bat, then load this JSON from the map folder.
pause

endlocal
