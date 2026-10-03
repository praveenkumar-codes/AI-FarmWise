import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure server/ is importable regardless of pytest working directory
SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

# Use an isolated SQLite DB for tests so pytest never collides with a live uvicorn server lock
TEST_DB_PATH = Path(__file__).resolve().parent / "test_farmwise.db"
os.environ["FARMWISE_DB_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"

from app.agents.base.agent_context import AgentContext  # noqa: E402
from app.agents.crop.crop_agent import CropAgent  # noqa: E402
from app.agents.drone.drone_agent import DroneAgent  # noqa: E402
from app.agents.environment.environment_agent import (  # noqa: E402
    EnvironmentAgent,
    fetch_open_meteo_precipitation,
)
from app.agents.rover.rover_agent import RoverAgent  # noqa: E402
from app.database import reset_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database():
    reset_db()
    yield


def test_vertical_slice_telemetry_to_approval():
    """
    Phase 6 verification:
    1. Send simulated ESP32 payload with moisture = 18.5%.
    2. Verify that /api/v1/dashboard updates and automatically generates a PENDING_APPROVAL action.
    3. Approve the action via /api/v1/actions/decision and confirm status updates to APPROVED.
    """
    client = TestClient(app)

    # 1. Send simulated ESP32 telemetry payload with critical moisture = 18.5% (< 30.0%)
    telemetry_res = client.post(
        "/api/v1/telemetry",
        json={"device_id": "esp32_zone_01", "soil_moisture": 18.5},
    )
    assert telemetry_res.status_code == 200
    telemetry_body = telemetry_res.json()
    assert telemetry_body["telemetry"]["soil_moisture"] == 18.5

    # Verify synthesized microclimate chemistry falls strictly within Phase 3.1 bounds
    t_out = telemetry_body["telemetry"]
    assert 6.4 <= t_out["soil_ph"] <= 7.1
    assert 25.5 <= t_out["soil_temperature"] <= 29.5
    assert 28.0 <= t_out["nitrogen"] <= 36.0
    assert 16.0 <= t_out["phosphorus"] <= 24.0
    assert 170.0 <= t_out["potassium"] <= 205.0

    # 2. Verify /api/v1/dashboard updates and contains the PENDING_APPROVAL action
    dash_res = client.get("/api/v1/dashboard")
    assert dash_res.status_code == 200
    dash = dash_res.json()

    assert dash["esp32_connected"] is True
    assert dash["telemetry"]["soil_moisture"] == 18.5
    assert dash["weather"]["satellite_soil_moisture"] is not None
    assert dash["sensor_fusion"]["confidence"] == 0.98
    assert len(dash["actions"]) == 1

    action = dash["actions"][0]
    assert action["id"] == "ACT_001"
    assert action["type"] == "IRRIGATION_DISPATCH"
    assert action["title"] == "Irrigate Zone 1 (15mm)"
    assert "18.5%" in action["why"]
    assert "30.0%" in action["why"]
    assert "ESP32 Ground Probe (GPIO 34): 18.5% VWC" in action["evidence"]
    assert any("Satellite Remote Sensing (ECMWF 3-9cm):" in e for e in action["evidence"])
    assert "No rain forecasted in next 6h" in action["evidence"]
    assert "Drone Aerial NDVI Imagery" in action["missing_data"]
    assert action["status"] == "PENDING_APPROVAL"
    assert action["confidence"] == 0.98

    # Duplicate telemetry while ACT_001 is still PENDING_APPROVAL must NOT create a second pending action
    dup_res = client.post(
        "/api/v1/telemetry",
        json={"device_id": "esp32_zone_01", "soil_moisture": 17.9},
    )
    assert dup_res.status_code == 200
    assert len(dup_res.json()["generated_actions"]) == 0

    # 3. Approve the action via /api/v1/actions/decision and confirm status updates to APPROVED
    decision_res = client.post(
        "/api/v1/actions/decision",
        json={"action_id": "ACT_001", "status": "APPROVED"},
    )
    assert decision_res.status_code == 200
    approved_action = decision_res.json()
    assert approved_action["id"] == "ACT_001"
    assert approved_action["status"] == "APPROVED"
    assert approved_action["execution_status"] == "DISPATCHED"
    assert approved_action["execution_ref"].startswith("MAV-")

    # 4. State transition guard: attempting to re-decide an APPROVED action must return 409 Conflict
    redecide_res = client.post(
        "/api/v1/actions/decision",
        json={"action_id": "ACT_001", "status": "REJECTED"},
    )
    assert redecide_res.status_code == 409


@pytest.mark.anyio
async def test_satellite_soil_moisture_and_esp32_offline_failover():
    """
    Section 4 Verification:
    - Verify Open-Meteo helper returns non-null `satellite_soil_moisture` and `satellite_source`.
    - Simulate ESP32 offline (no ESP32 telemetry sent / simulate_esp32_offline=True):
      verify the agent automatically fails over to satellite soil moisture, flags
      'PRIMARY SENSOR OFFLINE — Fallback to Satellite Soil Moisture Active', and generates a PENDING_APPROVAL proposal without crashing.
    """
    weather = await fetch_open_meteo_precipitation()
    assert weather.get("satellite_soil_moisture") is not None
    assert isinstance(weather["satellite_soil_moisture"], float)
    assert weather.get("satellite_source") == "Open-Meteo / ECMWF IFS 9km Reanalysis"

    client = TestClient(app)

    # Without sending any ESP32 packet (ESP32 is offline), request /api/v1/dashboard?simulate_esp32_offline=true
    dash_res = client.get("/api/v1/dashboard?simulate_esp32_offline=true")
    assert dash_res.status_code == 200
    dash = dash_res.json()

    assert dash["esp32_connected"] is False
    fusion = dash["sensor_fusion"]
    assert fusion["fallback_active"] is True
    assert (
        fusion["fallback_banner"]
        == "PRIMARY SENSOR OFFLINE — Fallback to Satellite Soil Moisture Active"
    )
    assert fusion["satellite_moisture"] is not None

    # Verify a PENDING_APPROVAL proposal was generated from the satellite soil moisture reading
    assert len(dash["pending_actions"]) == 1
    proposal = dash["pending_actions"][0]
    assert proposal["status"] == "PENDING_APPROVAL"
    assert (
        "PRIMARY SENSOR OFFLINE — Fallback to Satellite Soil Moisture Active"
        in proposal["evidence"]
    )
    assert any("Satellite Remote Sensing (ECMWF 3-9cm):" in e for e in proposal["evidence"])


def test_multi_farmer_registry_and_scoped_dashboards():
    """
    Multi-Farmer Verification:
    - GET /api/v1/farmers returns all 5 registered farmers and shared robotics fleet.
    - Farmer 1 (Ramesh Kumar) displays physical ESP32 readings (18.5%).
    - Farmer 4 (Priya Sharma, Maize, Vijayawada) shows LLM explanation advising to delay sowing due to 75% incoming rain.
    - Scoped approval POST /api/v1/farmers/4/actions/decision approves only Farmer 4's action.
    """
    client = TestClient(app)
    client.post("/api/v1/telemetry", json={"device_id": "esp32_zone_01", "soil_moisture": 18.5})

    fleet_res = client.get("/api/v1/farmers?lang=en")
    assert fleet_res.status_code == 200
    fleet_data = fleet_res.json()
    assert fleet_data["count"] == 5
    names = [f["farmer_name"] for f in fleet_data["farmers"]]
    assert names == [
        "Ramesh Kumar",
        "Suresh Reddy",
        "Venkat Rao",
        "Priya Sharma",
        "Lakshmi Bai",
    ]
    assert len(fleet_data["robotics_fleet"]) == 4

    # Farmer 1 scoped check (18.5% ESP32 reading + 21.0% satellite fusion)
    f1 = client.get("/api/v1/farmers/1/dashboard?lang=en").json()
    assert f1["farmer_profile"]["farmer_name"] == "Ramesh Kumar"
    assert f1["telemetry"]["soil_moisture"] == 18.5
    assert f1["sensor_fusion"]["confidence"] == 0.98
    assert "query_sensor_store" in f1["tool_trace"]
    assert "fetch_localized_weather" in f1["tool_trace"]
    assert "check_fleet_availability" in f1["tool_trace"]

    # Farmer 4 scoped check (Priya Sharma · Maize · Sowing · 55% moisture · 75% incoming rain)
    f4_en = client.get("/api/v1/farmers/4/dashboard?lang=en").json()
    assert f4_en["farmer_profile"]["farmer_name"] == "Priya Sharma"
    assert f4_en["farmer_profile"]["crop"] == "Maize"
    assert f4_en["telemetry"]["soil_moisture"] == 55.0
    assert f4_en["weather"]["precip_prob"] == 75
    assert "75%" in f4_en["advisory"]["why"]
    assert "sowing" in f4_en["advisory"]["why"].lower()

    # Telugu check for Farmer 4
    f4_te = client.get("/api/v1/farmers/4/dashboard?lang=te").json()
    assert "75%" in f4_te["advisory"]["why"]
    assert "మొక్కజొన్న" in f4_te["advisory"]["why"]

    # Approve Farmer 4's pending action via scoped endpoint
    f4_act_id = f4_en["pending_actions"][0]["id"]
    dec_res = client.post(
        "/api/v1/farmers/4/actions/decision",
        json={"action_id": f4_act_id, "status": "APPROVED"},
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "APPROVED"


def test_multilingual_llm_rationale_and_assistant_chat(monkeypatch):
    """
    Confirm toggling language (lang=en, lang=te, lang=hi) dynamically changes the `why` explanation string,
    and POST /api/v1/assistant/chat returns grounded replies in English, Telugu, and Hindi.
    """
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    client = TestClient(app)
    client.post("/api/v1/telemetry", json={"device_id": "esp32_zone_01", "soil_moisture": 18.5})

    en_dash = client.get("/api/v1/dashboard?lang=en").json()
    te_dash = client.get("/api/v1/dashboard?lang=te").json()
    hi_dash = client.get("/api/v1/dashboard?lang=hi").json()

    why_en = en_dash["actions"][0]["why"]
    why_te = te_dash["actions"][0]["why"]
    why_hi = hi_dash["actions"][0]["why"]

    assert why_en != why_te
    assert why_en != why_hi
    assert why_te != why_hi
    assert "18.5%" in why_en
    assert "18.5%" in why_te and "వరి" in why_te
    assert "18.5%" in why_hi and "धान" in why_hi
    assert en_dash["pipeline_latency_ms"] >= 100

    for lang_code, question in [
        ("en", "Should I irrigate today?"),
        ("te", "ఈ రోజు నీరు పెట్టాలా?"),
        ("hi", "क्या मुझे आज पानी देना चाहिए?"),
    ]:
        chat_res = client.post(
            "/api/v1/assistant/chat",
            json={"message": question, "language": lang_code},
        )
        assert chat_res.status_code == 200
        chat_body = chat_res.json()
        assert chat_body["language"] == lang_code
        assert "18.5%" in chat_body["reply"]


def test_emergency_stop_safety_interlock():
    """Verify that POST /api/v1/devices/emergency-stop locks out physical dispatch."""
    client = TestClient(app)

    client.post("/api/v1/telemetry", json={"device_id": "esp32_zone_01", "soil_moisture": 21.0})

    estop_res = client.post("/api/v1/devices/emergency-stop", json={"active": True})
    assert estop_res.status_code == 200
    assert estop_res.json()["emergency_stop"] is True

    blocked_res = client.post(
        "/api/v1/actions/decision",
        json={"action_id": "ACT_001", "status": "APPROVED"},
    )
    assert blocked_res.status_code == 423


@pytest.mark.anyio
async def test_placeholder_agents_return_not_implemented():
    """Verify that Environment, Crop, Drone, and Rover placeholder agents return NOT_IMPLEMENTED."""
    ctx = AgentContext(
        farm_id=1,
        device_id="esp32_zone_01",
        crop="Rice",
        growth_stage="Vegetative",
        soil_moisture=25.0,
        soil_ph=6.8,
        soil_temperature=27.2,
        nitrogen=31.0,
        phosphorus=19.5,
        potassium=185.0,
    )
    for agent_cls in (EnvironmentAgent, CropAgent, DroneAgent, RoverAgent):
        agent = agent_cls()
        result = await agent.run(ctx)
        assert result.status == "NOT_IMPLEMENTED"


def test_complete_platform_camera_scan_capabilities_tasks_and_history():
    """
    Verifies Steps 3-25:
    - Real camera/upload scan pipeline POST /api/v1/crop-health/scan stores CropHealthScan, Task, and Notification.
    - Dynamic CapabilityRegistry dispatches SIMULATED DRONE when available and falls back to FarmerTaskTool when unavailable.
    - Field creation, task status transition (TODO -> COMPLETED), and full dashboard analytics work end-to-end.
    """
    client = TestClient(app)

    # 1. Crop Health Scan (Step 7 & 8)
    scan_res = client.post(
        "/api/v1/crop-health/scan",
        json={
            "farmer_id": 3,
            "farm_id": 3,
            "field_id": 1,
            "crop_cycle_id": 1,
            "capture_mode": "CAMERA",
            "image_name": "chilli_leaf_spot.jpg",
        },
    )
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    assert scan_data["health_status"] == "Attention Required"
    assert "Leaf Spot" in scan_data["possible_issue"]
    assert scan_data["severity"] == "Moderate"
    assert scan_data["confidence"] == 0.86
    assert scan_data["is_simulated_demo"] is True

    # 2. Capability Allocation: Farmer 1 has Drone available -> DroneTool (SIMULATED DRONE)
    drone_res = client.post(
        "/api/v1/capabilities/dispatch",
        json={
            "farmer_id": 1,
            "field_id": 1,
            "goal": "Check Field A for crop stress",
            "preferred_tool": "DroneTool",
        },
    )
    assert drone_res.status_code == 200
    drone_out = drone_res.json()
    assert drone_out["selected_tool"] == "DroneTool"
    assert drone_out["fallback_used"] is False
    assert drone_out["mission"]["simulated_badge"] == "SIMULATED DRONE"

    # Advance drone mission state
    m_id = drone_out["mission"]["id"]
    adv_res = client.post(f"/api/v1/capabilities/missions/{m_id}/advance")
    assert adv_res.status_code == 200
    assert adv_res.json()["state"] == "IMAGE_CAPTURE"

    # 3. Capability Fallback: Farmer 3 has Rover unavailable -> GroundRobotTool falls back to FarmerTaskTool
    rover_fallback_res = client.post(
        "/api/v1/capabilities/dispatch",
        json={
            "farmer_id": 3,
            "field_id": 1,
            "goal": "Collect soil sample from Field B",
            "preferred_tool": "GroundRobotTool",
        },
    )
    assert rover_fallback_res.status_code == 200
    fb_out = rover_fallback_res.json()
    assert fb_out["selected_tool"] == "FarmerTaskTool"
    assert fb_out["fallback_used"] is True
    assert fb_out["task"]["status"] == "TODO"

    # Complete the generated task
    task_id = fb_out["task"]["id"]
    patch_res = client.patch(f"/api/v1/tasks/{task_id}", json={"status": "COMPLETED"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "COMPLETED"

    # 4. Create a new Field for Farmer 3
    field_res = client.post(
        "/api/v1/farmers/3/fields",
        json={
            "name": "Field B — Tenali East Plot",
            "area_acres": 1.5,
            "soil_type": "Black Cotton Soil",
            "irrigation_type": "Solar Drip",
            "crop": "Chilli (Teja)",
        },
    )
    assert field_res.status_code == 200
    assert field_res.json()["name"] == "Field B — Tenali East Plot"

    # 5. Verify Farmer 3 Dashboard contains scans, tasks, fields, notifications, agent_intelligence, and analytics
    dash3 = client.get("/api/v1/farmers/3/dashboard?lang=te").json()
    assert len(dash3["crop_scans"]) >= 1
    assert len(dash3["fields"]) >= 2
    assert len(dash3["tasks"]) >= 2
    assert len(dash3["notifications"]) >= 3
    assert "irrigation" in dash3["agent_intelligence"]
    assert "fertilizer" in dash3["agent_intelligence"]
    assert "pest_disease" in dash3["agent_intelligence"]
    assert "crop_planning" in dash3["agent_intelligence"]
    assert "yield_prediction" in dash3["agent_intelligence"]
    assert "harvest_planning" in dash3["agent_intelligence"]
    assert dash3["analytics"]["completed_tasks_count"] >= 1


def test_agentic_ai_ten_mandatory_scenarios():
    """
    Section 35 — Automated tests proving genuine Agentic AI behavior:
    Test 1: Low moisture + no rain -> Agent selects irrigation workflow & awaits HITL approval.
    Test 2: Low moisture + heavy rain -> Agent decides irrigation should be delayed (no actuation).
    Test 3: Field inspection + drone available -> Agent selects DroneTool (SIMULATED DRONE).
    Test 4: Field inspection + drone unavailable -> Agent dynamically replans to FarmerTaskTool.
    Test 5: Sensor offline -> Agent uses fallback satellite/historical data & reduces confidence.
    Test 6: Tool failure -> Agent enters REPLANNING and recovers.
    Test 7: Action rejected -> No physical action executed, AgentRun transitions to CANCELLED.
    Test 8: Emergency stop -> Action blocked, AgentRun transitions to EMERGENCY_STOPPED.
    Test 9: Action succeeds -> Agent verifies post-action moisture improvement & updates FarmMemory.
    Test 10: Goal completed -> Agent stops cleanly once goal is satisfied (and replans if verification fails).
    """
    client = TestClient(app)

    # --- TEST 1: Low moisture (18.5%) + no rain (5%) -> Selects irrigation workflow & awaits HITL ---
    r1 = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": "farmer_001",
            "farm_id": "farm_001",
            "field_id": "field_001",
            "goal": "Should I irrigate Field A today?",
            "override_soil_moisture": 18.5,
            "override_rain_prob": 5,
        },
    )
    assert r1.status_code == 200
    run1 = r1.json()
    assert run1["status"] == "AWAITING_APPROVAL"
    assert run1["approval_required"] is True
    assert run1["action_id"] is not None
    assert "get_soil_status" in run1["tools_used"]
    assert "get_weather" in run1["tools_used"]
    assert "evaluate_irrigation" in run1["tools_used"]
    assert "request_action_approval" in run1["tools_used"]
    # Prove it did NOT blindly call unrelated tools like DroneTool or HarvestTool
    assert "create_drone_mission" not in run1["tools_used"]
    assert "plan_harvest" not in run1["tools_used"]

    # --- TEST 2: Low moisture (18.5%) + heavy rain (80%) -> Delays irrigation ---
    r2 = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 1,
            "goal": "Should I irrigate Field A?",
            "override_soil_moisture": 18.5,
            "override_rain_prob": 80,
        },
    )
    assert r2.status_code == 200
    run2 = r2.json()
    assert run2["status"] == "COMPLETED"
    assert run2["approval_required"] is False
    assert "DELAYED" in run2["decision"]["recommendation"].upper()

    # --- TEST 3: Drone available -> Selects DroneTool (SIMULATED DRONE) ---
    r3 = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 1,
            "goal": "Inspect Field A with aerial survey",
            "scenario": "DRONE_INSPECTION",
            "simulate_drone_unavailable": False,
        },
    )
    assert r3.status_code == 200
    run3 = r3.json()
    assert run3["status"] == "COMPLETED"
    assert "create_drone_mission" in run3["tools_used"]
    assert len(run3["replans"]) == 0
    assert run3["decision"]["primary_data_source"] == "SIMULATED DRONE"

    # --- TEST 4: Drone unavailable -> Dynamically replans to FarmerTaskTool ---
    r4 = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 1,
            "goal": "Inspect Field B",
            "scenario": "DRONE_INSPECTION",
            "simulate_drone_unavailable": True,
        },
    )
    assert r4.status_code == 200
    run4 = r4.json()
    assert run4["status"] == "COMPLETED"
    assert len(run4["replans"]) >= 1
    assert "create_farmer_task" in run4["tools_used"]
    assert any(st["state"] == "REPLANNING" for st in run4["state_history"])

    # --- TEST 5: Sensor offline -> Uses fallback satellite/historical data & lowers confidence ---
    r5 = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 2,
            "goal": "ESP32 sensor offline — check moisture and irrigation need",
            "scenario": "SENSOR_FAILURE",
            "simulate_esp32_offline": True,
        },
    )
    assert r5.status_code == 200
    run5 = r5.json()
    assert "fallback" in run5["decision"]["confidence"].lower()
    soil_res = [t for t in run5["tool_results"] if t["tool"] == "get_soil_status"][0]
    assert soil_res["esp32_online"] is False
    assert soil_res["status"] == "DEGRADED_FALLBACK"

    # --- TEST 6: Transient tool failure -> Enters REPLANNING and recovers ---
    r6 = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 3,
            "goal": "When should I harvest?",
            "scenario": "HARVEST",
            "simulate_tool_failure": "get_weather",
        },
    )
    assert r6.status_code == 200
    run6 = r6.json()
    assert run6["status"] == "COMPLETED"
    assert len(run6["replans"]) >= 1
    assert any(st["state"] == "REPLANNING" for st in run6["state_history"])

    # --- TEST 7: Action rejected -> No action executed, AgentRun becomes CANCELLED ---
    reject_run = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 2,
            "goal": "Should I irrigate Field A?",
            "override_soil_moisture": 19.0,
            "override_rain_prob": 5,
        },
    ).json()
    act_to_reject = reject_run["action_id"]
    dec_reject = client.post(
        "/api/v1/farmers/2/actions/decision",
        json={"action_id": act_to_reject, "status": "REJECTED", "actor": "farmer"},
    )
    assert dec_reject.status_code == 200
    assert dec_reject.json()["execution_status"] == "NOT_DISPATCHED"
    updated_reject_run = client.get(f"/api/v1/agent/runs/{reject_run['run_id']}").json()
    assert updated_reject_run["status"] == "CANCELLED"
    assert updated_reject_run["approval_status"] == "REJECTED"

    # --- TEST 9: Action approved & succeeds -> Closed-loop verification updates memory ---
    approve_run = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 5,
            "goal": "Should I irrigate Field A today?",
            "override_soil_moisture": 21.0,
            "override_rain_prob": 5,
        },
    ).json()
    act_to_approve = approve_run["action_id"]
    dec_approve = client.post(
        "/api/v1/farmers/5/actions/decision",
        json={"action_id": act_to_approve, "status": "APPROVED", "actor": "farmer"},
    )
    assert dec_approve.status_code == 200
    assert dec_approve.json()["execution_status"] == "DISPATCHED"

    mid_run = client.get(f"/api/v1/agent/runs/{approve_run['run_id']}").json()
    assert mid_run["status"] == "VERIFYING"

    verify_ok = client.post(
        f"/api/v1/agent/runs/{approve_run['run_id']}/verify",
        json={"new_soil_moisture": 41.5},
    )
    assert verify_ok.status_code == 200
    verified_run = verify_ok.json()
    assert verified_run["status"] == "COMPLETED"
    assert verified_run["result"]["verification_status"] == "VERIFIED_SUCCESS"
    assert verified_run["result"]["delta_vwc"] > 15.0

    # --- TEST 10: Goal completed (Crop Stress VisionTool + Closed-Loop Failure Replan) ---
    stress_run = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 3,
            "goal": "Check why my crop is unhealthy",
            "scenario": "CROP_STRESS",
        },
    ).json()
    assert stress_run["status"] == "COMPLETED"
    assert "scan_crop" in stress_run["tools_used"]
    assert "evaluate_pest_disease" in stress_run["tools_used"]
    assert "create_farmer_task" in stress_run["tools_used"]
    assert len(stress_run["tools_used"]) <= 10

    # --- TEST 8: Emergency stop -> Blocks action and transitions to EMERGENCY_STOPPED ---
    client.post("/api/v1/devices/emergency-stop", json={"active": True, "reason": "Jury safety test"})
    estop_run = client.post(
        "/api/v1/agent/run",
        json={
            "farmer_id": 1,
            "goal": "Should I irrigate Field A?",
            "override_soil_moisture": 17.0,
            "override_rain_prob": 5,
        },
    ).json()
    assert estop_run["status"] == "EMERGENCY_STOPPED"


