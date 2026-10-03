"""Agronomic threshold profiles per crop + growth stage."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, Tuple

Range = Tuple[float, float]


@dataclass(frozen=True)
class CropProfile:
    crop: str
    stage: str
    critical_moisture: float  # % VWC below which irrigation is proposed
    optimal_moisture: Range
    soil_ph: Range
    soil_temperature: Range  # deg C
    nitrogen: Range  # mg/kg
    phosphorus: Range  # mg/kg
    potassium: Range  # mg/kg
    irrigation_depth_mm: float = 15.0

    def to_bounds(self) -> dict:
        data = asdict(self)
        # Convert tuples to {min,max} objects for JSON consumers.
        for key, value in list(data.items()):
            if isinstance(value, tuple):
                data[key] = {"min": value[0], "max": value[1]}
        return data


RICE_VEGETATIVE = CropProfile(
    crop="Rice",
    stage="Vegetative",
    critical_moisture=30.0,
    optimal_moisture=(60.0, 90.0),
    soil_ph=(5.5, 7.0),
    soil_temperature=(20.0, 35.0),
    nitrogen=(25.0, 40.0),
    phosphorus=(15.0, 25.0),
    potassium=(150.0, 220.0),
    irrigation_depth_mm=15.0,
)

_PROFILES: Dict[Tuple[str, str], CropProfile] = {
    ("rice", "vegetative"): RICE_VEGETATIVE,
}


def get_crop_profile(crop: str, stage: str) -> CropProfile:
    """Return the profile for (crop, stage); falls back to Rice/Vegetative."""
    return _PROFILES.get((crop.strip().lower(), stage.strip().lower()), RICE_VEGETATIVE)
