# AI FarmWise

**An Agentic AI Farm Decision Support Platform that converts multi-source farm data (ESP32 telemetry, ECMWF satellite soil moisture, Open-Meteo weather forecasts, and crop vision scans) into explainable, human-approved, and closed-loop verified actions.**

---

## Demo Video

> 🎥 **[Watch AI FarmWise Demo Video (Google Drive)](https://drive.google.com/file/d/180096266ZoxTUd_cUbkQdl2cNgWfliMS/view?usp=sharing)**
>
> Direct Link: `https://drive.google.com/file/d/180096266ZoxTUd_cUbkQdl2cNgWfliMS/view?usp=sharing`

---

## Short Project Description

**AI FarmWise** bridges the gap between IoT soil sensing, satellite reanalysis, weather forecasting, and verified field execution. Instead of static rule scripts, it runs a stateful **Goal-Driven Agentic AI Engine (`FarmManagerAgent`)** that observes farm state, dynamically selects from 18 allowlisted tools, replans automatically when hardware or sensors fail, requests Human-in-the-Loop (HITL) approval before physical actuation, and verifies post-action outcomes.

---

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic, WebSockets
- **Database**: SQLite + SQLAlchemy ORM (auto-migrating schema & realistic multi-farm seed data)
- **Agentic AI & LLM Layer**: Custom 15-state `FarmManagerAgent`, `AgenticPlanner`, `AgentEvaluator`, `CapabilityRegistry` (18 structured tools), Groq (`llama-3.3-70b-versatile`) & Google Gemini (`gemini-2.5-flash`) with deterministic agronomic fallback
- **Geospatial & Weather Fusion**: Open-Meteo Forecast API + ECMWF IFS 9km Root-Zone Satellite Soil Moisture (`soil_moisture_3_to_9cm`) fused with physical ESP32 sensor readings (`0.6 * ESP32 + 0.4 * Satellite`)
- **Frontend (Dual Applications)**: React 18, Tailwind CSS, Lucide Icons, Multilingual Support (`English`, `తెలుగు`, `हिंदी`)
- **IoT & Robotics**: ESP32 Capacitive Soil Moisture Firmware (`firmware/esp32_soil_node.ino`), MAVLink Drone & Ground Rover Mission Simulators

---

## Farmer App (`Port 5173`)

A clean, mobile-first companion application designed for a single farmer (`client/farmer-app`):
- **5-Tab Bottom Navigation**: `Home | Farm | Scan | Tasks | AI`
- **Actionable Home Screen**: Immediately answers:
  1. **What is happening?** (Crop stage, fused soil moisture, weather forecast, active alerts)
  2. **What should I do?** (1-tap Approve/Reject recommended action + priority tasks)
  3. **Why?** (Zero-jargon explanation combining soil, weather, and crop stage)
- **25 Connected Farmer Capabilities**: Crop cycle tracking, dual-source soil fusion, leaf disease vision scanner, irrigation & NPK scheduling, yield & harvest planner, and multilingual voice readout (`English / తెలుగు / हिंदी`).

---

## Admin Dashboard (`Port 5174`)

A regional fleet operations center and live Agentic AI inspection console (`client/admin-dashboard`):
- **5-Scenario Live Jury Demo Bar**: One-click execution for *Irrigation*, *Crop Health*, *Drone Auto-Replan*, *Sensor Failure Satellite Fallback*, and *Harvest Planning* scenarios.
- **Live Agent Trace Inspector**: Inspects every `AgentRun` state transition, selected tools, tool outputs, replanning triggers, and closed-loop post-action verification.
- **Fleet & Hardware Operations**: Monitors 5 regional farms (`Ramesh, Suresh, Venkat, Priya, Lakshmi`), Dual-Source Soil Fusion Matrix, HITL Approval Queue, and Global Emergency Stop.

---

## Agentic AI Architecture

Implemented in `server/app/agents/farm_manager/farm_manager_agent.py` and `server/app/capabilities/registry.py`:

```text
USER GOAL
    ↓
FARM MANAGER AGENT (AgentRun created)
    ↓
OBSERVING (FarmMemory loads Farmer, Field, Crop, Soil, Weather, Scans, Tasks, History)
    ↓
PLANNING & SELECTING_TOOLS (AgenticPlanner selects from 18 allowlisted structured tools)
    ↓
EXECUTING (CapabilityRegistry executes tools with structured inputs/outputs)
    ↓
EVALUATING (AgentEvaluator inspects tool outputs: CONTINUE | REPLAN | AWAIT_APPROVAL | COMPLETED)
    ↓
REPLANNING (Dynamic fallback — e.g., Drone LOW_BATTERY -> Rover -> Manual FarmerTask)
    ↓
AWAITING_APPROVAL (Human-in-the-Loop gate for physical irrigation, drone, or rover dispatch)
    ↓
ACTING (Executes approved physical/simulated action + updates tasks/telemetry)
    ↓
VERIFYING (Post-action sensor verification: checks if soil moisture / field state improved)
    ↓
COMPLETED (Persists full state_history, tool_results, and decision_summary to FarmMemory)
```

---

## How to Run the Project

### 1. Install Backend Dependencies
```bash
cd server
pip install -r requirements.txt
```
*(Optional)* Copy `.env.example` to `server/.env` to add `GROQ_API_KEY` or `GEMINI_API_KEY`. The platform runs out-of-the-box without external keys using its built-in deterministic agronomic engine.

### 2. Start the FastAPI Backend (`Port 8000`)
```bash
cd server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Swagger API Docs: `http://localhost:8000/docs`

### 3. Start the Farmer Mobile App (`Port 5173`)
```bash
cd client/farmer-app
python -m http.server 5173 --bind 0.0.0.0
```
- Farmer App URL: `http://localhost:5173`

### 4. Start the Admin Dashboard (`Port 5174`)
```bash
cd client/admin-dashboard
python -m http.server 5174 --bind 0.0.0.0
```
- Admin Dashboard URL: `http://localhost:5174`

*(On Windows, you can also double-click `start-backend.bat`, `start-farmer.bat`, and `start-admin.bat`.)*

### 5. Run Automated Tests
```bash
pytest tests/test_vertical_slice.py -v
```
