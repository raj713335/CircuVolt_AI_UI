import React, { useState, useEffect, useRef } from 'react';
import { Battery, AlertTriangle, CheckCircle, Info, Sparkles, Bot, Loader2, X } from 'lucide-react';
import { predictSOH, getSampleBatteries, streamSohAiSummary } from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend } from 'recharts';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import { Layers } from 'lucide-react';
const gradeColors = { A: '#22c55e', B: '#eab308', C: '#f97316', D: '#ef4444' };
const gradeLabels = {
  A: 'Excellent - Continue EV/Premium Second-Life',
  B: 'Good - Stationary Energy Storage',
  C: 'Fair - Module Refurbishment',
  D: 'Recycle - Material Recovery'
};

// â”€â”€ Info tooltips â”€â”€
const INFO = {
  soh_title: "This tool uses machine learning to predict how healthy an EV battery is (its 'State of Health'). It analyzes sensor data to estimate remaining capacity and assigns a grade (Aâ€“D) for the best recovery pathway.",
  cycle_count: "Number of full charge-discharge cycles the battery has completed. Like an odometer for batteries â€” higher counts mean more wear. Typical EV batteries last 1000â€“3000 cycles.",
  voltage: "Current battery voltage in volts. Healthy lithium cells typically read 3.6â€“4.2V. Lower voltage can indicate degradation or deep discharge.",
  current: "The electrical current flowing through the battery in amperes. Higher current during charging/discharging generates more heat and can accelerate wear.",
  temperature: "Current operating temperature in Â°C. Batteries perform best between 20â€“35Â°C. Extreme temperatures (hot or cold) accelerate degradation.",
  charge_capacity: "How much energy the battery can accept during charging (in Ah). This decreases over time as the battery degrades â€” comparing it to rated capacity shows how much capacity has been lost.",
  discharge_capacity: "How much energy the battery can deliver during use (in Ah). The gap between charge and discharge capacity indicates internal energy losses.",
  internal_resistance: "Opposition to current flow inside the battery (in milliohms). Higher resistance = more energy lost as heat = less efficient battery. Increases as battery ages.",
  rated_capacity: "The battery's original design capacity when new (in Ah). Used as the baseline to calculate how much capacity has been lost over time.",
  depth_of_discharge: "How deeply the battery is discharged each cycle (as %). Deeper discharges (>80%) stress the battery more and accelerate aging. Shallower cycles extend life.",
  max_temperature: "Highest temperature the battery has experienced (Â°C). Temperatures above 40Â°C cause permanent damage to the electrode materials and electrolyte.",
  energy_throughput: "Total cumulative energy that has flowed through the battery (in kWh). A measure of total lifetime usage â€” like 'total kilometers driven' for a car.",
  predicted_soh: "The AI model's prediction of how much original capacity the battery retains. 100% = like new, 80% = typical retirement threshold for EVs, below 60% = significant degradation.",
  grade: "A letter grade (Aâ€“D) indicating the best recovery pathway:\nâ€¢ A = Reuse in EVs or premium second-life\nâ€¢ B = Stationary energy storage\nâ€¢ C = Module-level refurbishment\nâ€¢ D = Material recycling",
  rul: "Remaining Useful Life â€” estimated number of charge cycles before the battery drops below usable threshold. Helps plan retirement timing and second-life duration.",
  confidence: "How confident the AI model is in its prediction. Based on how similar this battery's parameters are to the training data. Higher confidence = more reliable prediction.",
  risk_flags: "Warnings about specific parameters that are outside normal ranges. These flags highlight potential issues that could accelerate degradation or pose safety concerns.",
  shap: "SHAP (SHapley Additive exPlanations) shows which battery parameters had the biggest influence on the SOH prediction. Taller bars = more important factors in determining battery health.",
  recommendation: "The AI's suggested next step based on the battery's health, grade, and risk factors. Could be continued use, second-life application, refurbishment, or recycling.",
};

