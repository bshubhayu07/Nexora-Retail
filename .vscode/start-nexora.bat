@echo off

cd /d "%~dp0.."

start "Nexora Backend" cmd /k "cd /d backend && python run.py"

timeout /t 5 /nobreak >nul

start "Nexora Frontend" cmd /k "cd /d frontend && npm run dev"

timeout /t 5 /nobreak >nul

start http://localhost:5173
