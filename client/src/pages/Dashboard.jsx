import React from 'react';
import { SoilGauge } from '../components/dashboard/SoilGauge.jsx';
import { MicroclimateWidget } from '../components/dashboard/MicroclimateWidget.jsx';
import { SerialMonitorConsole } from '../components/dashboard/SerialMonitorConsole.jsx';
import { ApprovalCenter } from '../components/approvals/ApprovalCenter.jsx';

export function DashboardPage({
  dashboard,
  onDecision,
  busy,
}) {
  const telemetry = dashboard?.telemetry;
  const criticalThreshold = dashboard?.crop_bounds?.critical_moisture ?? 30.0;
  const satelliteMoisture =
    dashboard?.weather?.satellite_soil_moisture ??
    dashboard?.sensor_fusion?.satellite_moisture ??
    21.0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5">
          <SoilGauge
            moisture={telemetry?.soil_moisture ?? 0}
            satelliteMoisture={satelliteMoisture}
            sensorFusion={dashboard?.sensor_fusion || {}}
            criticalThreshold={criticalThreshold}
            deviceId={telemetry?.device_id || 'esp32_zone_01'}
          />
        </div>
        <div className="xl:col-span-7">
          <MicroclimateWidget telemetry={telemetry} />
        </div>
      </div>

      {/* Live ESP32 Serial Monitor Console (115200 baud mirror) */}
      <SerialMonitorConsole
        telemetry={telemetry}
        history={dashboard?.telemetry_history || []}
        esp32Connected={Boolean(dashboard?.esp32_connected)}
      />

      <ApprovalCenter
        actions={dashboard?.actions || []}
        onDecision={onDecision}
        busy={busy}
        emergencyStop={Boolean(dashboard?.emergency_stop)}
      />
    </div>
  );
}

export default DashboardPage;