// â”€â”€ InfoIcon component â”€â”€
const InfoIcon = ({ tooltip }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="w-4 h-4 rounded-full bg-gray-200 hover:bg-emerald-100 text-gray-500 hover:text-emerald-600 inline-flex items-center justify-center transition-colors cursor-help"
      >
        <Info className="w-2.5 h-2.5" />
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="fixed z-50 w-72 bg-white rounded-xl shadow-xl border border-[#d4c5a9] p-3.5 text-xs text-gray-600 leading-relaxed whitespace-pre-line normal-case tracking-normal text-left font-sans font-normal"
            style={{ top: 'auto', left: 'auto' }}
            ref={el => {
              if (el) {
                const btn = el.parentElement.querySelector('button');
                const r = btn.getBoundingClientRect();
                let topPos = r.top - el.offsetHeight - 8; if (topPos < 8) topPos = r.bottom + 8; el.style.top = `${topPos}px`;
                el.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - 144, window.innerWidth - 296))}px`;
              }
            }}>
            <button onClick={() => setShow(false)} className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
            {tooltip}
          </div>
        </>
      )}
    </span>
  );
};

const FIELD_INFO_MAP = {
  cycle_count: 'cycle_count', voltage: 'voltage', current: 'current', temperature: 'temperature',
  charge_capacity: 'charge_capacity', discharge_capacity: 'discharge_capacity',
  internal_resistance: 'internal_resistance', rated_capacity: 'rated_capacity',
  depth_of_discharge: 'depth_of_discharge', max_temperature: 'max_temperature',
  energy_throughput: 'energy_throughput',
};

// â”€â”€ 3D Battery Component â”€â”€
const RealisticBattery3D = ({ isExploded, onSelectPart }) => {
  const groupRef = useRef();
  const explodeFactor = useRef(0);
  const coverRef = useRef();
  const modulesRef = useRef();
  const coolingRef = useRef();

  useFrame((state, delta) => {
    const target = isExploded ? 1 : 0;
    explodeFactor.current += (target - explodeFactor.current) * 6 * delta;
    
    if (coverRef.current) coverRef.current.position.y = 1.2 + (explodeFactor.current * 2.5);
    if (modulesRef.current) modulesRef.current.position.y = 0.6 + (explodeFactor.current * 1.2);
    if (coolingRef.current) coolingRef.current.position.y = 0.1 + (explodeFactor.current * 0.4);

    if (groupRef.current) groupRef.current.rotation.y += 0.0015;
  });

  return (
    <group ref={groupRef} position={[0, -1.0, 0]}>
      {/* Top Cover */}
      <mesh 
        ref={coverRef} 
        position={[0, 1.2, 0]} 
        onClick={(e) => { e.stopPropagation(); onSelectPart('Top Cover', 'Protective metallic shield. Prevents physical damage, debris intrusion, and acts as an EMI (Electromagnetic Interference) shield.'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <boxGeometry args={[3.4, 0.1, 4.4]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.7} />
      </mesh>

      {/* Battery Modules (Grid of cells) */}
      <group 
        ref={modulesRef} 
        position={[0, 0.6, 0]}
        onClick={(e) => { e.stopPropagation(); onSelectPart('Battery Modules', 'Lithium-ion cell arrays. Stores the primary electrical energy. This is the most critical component analyzed for State of Health (SOH) degradation.'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        {[-1, 1].map((x) => 
          [-1.5, 0, 1.5].map((z) => (
            <group key={`mod-${x}-${z}`} position={[x * 0.85, 0, z * 0.9]}>
              <RoundedBox args={[1.5, 0.9, 1.6]} radius={0.05} smoothness={4}>
                <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.8} />
              </RoundedBox>
              <mesh position={[0, 0.46, 0]}>
                <planeGeometry args={[1.3, 1.4]} rotation={[-Math.PI/2, 0, 0]} />
                <meshStandardMaterial color="#eab308" roughness={0.3} metalness={1} />
              </mesh>
            </group>
          ))
        )}
      </group>

      {/* Cooling Plate */}
      <group 
        ref={coolingRef} 
        position={[0, 0.1, 0]}
        onClick={(e) => { e.stopPropagation(); onSelectPart('Thermal Management System', 'Active cooling plates and coolant pipes. Maintains optimal 20-35Â°C operating temperature to prevent thermal runaway and slow down battery aging.'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <mesh>
          <boxGeometry args={[3.2, 0.15, 4.2]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.8} opacity={0.8} transparent />
        </mesh>
        {/* Coolant Pipes */}
        <mesh position={[-1.7, 0, 1.8]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[-1.7, 0, 1.4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.5} metalness={0.5} />
        </mesh>
      </group>

      {/* Bottom Casing */}
      <mesh 
        position={[0, -0.2, 0]}
        onClick={(e) => { e.stopPropagation(); onSelectPart('Bottom Casing', 'Heavy structural base tub. Provides rigid structural support for the modules and high-strength crash protection from road debris.'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <boxGeometry args={[3.5, 0.5, 4.5]} />
        <meshStandardMaterial color="#111827" roughness={0.9} metalness={0.2} />
      </mesh>
    </group>
  );
};

export default function SOHPredictor() {
  const [formData, setFormData] = useState({
    component_id: '',
    cycle_count: 800, voltage: 3.75, current: 2.5, temperature: 30,
    charge_capacity: 80, discharge_capacity: 76, internal_resistance: 55,
    rated_capacity: 95, depth_of_discharge: 80, max_temperature: 40, energy_throughput: 1200,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState([]);

  // AI streaming state
  const [aiText, setAiText] = useState('');
  const [aiSource, setAiSource] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const aiTextRef = useRef('');

  const [isExploded, setIsExploded] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

  useEffect(() => {
    getSampleBatteries().then(data => setSamples(data.samples)).catch(console.error);
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    setAiText('');
    setAiSource(null);
    setAiDone(false);
    aiTextRef.current = '';
    try {
      const res = await predictSOH(formData);
      setResult(res);
      toast.success(`SOH Predicted: ${res.predicted_soh}% (Grade ${res.grade})`);

      // Auto-stream AI analysis
      setAiLoading(true);
      await streamSohAiSummary(formData, res, (event) => {
        if (event.type === 'meta') setAiSource(event.source);
        else if (event.type === 'text') {
          aiTextRef.current += event.content;
          setAiText(aiTextRef.current);
        } else if (event.type === 'done') {
          setAiDone(true);
          setAiLoading(false);
        }
      });
    } catch (err) {
      toast.error('Prediction failed: ' + (err.response?.data?.detail || err.message));
      setAiLoading(false);
    }
    setLoading(false);
  };

  const loadSample = (sample) => {
    setFormData(sample.data);
    setResult(null);
    setAiText('');
    toast.success(`Loaded: ${sample.name}`);
  };

  const shapData = result?.shap_values
    ? Object.entries(result.shap_values).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).sort((a, b) => b.value - a.value).slice(0, 8)
    : [];

  // Radar data from key parameters
  const radarData = result ? [
    { attr: 'Capacity', score: Math.round((formData.charge_capacity / formData.rated_capacity) * 100) },
    { attr: 'Resistance', score: Math.max(0, 100 - formData.internal_resistance) },
    { attr: 'Temperature', score: Math.max(0, 100 - (formData.max_temperature - 25) * 3) },
    { attr: 'Cycles', score: Math.max(0, 100 - formData.cycle_count / 30) },
    { attr: 'DoD', score: Math.max(0, 120 - formData.depth_of_discharge) },
    { attr: 'Efficiency', score: Math.round((formData.discharge_capacity / Math.max(formData.charge_capacity, 1)) * 100) },
  ].map(d => ({ ...d, score: Math.min(100, Math.max(0, d.score)), fullMark: 100 })) : [];

  // Generate SoH Degradation Forecast Data
  const generateDegradationData = () => {
    if (!result) return [];
    const data = [];
    const currentCycle = formData.cycle_count;
    const currentSoh = result.predicted_soh;
    const maxCycles = currentCycle + result.rul_cycles + (result.rul_cycles > 1000 ? 500 : 200);
    
    const decayRate = -Math.log(currentSoh / 100) / currentCycle;
    for (let i = 0; i <= maxCycles; i += Math.max(50, Math.floor(maxCycles/20))) {
      const soh = 100 * Math.exp(-decayRate * i);
      data.push({
        cycle: i,
        historicalSoH: i <= currentCycle ? Math.round(soh * 10) / 10 : null,
        projectedSoH: i >= currentCycle ? Math.round(soh * 10) / 10 : null,
      });
    }
    return data;
  };

  // Generate Voltage Discharge Profile Data
  const generateVoltageCurve = () => {
    if (!result) return [];
    const data = [];
    const capacityFactor = formData.charge_capacity / formData.rated_capacity;
    const resDrop = (formData.internal_resistance / 1000) * formData.current;
    
    for (let t = 0; t <= 100; t += 5) {
      let idealV = 4.2 - (0.01 * t) - (0.2 * Math.exp(t/15 - 6));
      let actualV = (4.2 - resDrop) - (0.01 * (t / capacityFactor)) - (0.2 * Math.exp((t / capacityFactor)/15 - 6));
      data.push({
        time: t,
        idealV: Math.max(3.0, idealV).toFixed(2),
        actualV: Math.max(3.0, actualV).toFixed(2),
      });
    }
    return data;
  };

  const degradationData = generateDegradationData();
  const voltageData = generateVoltageCurve();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
          Battery SOH Prediction
          <InfoIcon tooltip={INFO.soh_title} />
        </h2>
        <p className="text-gray-500">AI-powered State of Health prediction with second-life grading</p>
      </div>

      {/* 3D Viewer moved into the grid */}
      {/* Sample Battery Selector */}
      <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
        <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center">
          Quick Load Sample Battery
          <InfoIcon tooltip="Pre-loaded battery profiles for quick testing. Each represents a different health condition so you can see how the AI grades different batteries." />
        </h3>
        <div className="flex gap-3 flex-wrap">
          {samples.map((sample, i) => (
            <button key={i} onClick={() => loadSample(sample)}
              className="px-4 py-2 bg-white hover:bg-emerald-50 rounded-lg text-sm transition-colors border border-[#d4c5a9] text-gray-700 hover:border-emerald-400">
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 3D Model + Inputs */}
        <div className="lg:col-span-1 space-y-6">
          {/* 3D Battery Viewer */}
          <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9] relative">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                3D Architecture
              </h3>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Drag to rotate â€¢ Click parts for info</p>
            </div>
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setIsExploded(!isExploded)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                  isExploded 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}>
                {isExploded ? 'Assemble' : 'Explode'}
              </button>
            </div>

            {/* Selected Part Overlay */}
            {selectedPart && (
              <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 backdrop-blur shadow-lg border border-[#d4c5a9] p-3 rounded-xl text-left">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-[11px] font-bold text-emerald-700">{selectedPart.name}</h4>
                  <button onClick={() => setSelectedPart(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed">{selectedPart.desc}</p>
              </div>
            )}
            
            <div className="w-full h-[300px] bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <Canvas camera={{ position: [-5, 5, 8], fov: 35 }} onPointerMissed={() => setSelectedPart(null)}>
                <color attach="background" args={['#f8fafc']} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
                <directionalLight position={[-10, 10, -5]} intensity={0.5} />
                <Environment preset="city" />
                <RealisticBattery3D 
                  isExploded={isExploded} 
                  onSelectPart={(name, desc) => setSelectedPart({ name, desc })} 
                />
                <ContactShadows position={[0, -1.6, 0]} opacity={0.5} scale={20} blur={2.5} far={4} />
                <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={4} maxDistance={20} />
              </Canvas>
            </div>
          </div>

          {/* Input Form */}
          <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4">âœ¦ Battery Parameters</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(formData).filter(([k]) => k !== 'component_id').map(([key, value]) => (
              <div key={key}>
                <label className="flex items-center text-[11px] text-gray-500 mb-1">
                  {key.replace(/_/g, ' ')}
                  {FIELD_INFO_MAP[key] && <InfoIcon tooltip={INFO[FIELD_INFO_MAP[key]]} />}
                </label>
                <input type="number" value={value}
                  onChange={e => setFormData({...formData, [key]: parseFloat(e.target.value) || 0})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:outline-none" />
              </div>
            ))}
          </div>
          <button onClick={handlePredict} disabled={loading || aiLoading}
            className="mt-5 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 shadow-md">
            {loading ? 'Predicting...' : aiLoading ? (
              <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 animate-pulse" /> AI Analyzing...</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Predict & Analyze with AI</span>
            )}
          </button>
        </div>
        </div>

        {/* Results */}
        <div className="space-y-4 lg:col-span-2">
          {result ? (
            <>
              {/* SOH + Grade Header */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9] text-center">
                  <div className="text-5xl font-bold" style={{ color: gradeColors[result.grade] }}>
                    {result.predicted_soh}%
                  </div>
                  <div className="text-gray-500 mt-1 text-sm flex items-center justify-center">
                    Predicted SOH<InfoIcon tooltip={INFO.predicted_soh} />
                  </div>
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${result.predicted_soh}%`, backgroundColor: gradeColors[result.grade] }} />
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9] text-center flex flex-col justify-center">
                  <div className="text-4xl font-bold" style={{ color: gradeColors[result.grade] }}>
                    {result.grade}
                  </div>
                  <div className="mt-1 text-xs px-3 py-1 rounded-full inline-block mx-auto"
                    style={{ backgroundColor: gradeColors[result.grade] + '20', color: gradeColors[result.grade] }}>
                    {gradeLabels[result.grade]}
                  </div>
                  <InfoIcon tooltip={INFO.grade} />
                </div>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
                  <div className="flex items-center text-xs text-gray-500 mb-1">Remaining Life<InfoIcon tooltip={INFO.rul} /></div>
                  <p className="text-xl font-bold text-gray-800">{result.rul_cycles} <span className="text-sm font-normal text-gray-400">cycles</span></p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
                  <div className="flex items-center text-xs text-gray-500 mb-1">Confidence<InfoIcon tooltip={INFO.confidence} /></div>
                  <p className="text-xl font-bold text-gray-800">{result.confidence}</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
                  <div className="flex items-center text-xs text-gray-500 mb-1">Recommendation<InfoIcon tooltip={INFO.recommendation} /></div>
                  <p className="text-sm font-medium text-emerald-600">{result.recommendation}</p>
                </div>
              </div>

              {/* Risk Flags */}
              {result.risk_flags?.length > 0 && (
                <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center text-xs text-amber-700 font-medium mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Risk Flags<InfoIcon tooltip={INFO.risk_flags} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.risk_flags.map((flag, i) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200 font-medium">
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* SHAP Feature Importance */}
                {shapData.length > 0 && (
                  <div className="bg-white/60 rounded-xl p-5 border border-[#d4c5a9]">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3 flex items-center">
                      âœ¦ Feature Importance (SHAP)<InfoIcon tooltip={INFO.shap} />
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={shapData} layout="vertical" margin={{ left: 80, right: 10, top: 5, bottom: 5 }}>
                        <XAxis type="number" stroke="#6b7280" fontSize={9} />
                        <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={9} width={75} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d4c5a9', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Health Radar */}
                {radarData.length > 0 && (
                  <div className="bg-white/60 rounded-xl p-5 border border-[#d4c5a9]">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3 flex items-center">
                      âœ¦ Health Radar<InfoIcon tooltip="A visual overview of the battery's health across key dimensions. Points closer to the edge indicate better performance. Identifies weak spots at a glance." />
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="#d4c5a9" />
                        <PolarAngleAxis dataKey="attr" tick={{ fontSize: 9, fill: '#666' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Health" dataKey="score" stroke={gradeColors[result.grade]} fill={gradeColors[result.grade]} fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Advanced Analytics Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* SoH Degradation Forecast */}
                <div className="bg-white/60 rounded-xl p-5 border border-[#d4c5a9]">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3 flex items-center">
                    âœ¦ SoH Degradation Forecast<InfoIcon tooltip="Plots historical capacity fade and projects future Remaining Useful Life (RUL) until End of Life." />
                  </h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={degradationData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="cycle" stroke="#9ca3af" fontSize={10} tickFormatter={(v) => `${v}c`} />
                      <YAxis domain={[40, 100]} stroke="#9ca3af" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d4c5a9', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" name="Historical SoH" dataKey="historicalSoH" stroke="#10b981" strokeWidth={3} dot={false} />
                      <Line type="monotone" name="Projected SoH" dataKey="projectedSoH" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Discharge Voltage Profile */}
                <div className="bg-white/60 rounded-xl p-5 border border-[#d4c5a9]">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3 flex items-center">
                    âœ¦ Discharge Voltage Profile<InfoIcon tooltip="Simulated voltage drop under load (TIEDVD). Degraded batteries show faster voltage collapse due to higher internal resistance and lost capacity." />
                  </h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={voltageData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} tickFormatter={(v) => `${v}s`} />
                      <YAxis domain={[3.0, 4.3]} stroke="#9ca3af" fontSize={10} tickFormatter={(v) => `${v}V`} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d4c5a9', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" name="New Battery Baseline" dataKey="idealV" stroke="#9ca3af" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                      <Line type="monotone" name="Current Battery" dataKey="actualV" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Summary Report - Streaming */}
              {(aiText || aiLoading) && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-purple-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-purple-200/60 bg-purple-50/50">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h4 className="text-sm font-semibold text-purple-800">AI Battery Health Report</h4>
                    {aiSource && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ml-2 ${
                        aiSource === 'llm' ? 'bg-purple-200 text-purple-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {aiSource === 'llm' ? 'âœ¦ LLM' : 'âš™ Rule Engine'}
                      </span>
                    )}
                    {aiLoading && <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin ml-auto" />}
                    {aiDone && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                  </div>
                  <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto">
                    {aiText.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.includes('**')) {
                        return <h5 key={i} className="font-bold text-gray-900 mt-4 mb-1.5 text-sm flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />{line.replace(/\*\*/g, '')}
                        </h5>;
                      }
                      if (line.startsWith('â€¢')) {
                        return (
                          <div key={i} className="flex gap-2 items-start ml-2 my-1">
                            <span className="text-emerald-500 mt-0.5 text-xs font-bold">â€¢</span>
                            <span className="text-gray-700 text-sm">{line.slice(2).replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                          </div>
                        );
                      }
                      if (line.startsWith('â†’')) {
                        return (
                          <div key={i} className="flex gap-2 items-start ml-2 my-1">
                            <span className="text-purple-500 mt-0.5">â†’</span>
                            <span className="text-gray-700 text-sm">{line.slice(2).replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                          </div>
                        );
                      }
                      if (line.trim() === '') return <div key={i} className="h-2" />;
                      return <p key={i} className="text-sm text-gray-700 my-1">{line.replace(/\*\*/g, '').replace(/\*/g, '')}</p>;
                    })}
                    {aiLoading && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5 rounded-sm" />}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white/60 rounded-xl p-12 border border-[#d4c5a9] text-center">
              <Battery className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Enter battery parameters and click predict to see results</p>
              <p className="text-xs text-gray-400 mt-2">AI agent will automatically generate a detailed health report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

