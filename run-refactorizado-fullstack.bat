@echo off

echo ========================================
echo   SIS POST - Refactorizado
echo   Full Stack (Backend + Frontend)
echo ========================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    pause
    exit /b 1
)

:: Detener procesos existentes en puertos 3000 y 5173
echo Verificando puertos en uso...

:: Matar proceso en puerto 3000 si existe
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo Puerto 3000 liberado
)

:: Matar proceso en puerto 5173 si existe
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo Puerto 5173 liberado
)

timeout /t 2 /nobreak >nul

echo.
echo [1/2] Iniciando Backend (puerto 3000)...
echo ========================================
cd /d "%~dp0backend"
start "Backend POS Refactorizado" cmd /k "npm run dev"

echo.
echo [2/2] Iniciando Frontend Vite (puerto 5173)...
echo ========================================
cd /d "%~dp0frontend"
start "Frontend POS Refactorizado" cmd /k "npm run dev"

echo.
echo ========================================
echo    SISTEMA COMPLETO EN EJECUCION
echo ========================================
echo.
echo Backend (API):     http://localhost:3000
echo Frontend (Vite):  http://localhost:5173
echo.
echo Para detener los servidores:
echo    Cierra las ventanas de terminal abiertas
echo.
echo Ventanas abiertas:
echo    - "Backend POS Refactorizado"
echo    - "Frontend POS Refactorizado"
echo.

pause
