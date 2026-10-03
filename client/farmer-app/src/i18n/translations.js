export const TRANSLATIONS = {
  en: {
    yieldEstTitle: "Yield Prediction & Estimation",
    harvestPlanTitle: "Harvest Planning & Readiness",
    cropPlanningTitle: "Sowing & Crop Planning",
    activitiesTitle: "Farm Activities & Task Tracker"
  },
  te: {
    yieldEstTitle: "దిగుబడి అంచనా (Yield Forecast)",
    harvestPlanTitle: "కోత ప్రణాళిక (Harvest Readiness)",
    cropPlanningTitle: "పంట ప్రణాళిక (Crop Planning)",
    activitiesTitle: "వ్యవసాయ పనులు (Farm Tasks)"
  },
  hi: {
    yieldEstTitle: "उपज अनुमान (Yield Forecast)",
    harvestPlanTitle: "कटाई योजना (Harvest Readiness)",
    cropPlanningTitle: "फसल योजना (Crop Planning)",
    activitiesTitle: "खेत के कार्य (Farm Tasks)"
  }
};

export function t(lang, key) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || "";
}

