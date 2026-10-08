@echo off
rem Levanta la app localmente en http://localhost:5173 (Ctrl + C para cortar)
cd /d "%~dp0"

if not exist ".env" (
  echo Falta el archivo .env con los datos de Supabase.
  echo Copia .env.example como .env y completa VITE_SUPABASE_URL y VITE_SUPABASE_KEY.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

call npm run dev -- --open
pause