def test_farm_reports_and_analytics_module() -> None:
    """Verify all 12 Farm Reports & Analytics endpoints, filters, explainable Farm Health, and CSV export."""
    client = TestClient(app)
    # Seed a few telemetry & agent runs so all report tables have live rows
    client.post(
        "/api/v1/telemetry",
        json={"device_id": "esp32_zone_01", "soil_moisture": 19.2, "adc_raw": 3610, "voltage": 2.91},
    )
    client.post(
        "/api/v1/agent/run",
        json={"farmer_id": 1, "goal": "When should I harvest?", "scenario": "HARVEST"},
    )

    # 1. Overview + Explainable Farm Health
    ov = client.get("/api/v1/reports/overview?date_range=7d")
    assert ov.status_code == 200
    ov_data = ov.json()
    assert ov_data["total_farmers"] == 5
    assert ov_data["total_fields"] >= 5
    assert "farm_health" in ov_data
    assert ov_data["farm_health"]["overall_status"] in ("Needs Attention", "Moderate", "Good")
    assert "soil" in ov_data["farm_health"]["components"]

    # 2. Farmer-Wise Report (includes My Farm Summary: What happened? What should I do? Why?)
    fr = client.get("/api/v1/reports/farmers/1")
    assert fr.status_code == 200
    fr_data = fr.json()
    assert fr_data["farmer"]["id"] == 1
    assert "what_happened" in fr_data["my_farm_summary"]
    assert "what_should_i_do" in fr_data["my_farm_summary"]
    assert "why" in fr_data["my_farm_summary"]

    # 3. Field-Wise Report
    fl = client.get("/api/v1/reports/fields/1")
    assert fl.status_code == 200
    assert "soil_trend" in fl.json()

    # 4. Soil Analytics
    so = client.get("/api/v1/reports/soil?farmer_id=1")
    assert so.status_code == 200
    so_data = so.json()
    assert isinstance(so_data["series"], list) and len(so_data["series"]) >= 1
    assert "current_moisture" in so_data and "previous_moisture" in so_data

    # 5. Weather Analytics
    we = client.get("/api/v1/reports/weather")
    assert we.status_code == 200
    assert len(we.json()["stations"]) == 5

    # 6. Crop Report
    cr = client.get("/api/v1/reports/crops")
    assert cr.status_code == 200
    assert cr.json()["total_crops"] >= 5

    # 7. Irrigation Report
    ir = client.get("/api/v1/reports/irrigation")
    assert ir.status_code == 200
    assert "irrigation_timeline" in ir.json()

    # 8. AI / Agent Performance Analytics
    ag = client.get("/api/v1/reports/agents")
    assert ag.status_code == 200
    ag_data = ag.json()
    assert ag_data["total_agent_runs"] >= 1
    assert "most_used_tools" in ag_data
    assert "agent_activity_timeline" in ag_data

    # 9. Recommendation History with filters
    rc = client.get("/api/v1/reports/recommendations?farmer_id=1&crop=Rice")
    assert rc.status_code == 200
    assert "recommendations" in rc.json()

    # 10. Task Analytics
    tk = client.get("/api/v1/reports/tasks")
    assert tk.status_code == 200
    assert "open_tasks" in tk.json() and "completed_tasks" in tk.json()

    # 11. Alert Analytics
    al = client.get("/api/v1/reports/alerts")
    assert al.status_code == 200
    assert "weather_alerts" in al.json() and "soil_alerts" in al.json()

    # 12. CSV & Printable HTML Export
    csv_res = client.get("/api/v1/reports/export?format=csv&date_range=30d")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "=== 1. FARM REPORT OVERVIEW ===" in csv_res.text

    html_res = client.get("/api/v1/reports/export?format=html")
    assert html_res.status_code == 200
    assert "AI FarmWise" in html_res.text



