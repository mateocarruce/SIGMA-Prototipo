@echo off
cd /d "%~dp0"
if not exist .venv (
  echo Creando entorno virtual...
  python -m venv .venv
  call .venv\Scripts\activate.bat
  pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)
if not exist model.pkl (
  python train_model.py
)
echo.
echo === SIGMA - Microservicio ML (puerto 8000) ===
echo.
uvicorn main:app --host 0.0.0.0 --port 8000
pause
