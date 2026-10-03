import { apiRequest } from './apiClient.js';

export const farmService = {
  getDashboard(lang = 'en') {
    const safeLang = encodeURIComponent(lang || 'en');
    return apiRequest(`/dashboard?lang=${safeLang}`);
  },

  getFarmers(lang = 'en') {
    const safeLang = encodeURIComponent(lang || 'en');
    return apiRequest(`/farmers?lang=${safeLang}`);
  },

  getFarmerDashboard(farmerId = 1, lang = 'en') {
    const safeLang = encodeURIComponent(lang || 'en');
    return apiRequest(`/farmers/${Number(farmerId)}/dashboard?lang=${safeLang}`);
  },

  submitFarmerActionDecision(farmerId, actionId, status, actor = 'farmer_operator', note = null) {
    return apiRequest(`/farmers/${Number(farmerId)}/actions/decision`, {
      method: 'POST',
      body: JSON.stringify({
        action_id: actionId,
        status,
        actor,
        note,
      }),
    });
  },

  analyzeState(lang = 'en') {
    const safeLang = encodeURIComponent(lang || 'en');
    return apiRequest(`/agent/analyze?lang=${safeLang}`);
  },

  sendTelemetry(deviceId, soilMoisture) {
    return apiRequest('/telemetry', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        soil_moisture: Number(soilMoisture),
      }),
    });
  },

  submitActionDecision(actionId, status, actor = 'farmer_operator', note = null) {
    return apiRequest('/actions/decision', {
      method: 'POST',
      body: JSON.stringify({
        action_id: actionId,
        status,
        actor,
        note,
      }),
    });
  },

  getDevices() {
    return apiRequest('/devices');
  },

  setEmergencyStop(active = true, actor = 'farmer_operator', reason = 'Operator E-Stop toggle') {
    return apiRequest('/devices/emergency-stop', {
      method: 'POST',
      body: JSON.stringify({ active, actor, reason }),
    });
  },

  chatWithAssistant(message, language = 'en') {
    return apiRequest('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    });
  },
};

export default farmService;
