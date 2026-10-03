@echo off
echo Starting AI FarmWise Farmer Mobile App on http://localhost:5173 ...
cd /d "%~dp0client\farmer-app"
python -m http.server 5173 --bind 0.0.0.0
