@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0\.."

echo ========================================
echo Build 数独刷宝 EXE package
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js and add it to PATH.
  pause
  exit /b 1
)

call npm.cmd run build:exe
if errorlevel 1 (
  echo EXE package build failed.
  pause
  exit /b 1
)

echo.
echo EXE package build completed.
echo Output: artifacts\package\数独刷宝-V1.2-win-x64
pause

endlocal
