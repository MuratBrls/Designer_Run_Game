@echo off
title Designer Run - Launcher
echo ====================================
echo      DESIGNER RUN LAUNCHER
echo ====================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Hata: Bilgisayarinizda Node.js kurulu degil!
    echo Lutfen https://nodejs.org/ adresinden kurun ve tekrar deneyin.
    echo.
    pause
    exit /b
)

:: Check and install dependencies if missing
if not exist node_modules (
    echo Ilk kurulum yapiliyor, lutfen bekleyin ^(npm install^)...
    call npm install
)

echo.
echo Oyun baslatiliyor...
call npm start
