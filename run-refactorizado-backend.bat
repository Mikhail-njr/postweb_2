@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   SIS POST - Backend Refactorizado
echo   Servidor API en puerto 3000
echo ========================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    pause
    exit /b 1
)

:: Verificar si el puerto 3000 esta en uso
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo ADVERTENCIA: Puerto 3000 en uso (PID: %%a)
    echo Intentando matar proceso...
    taskkill /f /pid %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo.
echo Iniciando Backend en http://localhost:3000
echo ========================================
cd /d "%~dp0backend"

echo.
echo Comandos disponibles:
echo    npm run start  - Iniciar servidor (produccion)
echo    npm run dev    - Iniciar con watch mode (desarrollo)
echo.

start "Backend POS Refactorizado" cmd /k "npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    BACKEND EN EJECUCION
echo ========================================
echo.
echo API URL: http://localhost:3000/api
echo.
echo Endpoints disponibles:
echo    /api/auth       - Autenticacion
echo    /api/products   - Productos
echo    /api/sales      - Ventas
echo    /api/customers  - Clientes
echo    /api/deudas     - Cuentas corrientes
echo    /api/lotes      - Lotes de productos
echo    /api/caja       - Caja y cierres
echo.
echo Presiona cualquier tecla para salir...
echo (El servidor seguira corriendo en background)

pause >nul
