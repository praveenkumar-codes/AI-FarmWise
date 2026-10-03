"""SQLAlchemy engine, session factory, and multi-farmer seed bootstrap."""
from __future__ import annotations

from datetime import timedelta
import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

SERVER_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_URL = f"sqlite:///{(SERVER_DIR / 'farmwise.db').as_posix()}"
DATABASE_URL = os.getenv("FARMWISE_DB_URL", DEFAULT_DB_URL)

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables and seed the 5 registered farms, farmers, fields, crop cycles, devices,
    tasks, notifications, alerts, yield predictions, harvest plans, robot missions, and baseline telemetry."""
    from app import models  # noqa: F401
    from app.agents.decision.decision_agent import build_farmer_specific_rationale
    from app.core.enums import ActionStatus, ExecutionStatus
    from app.core.farmer_registry import list_all_farmer_metas
    from app.core.timeutils import utcnow

    from sqlalchemy import inspect, text
    try:
        insp = inspect(engine)
        if "agent_runs" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("agent_runs")}
            if "goal" not in cols or "state_history" not in cols:
                with engine.begin() as conn:
                    conn.execute(text("DROP TABLE IF EXISTS agent_runs"))
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        now = utcnow()
        for meta in list_all_farmer_metas():
            fid = int(meta["id"])

            # 1. Seed Farmer row
            if db.get(models.Farmer, fid) is None:
                db.add(
                    models.Farmer(
                        id=fid,
                        name=meta["farmer_name"],
                        name_te=meta["farmer_name_te"],
                        name_hi=meta["farmer_name_hi"],
                        phone=f"+91-98480-1000{fid}",
                        village=meta["village"],
                        village_te=meta["village_te"],
                        village_hi=meta["village_hi"],
                        district="Guntur / Krishna Delta",
                        state="Andhra Pradesh",
                        preferred_language="te",
                        lat=float(meta["lat"]),
                        lon=float(meta["lon"]),
                        created_at=now,
                    )
                )

            # 2. Seed Farm row (preserved)
            farm = db.get(models.Farm, fid)
            if farm is None:
                farm = models.Farm(
                    id=fid,
                    name=f"{meta['farmer_name']} — {meta['village']}",
                    location=f"{meta['village']}, Andhra Pradesh",
                    crop=meta["crop"],
                    growth_stage=meta["growth_stage"],
                )
                db.add(farm)

            # 3. Seed Field rows (Field A & Field B per farmer)
            has_field = db.scalars(
                select(models.Field).where(models.Field.farmer_id == fid).limit(1)
            ).first()
            if has_field is None:
                primary_field = models.Field(
                    farmer_id=fid,
                    farm_id=fid,
                    name=f"Field A — {meta['village']} Main Plot",
                    name_te=f"పొలం A — {meta['village_te']} ప్రధాన బ్లాక్",
                    name_hi=f"खेत A — {meta['village_hi']} मुख्य प्लॉट",
                    area_acres=float(meta["area_acres"]),
                    soil_type="Alluvial Clay Loam" if fid in (1, 4) else "Black Cotton Soil",
                    irrigation_type="Solar Drip + Smart Valve" if fid == 3 else "Canal + Smart Solenoid Valve",
                    lat=float(meta["lat"]),
                    lon=float(meta["lon"]),
                    zone_code=f"zone_0{fid}",
                    crop=meta["crop"],
                    created_at=now,
                )
                db.add(primary_field)
                db.flush()
                field_id = primary_field.id
            else:
                field_id = has_field.id

            # 4. Seed CropCycle (Active + Past Season)
            has_cycle = db.scalars(
                select(models.CropCycle).where(models.CropCycle.farmer_id == fid).limit(1)
            ).first()
            if has_cycle is None:
                age_days = int(meta["crop_age_days"])
                duration_days = 125 if "Rice" in meta["crop"] else 140 if "Cotton" in meta["crop"] else 130
                sowing_dt = (now - timedelta(days=age_days)).strftime("%Y-%m-%d")
                harvest_dt = (now + timedelta(days=max(15, duration_days - age_days))).strftime("%Y-%m-%d")
                active_cycle = models.CropCycle(
                    farmer_id=fid,
                    farm_id=fid,
                    field_id=field_id,
                    crop=meta["crop"],
                    variety=meta["crop_variety"],
                    crop_te=meta["crop_te"],
                    crop_hi=meta["crop_hi"],
                    season="Kharif 2026",
                    sowing_date=sowing_dt,
                    current_stage=meta["growth_stage"],
                    crop_age_days=age_days,
                    duration_days=duration_days,
                    expected_harvest_date=harvest_dt,
                    status="ACTIVE",
                    created_at=now,
                )
                db.add(active_cycle)
                db.add(
                    models.CropCycle(
                        farmer_id=fid,
                        farm_id=fid,
                        field_id=field_id,
                        crop="Black Gram (LBG-752)" if fid in (1, 3) else "Green Gram (TM-96-2)",
                        variety="Rabi Pulse Rotation",
                        crop_te="మినుములు (Rabi 2025-26)",
                        crop_hi="उड़द (रबी 2025-26)",
                        season="Rabi 2025-26",
                        sowing_date="2025-11-12",
                        current_stage="Harvested",
                        crop_age_days=90,
                        duration_days=90,
                        expected_harvest_date="2026-02-15",
                        status="COMPLETED",
                        created_at=now - timedelta(days=180),
                    )
                )
                db.flush()
                cycle_id = active_cycle.id
            else:
                cycle_id = has_cycle.id

            # 5. Seed Device row (preserved)
            dev_id = meta["device_id"]
            if db.get(models.Device, dev_id) is None:
                db.add(
                    models.Device(
                        id=dev_id,
                        farm_id=fid,
                        zone=f"zone_0{fid}",
                        kind="ESP32_SOIL_NODE" if fid == 1 else "SIMULATED_SOIL_NODE",
                        last_seen=now if fid != 1 else None,
                    )
                )

            # 6. Seed baseline simulated telemetry and agent proposals for Farmers 2..5
            # (leaving Farmer 1's ACT_001 sequence untouched for test_vertical_slice)
            if fid != 1:
                has_t = db.scalars(
                    select(models.TelemetryLog).where(models.TelemetryLog.farm_id == fid).limit(1)
                ).first()
                chem = meta["chem_defaults"]
                if has_t is None:
                    db.add(
                        models.TelemetryLog(
                            farm_id=fid,
                            device_id=dev_id,
                            soil_moisture=float(meta["default_moisture"]),
                            soil_ph=float(chem["soil_ph"]),
                            soil_temperature=float(chem["soil_temperature"]),
                            nitrogen=float(chem["nitrogen"]),
                            phosphorus=float(chem["phosphorus"]),
                            potassium=float(chem["potassium"]),
                            synthesized_fields=[
                                "soil_ph",
                                "soil_temperature",
                                "nitrogen",
                                "phosphorus",
                                "potassium",
                            ],
                            created_at=now,
                        )
                    )

                if fid in (3, 4, 5):
                    act_id = f"F{fid}_ACT_001"
                    if db.get(models.ProposedAction, act_id) is None:
                        i18n_bundle = {
                            code: build_farmer_specific_rationale(
                                farmer_id=fid,
                                moisture=meta["default_moisture"],
                                precip_prob=meta["default_precip_prob"],
                                lang=code,
                            )
                            for code in ("en", "te", "hi")
                        }
                        en_b = i18n_bundle["en"]
                        db.add(
                            models.ProposedAction(
                                id=act_id,
                                farm_id=fid,
                                agent="decision_agent",
                                type=meta["action_type"],
                                target=f"zone_0{fid}",
                                title=en_b["action_title"],
                                why=en_b["why"],
                                evidence=en_b["evidence"],
                                missing_data=en_b["missing_data"],
                                parameters={
                                    "zone": f"zone_0{fid}",
                                    "depth_mm": meta["action_depth_mm"],
                                    "moisture": meta["default_moisture"],
                                    "precip_prob": meta["default_precip_prob"],
                                    "farmer_id": fid,
                                    "i18n": i18n_bundle,
                                },
                                confidence=0.91,
                                status=ActionStatus.PENDING_APPROVAL.value,
                                execution_status=ExecutionStatus.NOT_DISPATCHED.value,
                            )
                        )

            # 7. Seed persistent Tasks, Notifications, Activities, YieldPrediction, HarvestPlan, RobotMissions
            has_task = db.scalars(
                select(models.Task).where(models.Task.farmer_id == fid).limit(1)
            ).first()
            if has_task is None:
                db.add_all(
                    [
                        models.Task(
                            farmer_id=fid,
                            farm_id=fid,
                            field_id=field_id,
                            title=f"Inspect Field A ({meta['crop_variety']}) & Verify Root Moisture",
                            title_te=f"పొలం A ({meta['crop_te']}) పరిశీలన & నేల తేమ తనిఖీ",
                            title_hi=f"खेत A ({meta['crop_hi']}) का निरीक्षण और नमी जांच",
                            description=f"Generated by FarmManagerAgent for {meta['village']} plot.",
                            category="IRRIGATION" if meta["default_moisture"] < meta["critical_threshold"] else "SCOUTING",
                            priority="HIGH" if meta["default_moisture"] < meta["critical_threshold"] else "MEDIUM",
                            status="TODO",
                            assigned_tool="IrrigationTool" if meta["default_moisture"] < meta["critical_threshold"] else "FarmerTaskTool",
                            source_agent="farm_manager_agent",
                            due_date="Today 17:30",
                            created_at=now,
                        ),
                        models.Task(
                            farmer_id=fid,
                            farm_id=fid,
                            field_id=field_id,
                            title=f"Scan {meta['crop']} Leaf Canopy with Phone Camera",
                            title_te=f"ఫోన్ కెమెరాతో {meta['crop_te'].split('·')[0]} ఆకు ఆరోగ్య స్కాన్ చేయండి",
                            title_hi=f"फ़ोन कैमरे से {meta['crop_hi'].split('·')[0]} पत्ती स्कैन करें",
                            description="Capture a close-up leaf photo to check for lesions or nutrient deficiency.",
                            category="CROP_SCAN",
                            priority="MEDIUM",
                            status="TODO",
                            assigned_tool="CameraVisionTool",
                            source_agent="crop_health_agent",
                            due_date="Tomorrow 09:00",
                            created_at=now,
                        ),
                    ]
                )

            has_notif = db.scalars(
                select(models.Notification).where(models.Notification.farmer_id == fid).limit(1)
            ).first()
            if has_notif is None:
                is_dry = float(meta["default_moisture"]) < float(meta["critical_threshold"])
                is_rain = int(meta["default_precip_prob"]) >= 60
                db.add_all(
                    [
                        models.Notification(
                            farmer_id=fid,
                            farm_id=fid,
                            category="WEATHER_ALERT" if is_rain else ("IRRIGATION_ALERT" if is_dry else "CROP_STATUS"),
                            severity="CRITICAL" if (is_dry or is_rain) else "INFO",
                            title=(
                                f"Heavy Rain Forecast ({meta['default_precip_prob']}%) — Delay Sowing"
                                if is_rain
                                else (
                                    f"Soil Moisture Low ({meta['default_moisture']}%) — Irrigation Needed"
                                    if is_dry
                                    else f"Soil Moisture Optimal ({meta['default_moisture']}%) — Hold Irrigation"
                                )
                            ),
                            title_te=(
                                f"భారీ వర్ష సూచన ({meta['default_precip_prob']}%) — విత్తడం వాయిదా వేయండి"
                                if is_rain
                                else (
                                    f"{meta['village_te']} పొలంలో తేమ తక్కువ ({meta['default_moisture']}%) — నీరు పెట్టండి"
                                    if is_dry
                                    else f"నేల తేమ బాగుంది ({meta['default_moisture']}%) — నీరు అవసరం లేదు"
                                )
                            ),
                            title_hi=(
                                f"भारी बारिश का पूर्वानुमान ({meta['default_precip_prob']}%) — बुवाई रोकें"
                                if is_rain
                                else (
                                    f"मिट्टी में नमी कम ({meta['default_moisture']}%) — सिंचाई आवश्यक"
                                    if is_dry
                                    else f"मिट्टी की नमी उत्तम ({meta['default_moisture']}%) — सिंचाई की आवश्यकता नहीं"
                                )
                            ),
                            message=(
                                f"Ground sensor ({meta['default_moisture']}%) and ECMWF satellite scan confirm current root-zone status for {meta['crop_variety']}."
                            ),
                            message_te=(
                                f"నేల ఎండిపోయింది మరియు వర్షం లేదు ({meta['default_precip_prob']}%). {meta['crop_te'].split('·')[0]} పంట ఆరోగ్యంగా ఉండటానికి ఇప్పుడే నీరు పెట్టాలి."
                                if is_dry
                                else f"{meta['village_te']} పొలంలో తేమ {meta['default_moisture']}% వద్ద ఉంది."
                            ),
                            message_hi=(
                                f"मिट्टी में नमी बहुत कम है ({meta['default_moisture']}%)। फसल को सूखने से बचाने के लिए अभी सिंचाई करें।"
                                if is_dry
                                else f"{meta['village_hi']} खेत में नमी {meta['default_moisture']}% है।"
                            ),
                            data_source="ESP32 SENSOR" if fid == 1 else "SATELLITE",
                            action_id="ACT_001" if fid == 1 else f"F{fid}_ACT_001",
                            created_at=now,
                        ),
                        models.Notification(
                            farmer_id=fid,
                            farm_id=fid,
                            category="WEATHER_FORECAST",
                            severity="INFO",
                            title=f"Open-Meteo 6h Forecast: {meta['default_precip_prob']}% Rain Prob in {meta['village']}",
                            title_te=f"{meta['village_te']} వాతావరణం: రాబోయే 6 గంటల్లో వర్షం అవకాశం {meta['default_precip_prob']}%",
                            title_hi=f"{meta['village_hi']} मौसम: अगले 6 घंटों में बारिश की संभावना {meta['default_precip_prob']}%",
                            message=f"Root-zone temperature {meta['chem_defaults']['soil_temperature']}°C, Soil pH {meta['chem_defaults']['soil_ph']}.",
                            message_te=f"నేల ఉష్ణోగ్రత {meta['chem_defaults']['soil_temperature']}°C · pH {meta['chem_defaults']['soil_ph']} సమతుల్యంగా ఉంది.",
                            message_hi=f"मिट्टी का तापमान {meta['chem_defaults']['soil_temperature']}°C · pH {meta['chem_defaults']['soil_ph']} संतुलित है।",
                            data_source="WEATHER API",
                            created_at=now - timedelta(minutes=12),
                        ),
                        models.Notification(
                            farmer_id=fid,
                            farm_id=fid,
                            category="PEST_DISEASE",
                            severity="WARNING" if meta["pest_or_disease_risk"] != "Low" else "INFO",
                            title=f"Pest & Disease Watch: {meta['pest_or_disease_risk']}",
                            title_te=f"తెగులు పరిశీలన: {meta['pest_or_disease_risk']}",
                            title_hi=f"कीट एवं रोग निगरानी: {meta['pest_or_disease_risk']}",
                            message=f"Assigned Fleet Unit: {meta['fleet_unit']}.",
                            message_te=f"మీ {meta['area_acres']} ఎకరాల పొలంలో ఆకు ఆరోగ్య స్కాన్ సిద్ధంగా ఉంది.",
                            message_hi=f"आपके {meta['area_acres']} एकड़ खेत में फसल निगरानी सक्रिय है।",
                            data_source="AI ESTIMATE",
                            created_at=now - timedelta(minutes=28),
                        ),
                    ]
                )

            has_activity = db.scalars(
                select(models.FarmActivity).where(models.FarmActivity.farmer_id == fid).limit(1)
            ).first()
            if has_activity is None:
                db.add_all(
                    [
                        models.FarmActivity(
                            farmer_id=fid,
                            farm_id=fid,
                            field_id=field_id,
                            crop_cycle_id=cycle_id,
                            activity_type="FERTILIZER_APPLICATION",
                            title=f"Basal NPK & Neem-Coated Urea Application ({meta['area_acres']} Acres)",
                            notes="Applied recommended basal dose during early vegetative establishment.",
                            cost_inr=round(float(meta["area_acres"]) * 1850.0, 0),
                            data_source="HISTORICAL DATA",
                            performed_at=now - timedelta(days=14),
                        ),
                        models.FarmActivity(
                            farmer_id=fid,
                            farm_id=fid,
                            field_id=field_id,
                            crop_cycle_id=cycle_id,
                            activity_type="IRRIGATION_CYCLE",
                            title=f"Precision Root-Zone Watering Cycle — {meta['village']}",
                            notes="Saved 28% water using soil moisture threshold gating.",
                            cost_inr=round(float(meta["area_acres"]) * 420.0, 0),
                            data_source="HISTORICAL DATA",
                            performed_at=now - timedelta(days=5),
                        ),
                    ]
                )

            has_yield = db.scalars(
                select(models.YieldPredictionRecord).where(models.YieldPredictionRecord.farmer_id == fid).limit(1)
            ).first()
            if has_yield is None:
                area = float(meta["area_acres"])
                base_per_acre = 2.4 if "Rice" in meta["crop"] else 1.2 if "Cotton" in meta["crop"] else 1.8
                est_t = round(area * base_per_acre, 2)
                db.add(
                    models.YieldPredictionRecord(
                        farmer_id=fid,
                        farm_id=fid,
                        field_id=field_id,
                        crop_cycle_id=cycle_id,
                        crop=meta["crop_variety"],
                        estimated_tonnes=est_t,
                        range_min_tonnes=round(est_t * 0.9, 2),
                        range_max_tonnes=round(est_t * 1.1, 2),
                        confidence_label="Medium (Baseline Agronomic Estimate)",
                        factors_positive=[
                            f"Optimal Soil pH ({meta['chem_defaults']['soil_ph']})",
                            f"Balanced NPK ({meta['chem_defaults']['nitrogen']}/{meta['chem_defaults']['phosphorus']}/{meta['chem_defaults']['potassium']} mg/kg)",
                        ],
                        factors_negative=(
                            [f"Soil Moisture Deficit ({meta['default_moisture']}%)"]
                            if float(meta["default_moisture"]) < float(meta["critical_threshold"])
                            else [f"Watch: {meta['pest_or_disease_risk']}"]
                        ),
                        created_at=now,
                    )
                )

            has_harvest = db.scalars(
                select(models.HarvestPlanRecord).where(models.HarvestPlanRecord.farmer_id == fid).limit(1)
            ).first()
            if has_harvest is None:
                age = int(meta["crop_age_days"])
                rem = max(15, 120 - age)
                w_start = (now + timedelta(days=rem)).strftime("%Y-%m-%d")
                w_end = (now + timedelta(days=rem + 10)).strftime("%Y-%m-%d")
                db.add(
                    models.HarvestPlanRecord(
                        farmer_id=fid,
                        farm_id=fid,
                        field_id=field_id,
                        crop_cycle_id=cycle_id,
                        crop=meta["crop_variety"],
                        harvest_window_start=w_start,
                        harvest_window_end=w_end,
                        maturity_pct=min(95, int(round((age / 120.0) * 100))),
                        estimated_yield_tonnes=round(float(meta["area_acres"]) * 1.8, 2),
                        preparation_tasks=[
                            "Stop irrigation 10 days before harvest window to firm up field soil",
                            f"Book tarpaulins and moisture-proof bags for {meta['village']} storage",
                            f"Check daily modal prices at {meta['village']} / Guntur AMC Market Yard",
                        ],
                        weather_considerations="Ensure < 15% rain probability during the 5-day harvesting & sun-drying window.",
                        market_yard=f"{meta['village']} / Guntur AMC Yard",
                        expected_price_per_quintal=18500.0 if "Chilli" in meta["crop"] else 7200.0 if "Cotton" in meta["crop"] else 2320.0,
                        created_at=now,
                    )
                )

            has_mission = db.scalars(
                select(models.RobotMission).where(models.RobotMission.farmer_id == fid).limit(1)
            ).first()
            if has_mission is None:
                db.add_all(
                    [
                        models.RobotMission(
                            mission_code=f"DRN-SIM-F{fid}01",
                            farmer_id=fid,
                            farm_id=fid,
                            field_id=field_id,
                            unit_id="UAV-ALPHA",
                            robot_type="SIMULATED_DRONE",
                            mission_type="Multispectral Canopy & Stress Survey",
                            state="COMPLETED",
                            state_history=[
                                "MISSION_CREATED",
                                "PLANNED",
                                "TAKEOFF",
                                "SURVEYING",
                                "IMAGE_CAPTURE",
                                "ANALYZING",
                                "RETURNING",
                                "COMPLETED",
                            ],
                            battery_pct=86,
                            progress_pct=100,
                            images_captured=24,
                            findings=f"SIMULATED DRONE survey over {meta['area_acres']} acres ({meta['village']}): Canopy uniformity {meta['health_score']}%, localized dry patch in NW quadrant.",
                            is_simulated=True,
                            data_source="SIMULATED DRONE",
                            created_at=now - timedelta(hours=2),
                            updated_at=now - timedelta(hours=1),
                        ),
                        models.RobotMission(
                            mission_code=f"RVR-SIM-F{fid}01",
                            farmer_id=fid,
                            farm_id=fid,
                            field_id=field_id,
                            unit_id="UGV-ROVER-02" if fid == 2 else "UGV-ROVER-01",
                            robot_type="SIMULATED_ROVER",
                            mission_type="Proximal Root-Zone Soil & Pest Inspection",
                            state="COMPLETED" if fid != 4 else "PLANNED",
                            state_history=[
                                "MISSION_CREATED",
                                "PLANNED",
                                "SURVEYING",
                                "IMAGE_CAPTURE",
                                "ANALYZING",
                                "RETURNING",
                                "COMPLETED",
                            ] if fid != 4 else ["MISSION_CREATED", "PLANNED"],
                            battery_pct=82,
                            progress_pct=100 if fid != 4 else 20,
                            images_captured=16 if fid != 4 else 0,
                            findings=f"SIMULATED ROVER row scan for {meta['crop_variety']}: Soil pH {meta['chem_defaults']['soil_ph']}, Pest pressure: {meta['pest_or_disease_risk']}.",
                            is_simulated=True,
                            data_source="SIMULATED ROVER",
                            created_at=now - timedelta(hours=3),
                            updated_at=now - timedelta(hours=2),
                        ),
                    ]
                )

        db.commit()


def reset_db() -> None:
    """Drop and recreate every table. Used by the test-suite only."""
    from app import models  # noqa: F401

    Base.metadata.drop_all(bind=engine)
    init_db()

