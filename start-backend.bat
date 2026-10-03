@echo off
echo Starting AI FarmWise FastAPI Backend on http://localhost:8000 ...
cd /d "%~dp0server"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
