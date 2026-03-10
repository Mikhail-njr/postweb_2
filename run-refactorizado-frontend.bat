@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   SIS POST - Frontend Refactorizado
echo   Servidor Vite en puerto 5173
echo ========================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    pause
    exit /b 1
)

:: Verificar si el puerto 5173 esta en uso
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo ADVERTENCIA: Puerto 5173 en uso (PID: %%a)
    echo Intentando matar proceso...
    taskkill /f /pid %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo.
echo Iniciando Frontend en http://localhost:5173
echo ========================================
cd /d "%~dp0frontend"

echo.
echo Comandos disponibles:
echo    npm run dev     - Servidor de desarrollo
echo    npm run build   - Build para produccion
echo    npm run preview - Preview del build
echo.

start "Frontend POS Refactorizado" cmd /k "npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    FRONTEND EN EJECUCION
echo ========================================
echo.
echo URL: http://localhost:5173
echo.
echo El frontend se conecta al backend en:
echo    http://localhost:3000/api
echo.
echo Presiona cualquier tecla para salir...
echo (El servidor seguira corriendo en background)

pause >nul
