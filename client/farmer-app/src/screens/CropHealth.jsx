import React, { useState, useRef, useEffect } from 'react';

export function CropHealth({
  dashboard,
  selectedFarmerId = 1,
  selectedFieldId = 1,
  lang = 'te',
  apiBase = 'http://localhost:8000/api/v1',
  onRefresh,
  showScannerExpanded = false,
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [captureMode, setCaptureMode] = useState('CAMERA');
  const [analyzing, setAnalyzing] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [symptomPreset, setSymptomPreset] = useState('leaf_spot');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    setLatestResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        lang === 'te'
          ? 'మీ బ్రౌజర్‌లో ప్రత్యక్ష కెమెరా అందుబాటులో లేదు. క్రింది ఫోటో అప్‌లోడ్ బటన్‌ను ఉపయోగించండి.'
          : lang === 'hi'
          ? 'आपके ब्राउज़र में लाइव कैमरा उपलब्ध नहीं है। कृपया नीचे फोटो अपलोड विकल्प का उपयोग करें।'
          : 'Browser camera API unavailable on this device. Please use the photo upload option below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setCaptureMode('CAMERA');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      const denied = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setCameraError(
        denied
          ? lang === 'te'
            ? 'కెమెరా అనుమతి నిరాకరించబడింది. దయచేసి కెమెరా అనుమతి ఇవ్వండి లేదా ఫోటోను అప్‌లోడ్ చేయండి.'
            : lang === 'hi'
            ? 'कैमरा अनुमति अस्वीकृत। कृपया अनुमति दें या नीचे से फोटो अपलोड करें।'
            : 'Camera permission was denied. Please allow camera access or upload a leaf image below.'
          : lang === 'te'
          ? 'కెమెరా తెరవడంలో సమస్య ఏర్పడింది. ఫోటో అప్‌లోడ్ ఉపయోగించండి.'
          : 'Camera unavailable on this device. Use photo upload fallback below.'
      );
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCameraError(null);
    setCaptureMode('UPLOAD');
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    setAnalyzing(true);
    try {
      const activeCycle = (dashboard?.crop_cycles || [])[0];
      const res = await fetch(`${apiBase}/crop-health/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: selectedFarmerId,
          farm_id: selectedFarmerId,
          field_id: selectedFieldId || 1,
          crop_cycle_id: activeCycle?.id || 1,
          capture_mode: captureMode,
          image_name: `${symptomPreset}_${captureMode.toLowerCase()}.jpg`,
          symptom_hint: symptomPreset,
          image: capturedImage || 'camera_capture_frame',
        }),
      });
      const data = await res.json();
      setLatestResult(data);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setCameraError('Analysis error: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const scansHistory = dashboard?.crop_scans || [];
  const profile = dashboard?.farmer_profile || {};

  return (
    <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 space-y-3.5 shadow-lg">
      {/* Header & Data Source Transparency Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">📷</span>
          <h3 className="text-xs sm:text-sm font-extrabold text-emerald-400">
            {lang === 'te'
              ? 'పంట ఆరోగ్యం & ప్రత్యక్ష కెమెరా స్కాన్ (Crop Camera Scan)'
              : lang === 'hi'
              ? 'फसल स्वास्थ्य और लाइव कैमरा स्कैन (Crop Camera Scan)'
              : 'Crop Health & Real Phone Camera Scanner'}
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
          CAMERA + AI ESTIMATE
        </span>
      </div>

      {/* Primary Action Bar: SCAN CROP (Real getUserMedia Camera) + Upload Fallback */}
      {!cameraActive && !capturedImage && (
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-white">
                {lang === 'te'
                  ? `${profile.crop_te || profile.crop_variety || 'పంట'} ఆకును ఫోన్ కెమెరాతో స్కాన్ చేయండి`
                  : lang === 'hi'
                  ? `${profile.crop_hi || profile.crop_variety || 'फसल'} की पत्ती को फ़ोन कैमरे से स्कैन करें`
                  : `Scan ${profile.crop_variety || 'Crop'} Leaf with Phone Camera`}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'te'
                  ? 'ఆకు మచ్చలు, ముడత లేదా పోషక లోపాలను గుర్తించి తక్షణ AI సూచన పొందండి'
                  : lang === 'hi'
                  ? 'पत्ती के धब्बे, मरोड़ या रोग की जांच करें और तुरंत AI सलाह पाएं'
                  : 'Opens live camera preview (getUserMedia) or desktop file upload fallback'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>📷 SCAN CROP ({lang === 'te' ? 'కెమెరా తెరువు' : lang === 'hi' ? 'कैमरा खोलें' : 'Open Camera'})</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <span>📁 {lang === 'te' ? 'ఫోటో అప్‌లోడ్ (Upload Photo)' : lang === 'hi' ? 'फोटो अपलोड करें' : 'Upload Leaf Photo'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Camera Permission / Unavailable Error Banner with One-Tap Upload Fallback */}
      {cameraError && (
        <div className="rounded-xl bg-amber-950/70 border border-amber-500/50 p-3 space-y-2 text-xs text-amber-200">
          <div className="font-bold">⚠️ {cameraError}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black"
            >
              📁 {lang === 'te' ? 'ఫోటో ఎంచుకోండి' : 'Select / Capture Image File'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                setCapturedImage('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="100%" height="100%" fill="%23064e3b"/><circle cx="200" cy="130" r="70" fill="%2310b981"/><circle cx="220" cy="115" r="12" fill="%23b45309"/><text x="20" y="240" fill="white" font-size="14" font-family="sans-serif">Sample Crop Leaf Frame</text></svg>');
                setCaptureMode('DEMO_SAMPLE');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold border border-slate-700"
            >
              🌿 {lang === 'te' ? 'నమూనా ఆకుతో పరీక్షించండి' : 'Use Sample Leaf Frame'}
            </button>
          </div>
        </div>
      )}

      {/* Live Browser Camera Stream Preview */}
      {cameraActive && (
        <div className="rounded-2xl bg-black border-2 border-emerald-500/60 overflow-hidden space-y-2 p-2">
          <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex items-end justify-center pb-2">
              <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-emerald-300 font-bold">
                Align crop leaf inside frame
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={captureFrame}
              className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm"
            >
              📸 {lang === 'te' ? 'ఫోటో తీయండి (Capture Image)' : lang === 'hi' ? 'फोटो लें (Capture)' : 'Capture Image'}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              ✕ {lang === 'te' ? 'రద్దు' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Captured Image Preview -> Retake / Analyze */}
      {capturedImage && (
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-300">
              🖼️ {lang === 'te' ? 'captured ఆకు ఫోటో ప్రివ్యూ' : 'Captured Leaf Preview'} ({captureMode})
            </span>
            <select
              value={symptomPreset}
              onChange={(e) => setSymptomPreset(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
            >
              <option value="leaf_spot">Sample Pattern: Leaf Spot (Moderate)</option>
              <option value="leaf_curl_thrips">Sample Pattern: Leaf Curl / Thrips</option>
              <option value="healthy_green">Sample Pattern: Healthy Leaf</option>
            </select>
          </div>

          <div className="rounded-xl overflow-hidden bg-black max-h-52 flex items-center justify-center border border-slate-800">
            <img src={capturedImage} alt="Captured crop leaf" className="max-h-52 object-contain" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={analyzing}
              onClick={analyzeImage}
              className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg"
            >
              {analyzing
                ? lang === 'te'
                  ? '🔍 AI విశ్లేషిస్తోంది...'
                  : '🔍 Analyzing Leaf...'
                : lang === 'te'
                ? '🔬 విశ్లేషించు (Analyze Leaf)'
                : lang === 'hi'
                ? '🔬 विश्लेषण करें (Analyze)'
                : '🔬 Analyze Crop Leaf'}
            </button>
            <button
              type="button"
              disabled={analyzing}
              onClick={() => {
                setCapturedImage(null);
                setLatestResult(null);
              }}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
            >
              🔄 {lang === 'te' ? 'మళ్ళీ తీయండి (Retake)' : lang === 'hi' ? 'दोबारा लें (Retake)' : 'Retake Photo'}
            </button>
          </div>
        </div>
      )}

      {/* Structured Backend Analysis Result */}
      {latestResult && (
        <div className="rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-xs font-black text-amber-300">
              🩺 {latestResult.health_status} · {latestResult.possible_issue}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold">
              {latestResult.data_source} · Conf {Math.round((latestResult.confidence || 0.86) * 100)}%
            </span>
          </div>
          <div className="text-xs text-slate-200 bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <div>
              <span className="text-slate-400 font-semibold">Crop & Severity: </span>
              <span className="font-bold text-white">{latestResult.crop} · {latestResult.severity}</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">AI Recommendation: </span>
              <span>
                {lang === 'te'
                  ? latestResult.recommendation_te || latestResult.recommendation
                  : lang === 'hi'
                  ? latestResult.recommendation_hi || latestResult.recommendation
                  : latestResult.recommendation}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span className="font-bold text-sky-300">WHY: </span>
              {lang === 'te'
                ? latestResult.explanation_te || latestResult.explanation
                : lang === 'hi'
                ? latestResult.explanation_hi || latestResult.explanation
                : latestResult.explanation}
            </div>
          </div>
        </div>
      )}

      {/* Step 8: Persistent Crop Scan History */}
      { (showScannerExpanded || scansHistory.length > 0) && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-300">
              {lang === 'te'
                ? '📋 గత ఆకు స్కాన్ చరిత్ర (Previous Crop Scans)'
                : lang === 'hi'
                ? '📋 पिछले पत्ती स्कैन का इतिहास (Scan History)'
                : '📋 Previous Crop Scan History'}
            </span>
            <span className="text-[11px] text-slate-400">{scansHistory.length} Scans Stored</span>
          </div>
          {scansHistory.length === 0 ? (
            <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {lang === 'te'
                ? 'ఇంకా ఆకు స్కాన్‌లు లేవు. పైన ఉన్న SCAN CROP బటన్‌ను నొక్కండి.'
                : 'No scans recorded yet. Tap SCAN CROP above to capture and analyze a leaf.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scansHistory.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      #{s.id} · {s.crop} — {s.possible_issue}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                      {s.severity} ({Math.round((s.confidence || 0.86) * 100)}%)
                    </span>
                  </div>
                  <div className="text-slate-300">{s.recommendation}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Source: {s.data_source}</span>
                    <span>{(s.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CropHealth;

