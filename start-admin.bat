@echo off
echo Starting AI FarmWise Admin Dashboard on http://localhost:5174 ...
cd /d "%~dp0client\admin-dashboard"
python -m http.server 5174 --bind 0.0.0.0
