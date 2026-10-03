import React, { useState, useEffect, useCallback } from 'react';

export function AdminReportsView({ apiBase, farmers, selectedFarmerId, setSelectedFarmerId }) {
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterFarmerId, setFilterFarmerId] = useState('');
  const [filterFieldId, setFilterFieldId] = useState('');
  const [recCropFilter, setRecCropFilter] = useState('all');
  const [recTypeFilter, setRecTypeFilter] = useState('all');
  const [recStatusFilter, setRecStatusFilter] = useState('all');

  const [overview, setOverview] = useState(null);
  const [farmerReport, setFarmerReport] = useState(null);
  const [fieldReport, setFieldReport] = useState(null);
  const [soilReport, setSoilReport] = useState(null);
  const [weatherReport, setWeatherReport] = useState(null);
  const [cropsReport, setCropsReport] = useState(null);
  const [irrigationReport, setIrrigationReport] = useState(null);
  const [agentsReport, setAgentsReport] = useState(null);
  const [recommendationsReport, setRecommendationsReport] = useState(null);
  const [tasksReport, setTasksReport] = useState(null);
  const [alertsReport, setAlertsReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const buildQuery = useCallback(
    (extra = {}) => {
      const params = new URLSearchParams();
      if (dateRange) params.set('date_range', dateRange);
      if (dateRange === 'custom' && startDate) params.set('start_date', startDate);
      if (dateRange === 'custom' && endDate) params.set('end_date', endDate);
      if (filterFarmerId) params.set('farmer_id', filterFarmerId);
      if (filterFieldId) params.set('field_id', filterFieldId);
      Object.entries(extra).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'all') {
          params.set(k, String(v));
        }
      });
      return params.toString();
    },
    [dateRange, startDate, endDate, filterFarmerId, filterFieldId]
  );

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery();
      const recQ = buildQuery({
        crop: recCropFilter,
        recommendation_type: recTypeFilter,
        status: recStatusFilter,
      });
      const targetFid = filterFarmerId || selectedFarmerId || 1;
      const targetFlid = filterFieldId || targetFid || 1;

      const [ov, fr, fl, so, we, cr, ir, ag, rc, tk, al] = await Promise.all([
        fetch(`${apiBase}/reports/overview?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/farmers/${targetFid}?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/fields/${targetFlid}?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/soil?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/weather?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/crops?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/irrigation?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/agents?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/recommendations?${recQ}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/tasks?${q}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiBase}/reports/alerts?${q}`).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (ov) setOverview(ov);
      if (fr) setFarmerReport(fr);
      if (fl) setFieldReport(fl);
      if (so) setSoilReport(so);
      if (we) setWeatherReport(we);
      if (cr) setCropsReport(cr);
      if (ir) setIrrigationReport(ir);
      if (ag) setAgentsReport(ag);
      if (rc) setRecommendationsReport(rc);
      if (tk) setTasksReport(tk);
      if (al) setAlertsReport(al);
    } catch (_) {
      // keep existing report state
    } finally {
      setLoading(false);
    }
  }, [apiBase, buildQuery, filterFarmerId, filterFieldId, selectedFarmerId, recCropFilter, recTypeFilter, recStatusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExport = (fmt) => {
    const q = buildQuery({ format: fmt });
    window.open(`${apiBase}/reports/export?${q}`, '_blank');
  };

  const soilSeries = soilReport?.series || [];
  const health = overview?.farm_health || {
    overall_status: 'Needs Attention',
    components: {},
    explanation: 'Loading farm health indicators...',
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Export Bar (Requirements 13, 14, 16) */}
      <section className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/30">
              REAL SQLITE + AGENTIC AI ANALYTICS ENGINE
            </span>
            <h2 className="text-lg font-black text-white mt-1">
              📊 Farm Reports & Agentic AI Performance Analytics
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadReports}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
            >
              ↻ {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white shadow"
            >
              ⬇ Export CSV Report
            </button>
            <button
              type="button"
              onClick={() => handleExport('html')}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white shadow"
            >
              🖨️ Printable / PDF Report
            </button>
          </div>
        </div>

        {/* Date Filter + Farmer Selector + Field Selector */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold">Date Range:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'crop_cycle', label: 'Current Crop Cycle' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom Date Range' },
            ].map((dr) => (
              <button
                key={dr.id}
                type="button"
                onClick={() => setDateRange(dr.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  dateRange === dr.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
              />
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-400 font-bold">Farmer Filter:</span>
            <select
              value={filterFarmerId}
              onChange={(e) => {
                setFilterFarmerId(e.target.value);
                if (e.target.value) setSelectedFarmerId(Number(e.target.value));
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold"
            >
              <option value="">All Farmers (Fleet-Wide)</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  #{f.id} · {f.farmer_name || f.name} ({f.village})
                </option>
              ))}
            </select>

            <span className="text-slate-400 font-bold">Field Filter:</span>
            <select
              value={filterFieldId}
              onChange={(e) => setFilterFieldId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold"
            >
              <option value="">All Fields</option>
              {[1, 2, 3, 4, 5].map((id) => (
                <option key={id} value={id}>
                  Field #{id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 1. FARM REPORT OVERVIEW (12 Real DB Metrics) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
            1. Farm Report Overview ({overview?.date_filter || 'All Time'})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            100% Live SQLite Queries
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
          {[
            { label: 'Total Farmers', val: overview?.total_farmers ?? '—', color: 'text-white' },
            { label: 'Total Farms', val: overview?.total_farms ?? '—', color: 'text-cyan-300' },
            { label: 'Total Fields', val: overview?.total_fields ?? '—', color: 'text-emerald-300' },
            { label: 'Active Crops', val: overview?.active_crops_count ?? '—', sub: (overview?.active_crops || []).join(', '), color: 'text-amber-300' },
            { label: 'Crop Cycles', val: overview?.crop_cycles ?? '—', color: 'text-purple-300' },
            { label: 'Avg Soil Moisture', val: typeof overview?.average_soil_moisture === 'number' ? `${overview.average_soil_moisture}%` : (overview?.average_soil_moisture || '—'), color: 'text-sky-300' },
            { label: 'Irrigation Events', val: overview?.irrigation_events ?? '—', color: 'text-teal-300' },
            { label: 'Pending Tasks', val: overview?.pending_tasks ?? '—', color: 'text-amber-400' },
            { label: 'Completed Tasks', val: overview?.completed_tasks ?? '—', color: 'text-emerald-400' },
            { label: 'Active Alerts', val: overview?.active_alerts ?? '—', color: 'text-rose-400' },
            { label: 'AI Recommendations', val: overview?.ai_recommendations ?? '—', color: 'text-violet-300' },
            { label: 'Completed Agent Runs', val: `${overview?.completed_agent_runs ?? 0} / ${overview?.total_agent_runs ?? 0}`, color: 'text-cyan-300' },
          ].map((m, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] font-bold uppercase text-slate-400">{m.label}</div>
              <div className={`text-lg font-mono font-black mt-1 ${m.color}`}>{m.val}</div>
              {m.sub && <div className="text-[10px] text-slate-500 truncate mt-0.5">{m.sub}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 12. EXPLAINABLE FARM HEALTH SCORE */}
      <section className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              MEASURABLE INDICATOR EVALUATION (NO ARBITRARY AI SCORE)
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-white mt-1">
              2. Explainable Farm Health Overview
            </h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              health.overall_status === 'Needs Attention'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : health.overall_status === 'Good'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            Overall Status: {health.overall_status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {[
            { label: 'Soil Condition', val: health.components?.soil || '—' },
            { label: 'Crop Health', val: health.components?.crop_health || '—' },
            { label: 'Weather Risk', val: health.components?.weather_risk || '—' },
            { label: 'Irrigation Status', val: health.components?.irrigation || '—' },
            { label: 'Pending Tasks', val: health.components?.tasks || '—' },
            { label: 'Recent Alerts', val: health.components?.alerts || '—' },
          ].map((c, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-bold">{c.label}</div>
              <div className="font-bold text-white mt-1">{c.val}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
          <span className="font-black text-amber-300 uppercase mr-2">Why ({health.overall_status}):</span>
          {health.explanation}
        </div>
      </section>

      {/* 2 & 3. FARMER-WISE & FIELD-WISE REPORTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
              3. Farmer-Wise Report ({farmerReport?.farmer?.name || `Farmer #${selectedFarmerId}`})
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              {farmerReport?.farm?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Crop & Stage</div>
              <div className="font-bold text-emerald-300 mt-0.5">
                {farmerReport?.current_crops?.[0]?.crop || 'Rice'} · {farmerReport?.current_crops?.[0]?.current_stage || 'Vegetative'}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Soil Condition</div>
              <div className="font-bold text-amber-300 mt-0.5">
                {farmerReport?.soil_condition?.current_moisture_vwc}% VWC (pH {farmerReport?.soil_condition?.soil_ph})
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Weather</div>
              <div className="font-bold text-cyan-300 mt-0.5">
                {farmerReport?.weather_condition?.temperature_c}°C · Rain {farmerReport?.weather_condition?.rain_probability_6h_pct}%
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Tasks (Open / Done)</div>
              <div className="font-bold text-white mt-0.5">
                {farmerReport?.open_tasks?.length ?? 0} Open / {farmerReport?.completed_tasks?.length ?? 0} Completed
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Scans & Irrigations</div>
              <div className="font-bold text-purple-300 mt-0.5">
                {farmerReport?.crop_health_scans?.length ?? 0} Scans · {farmerReport?.irrigation_history?.length ?? 0} Irrigations
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Agent Runs & Alerts</div>
              <div className="font-bold text-rose-300 mt-0.5">
                {farmerReport?.agent_activity?.length ?? 0} Runs · {farmerReport?.alerts?.length ?? 0} Alerts
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-mono uppercase text-emerald-400">
              Farmer Summary (What happened? / What should I do? / Why?)
            </div>
            <div><strong className="text-slate-300">What happened:</strong> {farmerReport?.my_farm_summary?.what_happened}</div>
            <div><strong className="text-emerald-300">What should I do:</strong> {farmerReport?.my_farm_summary?.what_should_i_do}</div>
            <div><strong className="text-amber-300">Why:</strong> {farmerReport?.my_farm_summary?.why}</div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">
              4. Field-Wise Report ({fieldReport?.field?.name || 'Field #1'})
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              {fieldReport?.field?.area_acres} Acres · {fieldReport?.field?.soil_type}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Crop & Stage</div>
              <div className="font-bold text-white mt-0.5">
                {fieldReport?.crop_variety} ({fieldReport?.crop_stage})
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Moisture & Trend</div>
              <div className="font-bold text-cyan-300 mt-0.5">
                {fieldReport?.soil_moisture}% ({fieldReport?.soil_trend?.direction} {fieldReport?.soil_trend?.delta_vwc >= 0 ? `+${fieldReport?.soil_trend?.delta_vwc}` : fieldReport?.soil_trend?.delta_vwc}%)
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Pest/Disease Risks</div>
              <div className="font-bold text-rose-300 mt-0.5">
                {fieldReport?.pest_disease_risks?.length ?? 0} Active Risk(s)
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
            <div className="text-[10px] font-mono uppercase text-violet-400">
              Recent Field Agent Decisions
            </div>
            {(fieldReport?.agent_decisions || []).slice(0, 4).map((ad, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-200 truncate max-w-[280px]">
                  <strong className="text-cyan-300 font-mono">{ad.run_id}:</strong> {ad.decision}
                </span>
                <span className="font-mono text-[10px] text-emerald-400">{ad.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 4 & 5. SOIL ANALYTICS (Line Chart + Before/After Irrigation) & WEATHER ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-sky-400">
              5. Soil Analytics (TelemetryLog Time-Series)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">
              {soilReport?.data_source || 'ESP32 SENSOR + ECMWF SATELLITE'}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <div className="text-[9px] text-slate-400 uppercase">Current</div>
              <div className="font-mono font-black text-white">{soilReport?.current_moisture ?? '—'}%</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <div className="text-[9px] text-slate-400 uppercase">Previous</div>
              <div className="font-mono font-black text-slate-300">{soilReport?.previous_moisture ?? '—'}%</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <div className="text-[9px] text-slate-400 uppercase">Trend</div>
              <div className="font-mono font-bold text-cyan-300 text-[10px]">{soilReport?.trend ?? '—'}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <div className="text-[9px] text-slate-400 uppercase">Average</div>
              <div className="font-mono font-black text-emerald-300">{soilReport?.average_soil_moisture ?? '—'}%</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <div className="text-[9px] text-slate-400 uppercase">Min</div>
              <div className="font-mono font-black text-rose-300">{soilReport?.min_moisture ?? '—'}%</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <div className="text-[9px] text-slate-400 uppercase">Max</div>
              <div className="font-mono font-black text-teal-300">{soilReport?.max_moisture ?? '—'}%</div>
            </div>
          </div>

          {/* SVG Line Chart: Soil Moisture Over Time */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-mono text-slate-400 mb-2">
              Line Chart: Soil Moisture (% VWC) Over Time ({soilSeries.length} TelemetryLog Points)
            </div>
            {soilSeries.length > 0 ? (
              <svg viewBox="0 0 500 120" className="w-full h-28 overflow-visible">
                <line x1="0" y1="84" x2="500" y2="84" stroke="#f59e0b" strokeDasharray="4 4" strokeWidth="1" />
                <text x="4" y="80" fill="#fbbf24" fontSize="9">Critical Threshold (30%)</text>
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  points={soilSeries
                    .map((pt, i) => {
                      const x = soilSeries.length === 1 ? 250 : (i / (soilSeries.length - 1)) * 480 + 10;
                      const y = 110 - Math.min(95, Math.max(5, Number(pt.soil_moisture))) * 1.0;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                {soilSeries.map((pt, i) => {
                  const x = soilSeries.length === 1 ? 250 : (i / (soilSeries.length - 1)) * 480 + 10;
                  const y = 110 - Math.min(95, Math.max(5, Number(pt.soil_moisture))) * 1.0;
                  return (
                    <g key={pt.id || i}>
                      <circle cx={x} cy={y} r="3.5" fill="#10b981" />
                      <text x={x - 10} y={y - 6} fill="#e2e8f0" fontSize="8">
                        {pt.soil_moisture}%
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="text-slate-500 py-6 text-center">Insufficient data</div>
            )}
          </div>

          {/* Moisture Before vs After Irrigation */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="text-[10px] font-mono uppercase text-emerald-400">
              Moisture Before vs After Irrigation ({soilReport?.moisture_before_after_events?.length || 0} Verified Events)
            </div>
            {(soilReport?.moisture_before_after_events || []).length > 0 ? (
              (soilReport.moisture_before_after_events || []).slice(0, 4).map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] border-b border-slate-900 py-1">
                  <span className="font-mono text-cyan-300">{ev.run_id}</span>
                  <span>
                    Before: <strong className="text-amber-300">{ev.moisture_before}%</strong> → After:{' '}
                    <strong className="text-emerald-300">{ev.moisture_after}%</strong> ({ev.delta_vwc >= 0 ? `+${ev.delta_vwc}%` : `${ev.delta_vwc}%`})
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{ev.verification_status}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-[11px]">No verified irrigation transitions in selected range.</div>
            )}
          </div>
        </section>

        {/* 5. WEATHER ANALYTICS */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
              6. Weather & ECMWF Satellite Analytics
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
              WEATHER API + SATELLITE
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Avg Temp</div>
              <div className="text-base font-mono font-black text-amber-300">{weatherReport?.average_temperature_c ?? '—'}°C</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Avg Rain Prob</div>
              <div className="text-base font-mono font-black text-cyan-300">{weatherReport?.average_rain_probability_pct ?? '—'}%</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Avg Humidity</div>
              <div className="text-base font-mono font-black text-emerald-300">{weatherReport?.average_humidity_pct ?? '—'}%</div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-mono uppercase text-slate-400">
              Regional Weather & ECMWF 3–9cm Soil Moisture Trend
            </div>
            {(weatherReport?.stations || []).map((st) => (
              <div key={st.farmer_id} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-white">{st.village} ({st.farmer_name})</span>
                  <span className="font-mono text-slate-300">
                    {st.temperature_c}°C · Rain {st.rain_probability_pct}% · Hum {st.humidity_pct}% · Sat VWC {st.ecmwf_satellite_soil_moisture_vwc}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
                  <div
                    className="bg-cyan-500 h-full"
                    style={{ width: `${Math.min(100, st.rain_probability_pct)}%` }}
                    title={`Rain Prob: ${st.rain_probability_pct}%`}
                  />
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${Math.min(100, st.ecmwf_satellite_soil_moisture_vwc || 20)}%` }}
                    title={`Satellite VWC: ${st.ecmwf_satellite_soil_moisture_vwc}%`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="text-[10px] font-mono uppercase text-rose-400">
              Weather-Related Alerts ({weatherReport?.weather_alerts?.length || 0})
            </div>
            {(weatherReport?.weather_alerts || []).slice(0, 3).map((al) => (
              <div key={al.id} className="flex justify-between text-[11px]">
                <span className="text-slate-200 truncate max-w-[320px]">{al.title}</span>
                <span className="font-mono text-amber-300">{al.severity}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 6. CROP REPORT */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">
            7. Crop Report (Planting, Health Scans, Yield & Harvest Plans)
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            {cropsReport?.total_crops ?? 0} Active Crop Cycle(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2 px-2.5">Farmer & Field</th>
                <th className="py-2 px-2.5">Crop & Stage</th>
                <th className="py-2 px-2.5">Sowing & Age</th>
                <th className="py-2 px-2.5">Health Status & Scans</th>
                <th className="py-2 px-2.5">Pest/Disease Risks</th>
                <th className="py-2 px-2.5">Estimated Yield</th>
                <th className="py-2 px-2.5">Harvest Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {(cropsReport?.crops || []).map((c) => (
                <tr key={c.cycle_id} className="hover:bg-slate-950/60">
                  <td className="py-2.5 px-2.5 font-bold text-white">
                    {c.farmer_name} · <span className="text-cyan-300">{c.field_name}</span>
                  </td>
                  <td className="py-2.5 px-2.5 text-emerald-300 font-bold">
                    {c.variety || c.crop_name} ({c.crop_stage})
                  </td>
                  <td className="py-2.5 px-2.5 font-mono text-slate-300">
                    Sown {c.planting_info?.sowing_date} ({c.planting_info?.crop_age_days}/{c.planting_info?.duration_days}d)
                  </td>
                  <td className="py-2.5 px-2.5">
                    <span className="font-bold text-white">{c.health_status}</span>
                    <span className="text-slate-400 ml-1">({c.recent_scans_count} scans · {c.latest_issue})</span>
                  </td>
                  <td className="py-2.5 px-2.5 text-amber-300">
                    {c.pest_disease_risks?.length > 0
                      ? c.pest_disease_risks.map((p) => p.title).join('; ')
                      : 'Low Risk'}
                  </td>
                  <td className="py-2.5 px-2.5 font-mono text-emerald-300">
                    {typeof c.estimated_yield === 'object'
                      ? `${c.estimated_yield.estimated_tonnes} t (${c.estimated_yield.range_min_tonnes}–${c.estimated_yield.range_max_tonnes} t)`
                      : c.estimated_yield}
                  </td>
                  <td className="py-2.5 px-2.5 font-mono text-cyan-300">
                    {typeof c.harvest_plan === 'object'
                      ? `${c.harvest_plan.harvest_window_start} → ${c.harvest_plan.harvest_window_end}`
                      : c.harvest_plan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7 & 8. IRRIGATION REPORT & AI / AGENT PERFORMANCE ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">
              8. Irrigation Report & Closed-Loop Timeline
            </h3>
            <span className="text-[10px] font-mono text-teal-300 bg-teal-950 px-2 py-0.5 rounded">
              ProposedAction + AgentRun + FarmActivity
            </span>
          </div>

          {/* Bar Chart: Irrigation Events Breakdown */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center">
            {[
              { label: 'Total Recs', val: irrigationReport?.total_irrigation_recommendations ?? 0, c: 'text-white' },
              { label: 'Approved', val: irrigationReport?.approved_actions ?? 0, c: 'text-emerald-400' },
              { label: 'Rejected', val: irrigationReport?.rejected_actions ?? 0, c: 'text-rose-400' },
              { label: 'Dispatched', val: irrigationReport?.completed_actions ?? 0, c: 'text-cyan-300' },
              { label: 'Verified', val: irrigationReport?.verified_actions ?? 0, c: 'text-teal-300' },
              { label: 'Ver. Failed', val: irrigationReport?.failed_verification ?? 0, c: 'text-amber-300' },
              { label: 'Replanned', val: irrigationReport?.replanned_irrigation_actions ?? 0, c: 'text-violet-300' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                <div className="text-[9px] text-slate-400 uppercase">{item.label}</div>
                <div className={`text-sm font-mono font-black mt-0.5 ${item.c}`}>{item.val}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto">
            <div className="text-[10px] font-mono uppercase text-teal-300">
              Irrigation Timeline: Recommendation → Approval → Action → Verification → Result
            </div>
            {(irrigationReport?.irrigation_timeline || []).map((tl, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>{tl.farmer_name} · {tl.recommendation}</span>
                  <span className="font-mono text-[10px] text-cyan-300">{tl.action_id}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300">1. Rec</span>
                  <span>→</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300">2. Approval: {tl.approval}</span>
                  <span>→</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300">3. Action: {tl.action_execution}</span>
                  <span>→</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300">4. Verify: {tl.verification}</span>
                  <span>→</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-white">5. {tl.result}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. AI / AGENT PERFORMANCE ANALYTICS */}
        <section className="bg-slate-900 border border-violet-500/40 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-violet-300">
              9. AI / Agent Performance Analytics (AgentRun Telemetry)
            </h3>
            <span className="text-[10px] font-mono text-violet-300 bg-violet-950 px-2 py-0.5 rounded">
              Avg Duration: {agentsReport?.average_run_duration_ms ?? '—'} ms
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
            {[
              { label: 'Total Runs', val: agentsReport?.total_agent_runs ?? 0, c: 'text-white' },
              { label: 'Completed', val: agentsReport?.completed_runs ?? 0, c: 'text-emerald-400' },
              { label: 'Replanned', val: agentsReport?.replanned_runs ?? 0, c: 'text-amber-300' },
              { label: 'Cancelled', val: agentsReport?.cancelled_runs ?? 0, c: 'text-rose-400' },
              { label: 'Await HITL', val: agentsReport?.runs_awaiting_approval ?? 0, c: 'text-cyan-300' },
              { label: 'Replan Evts', val: agentsReport?.replanning_events_count ?? 0, c: 'text-purple-300' },
              { label: 'Ver. Pass', val: agentsReport?.verification_success ?? 0, c: 'text-teal-300' },
              { label: 'Ver. Fail', val: agentsReport?.verification_failures ?? 0, c: 'text-rose-300' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                <div className="text-[9px] text-slate-400 uppercase">{item.label}</div>
                <div className={`text-sm font-mono font-black mt-0.5 ${item.c}`}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Tool Selection Frequency Bar Chart */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <div className="text-[10px] font-mono uppercase text-violet-300">
              Most Used Tools & Dynamic Selection Frequency
            </div>
            {(agentsReport?.most_used_tools || []).slice(0, 6).map((t) => {
              const maxCount = agentsReport?.most_used_tools?.[0]?.count || 1;
              const pct = Math.max(8, Math.round((t.count / maxCount) * 100));
              return (
                <div key={t.tool} className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-cyan-300 w-44 truncate">{t.tool}</span>
                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="bg-violet-500 h-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono font-bold text-white w-8 text-right">{t.count}</span>
                </div>
              );
            })}
          </div>

          {/* Agent Activity Timeline: GOAL -> OBSERVE -> PLAN -> TOOLS -> ACTION -> VERIFY -> RESULT */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 max-h-44 overflow-y-auto">
            <div className="text-[10px] font-mono uppercase text-cyan-300">
              Agent Activity Timeline: GOAL → OBSERVE → PLAN → TOOLS → ACTION → VERIFY → RESULT
            </div>
            {(agentsReport?.agent_activity_timeline || []).slice(0, 5).map((item) => (
              <div key={item.run_id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-violet-300 font-bold">{item.run_id} ({item.farmer_name})</span>
                  <span className="text-emerald-300">{item.status} · {item.latency_ms}ms</span>
                </div>
                <div className="text-[11px] text-slate-200">
                  <strong>GOAL:</strong> {item.stages.goal} → <strong>TOOLS:</strong>{' '}
                  <span className="font-mono text-cyan-300">{item.stages.tools}</span> → <strong>VERIFY:</strong>{' '}
                  <span className="font-mono text-amber-300">{item.stages.verify}</span> → <strong>RESULT:</strong>{' '}
                  {item.stages.result}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 9. RECOMMENDATION HISTORY (Filterable Table) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
            10. Historical AI Recommendations ({recommendationsReport?.total ?? 0} Records)
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={recCropFilter}
              onChange={(e) => setRecCropFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
            >
              <option value="all">All Crops</option>
              <option value="Rice">Rice</option>
              <option value="Cotton">Cotton</option>
              <option value="Chilli">Chilli</option>
              <option value="Maize">Maize</option>
              <option value="Groundnut">Groundnut</option>
            </select>

            <select
              value={recTypeFilter}
              onChange={(e) => setRecTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
            >
              <option value="all">All Recommendation Types</option>
              <option value="IRRIGATION">Irrigation</option>
              <option value="CROP_STRESS">Crop Stress / Health</option>
              <option value="DRONE">Drone Inspection</option>
              <option value="SENSOR_FAILURE">Sensor Failure Fallback</option>
              <option value="HARVEST">Harvest Planning</option>
            </select>

            <select
              value={recStatusFilter}
              onChange={(e) => setRecStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
            >
              <option value="all">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="AWAITING_APPROVAL">Awaiting Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="VERIFYING">Verifying</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Farmer</th>
                <th className="py-2 px-2">Field</th>
                <th className="py-2 px-2">Crop</th>
                <th className="py-2 px-2">Recommendation</th>
                <th className="py-2 px-2">Reason</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Approval</th>
                <th className="py-2 px-2">Action</th>
                <th className="py-2 px-2">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {(recommendationsReport?.recommendations || []).map((r, i) => (
                <tr key={`${r.id}-${i}`} className="hover:bg-slate-950/60">
                  <td className="py-2 px-2 font-mono text-[10px] text-slate-400">
                    {(r.date || '').slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-2 px-2 font-bold text-white">{r.farmer_name}</td>
                  <td className="py-2 px-2 text-slate-300">{r.field_name}</td>
                  <td className="py-2 px-2 text-emerald-300">{r.crop}</td>
                  <td className="py-2 px-2 font-bold text-cyan-300 max-w-[200px] truncate" title={r.recommendation}>
                    {r.recommendation}
                  </td>
                  <td className="py-2 px-2 text-slate-300 max-w-[240px] truncate" title={r.reason}>
                    {r.reason}
                  </td>
                  <td className="py-2 px-2 font-mono text-[10px] text-emerald-400">{r.status}</td>
                  <td className="py-2 px-2 font-mono text-[10px] text-amber-300">{r.approval}</td>
                  <td className="py-2 px-2 font-mono text-[10px] text-violet-300">{r.action}</td>
                  <td className="py-2 px-2 font-mono text-[10px] text-teal-300">{r.verification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 10 & 11. TASK ANALYTICS & ALERT ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">
              11. Task Analytics (Completion Rate: {tasksReport?.completion_rate_pct ?? '—'}%)
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Total Tasks: {tasksReport?.total_tasks ?? 0}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Open Tasks', val: tasksReport?.open_tasks ?? 0, c: 'text-amber-300' },
              { label: 'Completed', val: tasksReport?.completed_tasks ?? 0, c: 'text-emerald-400' },
              { label: 'Overdue', val: tasksReport?.overdue_tasks ?? 0, c: 'text-rose-400' },
              { label: 'Farmer Tasks', val: tasksReport?.farmer_tasks ?? 0, c: 'text-white' },
              { label: 'Drone Tasks', val: tasksReport?.drone_tasks ?? 0, c: 'text-indigo-300' },
              { label: 'Rover Tasks', val: tasksReport?.rover_tasks ?? 0, c: 'text-cyan-300' },
              { label: 'Inspection', val: tasksReport?.inspection_tasks ?? 0, c: 'text-purple-300' },
              { label: 'Irrig. Fault', val: tasksReport?.irrigation_fault_tasks ?? 0, c: 'text-rose-300' },
            ].map((t, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                <div className="text-[9px] text-slate-400 uppercase">{t.label}</div>
                <div className={`text-sm font-mono font-black mt-0.5 ${t.c}`}>{t.val}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-rose-400">
              12. Alert Analytics (Active: {alertsReport?.active ?? 0} · Resolved: {alertsReport?.resolved ?? 0} · Critical: {alertsReport?.critical ?? 0})
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Total: {alertsReport?.total_alerts ?? 0}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {[
              { label: 'Weather', val: alertsReport?.weather_alerts ?? 0, c: 'text-cyan-300' },
              { label: 'Soil', val: alertsReport?.soil_alerts ?? 0, c: 'text-amber-300' },
              { label: 'Pest/Disease', val: alertsReport?.pest_disease_alerts ?? 0, c: 'text-rose-300' },
              { label: 'Crop Health', val: alertsReport?.crop_health_alerts ?? 0, c: 'text-emerald-300' },
              { label: 'Irrigation', val: alertsReport?.irrigation_alerts ?? 0, c: 'text-teal-300' },
              { label: 'System', val: alertsReport?.system_alerts ?? 0, c: 'text-violet-300' },
            ].map((a, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                <div className="text-[9px] text-slate-400 uppercase">{a.label}</div>
                <div className={`text-sm font-mono font-black mt-0.5 ${a.c}`}>{a.val}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminReportsView;
