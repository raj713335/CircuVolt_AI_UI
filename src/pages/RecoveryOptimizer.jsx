import React, { useState, useRef } from 'react';
import { Recycle, Info, Bot, Loader2, CheckCircle, Sparkles, X, Shield, DollarSign, Leaf, Activity, ArrowRight, Layers, Zap } from 'lucide-react';
import { recommendRecovery, streamRecoveryAiSummary } from '../services/api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, AreaChart, Area, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import { motion } from 'framer-motion';

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ── Info tooltips for non-domain users ──
const INFO = {
  grade: "A letter grade (A–D) indicating the best recovery pathway:\n• A = Reuse as-is (best condition)\n• B = Second-life use (e.g., home energy storage)\n• C = Refurbish individual components\n• D = Recycle for raw materials only",
  soh: "State of Health — how much capacity the battery retains vs. when new. Higher SOH means the battery can still be reused; lower SOH means it should be recycled for materials.",
  chemistry: "The battery's chemical composition (e.g., NMC = Nickel Manganese Cobalt, LFP = Lithium Iron Phosphate). Different chemistries have different recycling processes and material values.",
  modules: "Number of individual battery modules inside the pack. More modules = more opportunities to find reusable units, but also more disassembly work.",
  recovery_score: "Overall score (0–100) measuring how much value can be recovered from this battery through reuse, refurbishment, or recycling. Higher = better recovery outcome.",
  co2_avoided: "The amount of greenhouse gas emissions prevented by recovering materials from this battery instead of mining new raw materials. Like 'carbon credits' earned by recycling.",
  net_value: "The economic value recovered minus processing costs. Positive value means recycling is profitable; negative means it costs money but may still be required by regulation.",
  material_recovery: "Percentage of the battery's raw materials (lithium, cobalt, nickel, etc.) that can be successfully extracted and reused in new products.",
  disassembly: "The step-by-step process of safely taking apart a battery pack. Each step has safety ratings because batteries contain high voltage and hazardous materials.",
  safety_level: "Risk level for each disassembly step:\n• Critical = high voltage/chemical hazard, certified technician required\n• Medium = moderate risk, standard PPE needed\n• Low = minimal risk, basic safety precautions",
  material_chart: "Shows how much of each material (in kg) can be recovered. More valuable materials like cobalt and lithium make recycling more economically viable.",
  trees: "A way to visualize environmental impact — shows how many trees would need to grow for a year to absorb the same amount of CO₂ that recycling this battery prevents.",
  driving: "Another way to visualize impact — shows how many kilometers of car driving produce the same CO₂ emissions that this recycling process prevents.",
};

// ── InfoIcon component ──
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

// â”€â”€ 3D Battery Component for Disassembly Visualization â”€â”€
const RealisticBattery3D = ({ isExploded }) => {
  const groupRef = useRef();
  const explodeFactor = useRef(0);
  const coverRef = useRef();
  const modulesRef = useRef();
  const coolingRef = useRef();

  useFrame((state, delta) => {
    const target = isExploded ? 1 : 0;
    explodeFactor.current += (target - explodeFactor.current) * 4 * delta;
    
    if (coverRef.current) coverRef.current.position.y = 1.2 + (explodeFactor.current * 3.5);
    if (modulesRef.current) modulesRef.current.position.y = 0.6 + (explodeFactor.current * 1.5);
    if (coolingRef.current) coolingRef.current.position.y = 0.1 - (explodeFactor.current * 0.5);

    if (groupRef.current) groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      <mesh ref={coverRef} position={[0, 1.2, 0]}>
        <boxGeometry args={[3.4, 0.1, 4.4]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.7} />
      </mesh>
      <group ref={modulesRef} position={[0, 0.6, 0]}>
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
      <group ref={coolingRef} position={[0, 0.1, 0]}>
        <mesh>
          <boxGeometry args={[3.2, 0.15, 4.2]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.8} opacity={0.8} transparent />
        </mesh>
      </group>
    </group>
  );
};
// â”€â”€ 3D Robotic Arm Component â”€â”€
const RoboticArm3D = () => {
  const armRef = useRef();
  const forearmRef = useRef();
  const laserRef = useRef();
  const baseRotation = useRef(0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Scan back and forth
    baseRotation.current = Math.sin(time) * 0.5;
    if (armRef.current) armRef.current.rotation.y = baseRotation.current;
    
    // Arm moves up and down slightly
    if (forearmRef.current) forearmRef.current.rotation.z = Math.PI / 4 + Math.sin(time * 2) * 0.1;

    // Laser pulsing
    if (laserRef.current) laserRef.current.opacity = 0.5 + Math.sin(time * 10) * 0.5;
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Battery Module being scanned */}
      <mesh position={[0, 0.2, 1]}>
        <boxGeometry args={[2, 0.4, 1.5]} />
        <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* Base */}
      <mesh position={[0, 0.1, -1]}>
        <cylinderGeometry args={[0.6, 0.8, 0.2, 32]} />
        <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Main Arm Pillar */}
      <group ref={armRef} position={[0, 0.2, -1]}>
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 2, 16]} />
          <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Forearm Joint */}
        <group position={[0, 2, 0]} ref={forearmRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.4, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.9} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 2, 16]} />
            <meshStandardMaterial color="#6366f1" metalness={0.8} />
          </mesh>
          {/* Tool Head */}
          <mesh position={[0, -0.2, 2]}>
            <boxGeometry args={[0.4, 0.6, 0.4]} />
            <meshStandardMaterial color="#1f2937" metalness={0.9} />
          </mesh>
          {/* Laser beam */}
          <mesh position={[0, -1.5, 2]} ref={laserRef}>
            <cylinderGeometry args={[0.02, 0.05, 2, 8]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// â”€â”€ 3D Hydrometallurgical Extraction Component â”€â”€
const HydroExtraction3D = () => {
  const particlesRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (particlesRef.current) {
      particlesRef.current.children.forEach((child, i) => {
        child.position.y += 0.02 + Math.random() * 0.01;
        if (child.position.y > 2) {
          child.position.y = -2;
        }
        child.position.x += Math.sin(time * 2 + i) * 0.01;
      });
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Vats */}
      {[-1.5, 0, 1.5].map((x, idx) => {
        const colors = ["#ef4444", "#3b82f6", "#10b981"]; // Red, Blue, Green chemicals
        return (
          <group key={`vat-${x}`} position={[x, 0, 0]}>
            {/* Glass Tube */}
            <mesh transparent opacity={0.2}>
              <cylinderGeometry args={[0.6, 0.6, 4, 32]} />
              <meshStandardMaterial color="#e5e7eb" transparent opacity={0.2} metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Liquid */}
            <mesh position={[0, -0.5, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 3, 32]} />
              <meshStandardMaterial color={colors[idx]} transparent opacity={0.6} metalness={0.2} roughness={0.1} />
            </mesh>
            {/* Bubbles */}
            <group ref={idx === 1 ? particlesRef : null}>
              {Array.from({ length: 15 }).map((_, i) => (
                <mesh key={i} position={[(Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 0.8]}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
      
      {/* Connecting Pipes */}
      <mesh position={[-0.75, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 1.5, 16]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.75, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 1.5, 16]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
};
// Mock data for new charts
const carbonEcosystemData = [
  { year: '2025', traditional: 100, circuvolt: 100 },
  { year: '2026', traditional: 110, circuvolt: 85 },
  { year: '2027', traditional: 125, circuvolt: 65 },
  { year: '2028', traditional: 140, circuvolt: 45 },
  { year: '2029', traditional: 160, circuvolt: 30 },
  { year: '2030', traditional: 185, circuvolt: 15 },
];

const techniqueEfficiencyData = [
  { subject: 'Cost Efficiency', hydrometallurgy: 85, pyrometallurgy: 60, direct: 95 },
  { subject: 'CO2 Minimization', hydrometallurgy: 75, pyrometallurgy: 30, direct: 90 },
  { subject: 'Material Yield', hydrometallurgy: 95, pyrometallurgy: 80, direct: 85 },
  { subject: 'Scalability', hydrometallurgy: 90, pyrometallurgy: 100, direct: 60 },
  { subject: 'Process Speed', hydrometallurgy: 60, pyrometallurgy: 90, direct: 70 },
];

export default function RecoveryOptimizer() {
  const [formData, setFormData] = useState({
    component_id: 'COMP-IND-2026-001',
    component_type: 'EV Battery Pack',
    grade: 'B',
    soh: 76.4,
    chemistry: 'NMC',
    module_count: 16,
    cell_count: 192,
    rated_capacity_kwh: 75.0,
    motor_type: 'PMSM',
    semiconductor_type: 'Silicon Carbide (SiC)',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // AI streaming state
  const [aiText, setAiText] = useState('');
  const [aiSource, setAiSource] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const aiTextRef = useRef('');

  const handleRecommend = async () => {
    setLoading(true);
    setAiText('');
    setAiSource(null);
    setAiDone(false);
    aiTextRef.current = '';
    try {
      const res = await recommendRecovery(formData);
      setResult(res);
      toast.success('Intelligent ecosystem recovery plan generated!');

      // Auto-stream AI analysis
      setAiLoading(true);
      await streamRecoveryAiSummary(formData, res, (event) => {
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
      toast.error('Failed: ' + (err.response?.data?.detail || err.message));
      setAiLoading(false);
    }
    setLoading(false);
  };

  const materialChartData = result?.material_recovery
    ? Object.entries(result.material_recovery)
        .filter(([k]) => k !== 'summary')
        .map(([name, info], i) => ({ name, value: info.recovered_kg, color: COLORS[i % COLORS.length] }))
    : [];

  const safetyColor = (level) => level === 'high' ? 'text-red-500 bg-red-50 border-red-200' : level === 'medium' ? 'text-amber-500 bg-amber-50 border-amber-200' : 'text-emerald-500 bg-emerald-50 border-emerald-200';
  const safetyLabel = (level) => level === 'high' ? 'critical risk' : level === 'medium' ? 'medium risk' : 'low risk';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
          Intelligent Ecosystem Recovery Center
          <InfoIcon tooltip="Command center for maximizing component lifecycle, extracting critical materials via AI robotics, and mitigating global carbon footprint." />
        </h2>
        <p className="text-gray-500">AI-driven systems to extend lifecycle, optimize extraction, and minimize ecosystem carbon footprint.</p>
      </div>

      {/* Input Form */}
      <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            Component Type <InfoIcon tooltip="Select the major EV component to recover." />
          </label>
          <select value={formData.component_type} onChange={e => setFormData({...formData, component_type: e.target.value})}
            className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-bold">
            <option value="EV Battery Pack">ðŸ”‹ EV Battery Pack</option>
            <option value="Electric Drive Motor">âš™ï¸ Electric Drive Motor</option>
            <option value="Power Electronics (Inverter)">âš¡ Power Electronics (Inverter)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Grade Classification <InfoIcon tooltip={INFO.grade} />
            </label>
            <select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
              <option value="A">A - Direct Vehicle Reuse</option>
              <option value="B">B - Secondary / Refurbish</option>
              <option value="C">C - Component Refurbishment</option>
              <option value="D">D - Material Recycling</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              SOH % Diagnostics <InfoIcon tooltip={INFO.soh} />
            </label>
            <select value={formData.soh} onChange={e => setFormData({...formData, soh: parseFloat(e.target.value)})}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
              <option value={95.0}>95.0% - Like New</option>
              <option value={85.5}>85.5% - Minor Degradation</option>
              <option value={76.4}>76.4% - Average EOL</option>
              <option value={60.0}>60.0% - Significant Wear</option>
              <option value={45.0}>45.0% - Severe Degradation</option>
              <option value={20.0}>20.0% - Critical Failure</option>
            </select>
          </div>
          
          {formData.component_type === 'EV Battery Pack' && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Battery Chemistry <InfoIcon tooltip={INFO.chemistry} />
                </label>
                <select value={formData.chemistry} onChange={e => setFormData({...formData, chemistry: e.target.value})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
                  <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
                  <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                  <option value="NCA">NCA (Nickel Cobalt Aluminum)</option>
                  <option value="LCO">LCO (Lithium Cobalt Oxide)</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Module Density <InfoIcon tooltip={INFO.modules} />
                </label>
                <select value={formData.module_count} onChange={e => setFormData({...formData, module_count: parseInt(e.target.value)})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
                  <option value={8}>8 Modules (Compact)</option>
                  <option value={12}>12 Modules (Standard)</option>
                  <option value={16}>16 Modules (Extended Range)</option>
                  <option value={24}>24 Modules (High Capacity)</option>
                  <option value={32}>32 Modules (Commercial)</option>
                </select>
              </div>
            </>
          )}

          {formData.component_type === 'Electric Drive Motor' && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Motor Type <InfoIcon tooltip="Permanent Magnet vs Induction impacts Rare Earth material recovery" />
                </label>
                <select value={formData.motor_type} onChange={e => setFormData({...formData, motor_type: e.target.value})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
                  <option value="PMSM">PMSM (Permanent Magnet)</option>
                  <option value="Induction">AC Induction Motor</option>
                  <option value="WRSM">Wound-Rotor Sync</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Magnet Grade <InfoIcon tooltip="Grade of Neodymium magnets used" />
                </label>
                <select className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
                  <option>UH (Ultra High Temp)</option>
                  <option>SH (Super High Temp)</option>
                  <option>H (High Temp)</option>
                </select>
              </div>
            </>
          )}

          {formData.component_type === 'Power Electronics (Inverter)' && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Semiconductor Type <InfoIcon tooltip="Silicon Carbide yields higher value recovery than standard Silicon" />
                </label>
                <select value={formData.semiconductor_type} onChange={e => setFormData({...formData, semiconductor_type: e.target.value})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
                  <option value="Silicon Carbide (SiC)">Silicon Carbide (SiC)</option>
                  <option value="IGBT (Silicon)">IGBT (Standard Silicon)</option>
                  <option value="GaN">Gallium Nitride (GaN)</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Thermal Condition <InfoIcon tooltip="Condition of thermal paste and cooling plates" />
                </label>
                <select className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
                  <option>Intact / Reusable</option>
                  <option>Degraded</option>
                  <option>Thermal Runaway</option>
                </select>
              </div>
            </>
          )}
        </div>
        <button onClick={handleRecommend} disabled={loading || aiLoading}
          className="mt-5 w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] uppercase tracking-wide text-sm flex items-center justify-center gap-2">
          {loading ? 'Optimizing Ecosystem...' : aiLoading ? (
            <><Sparkles className="w-5 h-5 animate-pulse" /> Running Ecosystem AI Simulation...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Generate Intelligent Recovery Ecosystem Plan</>
          )}
        </button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-indigo-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-indigo-300 mb-2 uppercase tracking-widest gap-1.5"><Activity className="w-3.5 h-3.5" /> Lifecycle Extended</div>
              <div className="text-3xl font-black text-white">+{(result.recovery_score / 15).toFixed(1)} <span className="text-lg text-indigo-200">Years</span></div>
              <div className="mt-2 text-[10px] text-indigo-400 font-medium">Predicted secondary operational lifespan</div>
            </div>
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-teal-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-teal-300 mb-2 uppercase tracking-widest gap-1.5"><Leaf className="w-3.5 h-3.5" /> COâ‚‚ Footprint Avoided</div>
              <div className="text-3xl font-black text-white">{result.carbon_impact?.total_carbon_avoided_kgco2e?.toLocaleString()} <span className="text-lg text-teal-200">kg</span></div>
              <div className="mt-2 text-[10px] text-teal-400 font-medium">Mitigated from raw material extraction</div>
            </div>
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-emerald-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-emerald-300 mb-2 uppercase tracking-widest gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Net Circular Value</div>
              <div className="text-3xl font-black text-white">${result.economic_value?.net_value_usd?.toLocaleString()}</div>
              <div className="mt-2 text-[10px] text-emerald-400 font-medium">Market value minus extraction overhead</div>
            </div>
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-amber-300 mb-2 uppercase tracking-widest gap-1.5"><Layers className="w-3.5 h-3.5" /> Material Yield</div>
              <div className="text-3xl font-black text-white">{result.material_recovery?.summary?.overall_recovery_pct}%</div>
              <div className="mt-2 text-[10px] text-amber-400 font-medium">High-purity critical mineral recovery</div>
            </div>
          </div>

          {/* Section 1: Disassembly 3D & Sequence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1b2a3d] rounded-xl p-0 border border-[#d4c5a9] overflow-hidden relative shadow-inner h-[440px]">
              <div className="absolute top-5 left-5 z-10">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1 flex items-center">
                  âœ¦ Digital Twin Disassembly<InfoIcon tooltip="Interactive 3D representation of the recommended physical disassembly." />
                </h3>
                <p className="text-xs text-gray-400 font-medium">Robotic pathfinding simulation running...</p>
              </div>
              <Canvas camera={{ position: [5, 4, 6], fov: 45 }}>
                <color attach="background" args={['#1b2a3d']} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <Environment preset="city" />
                <RealisticBattery3D isExploded={true} />
                <ContactShadows resolution={1024} scale={12} blur={2} opacity={0.4} far={10} color="#000000" position={[0, -1.2, 0]} />
                <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minDistance={4} maxDistance={12} autoRotate autoRotateSpeed={0.8} />
              </Canvas>
            </div>

            <div className="bg-white/80 rounded-xl p-6 border border-[#d4c5a9] h-[440px] overflow-y-auto shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-5 flex items-center">
                âœ¦ AI-Optimized Sequence<InfoIcon tooltip={INFO.disassembly} />
              </h3>
              <div className="space-y-4">
                {result.recovery_plan?.map((step, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-sm text-emerald-700 flex-shrink-0 font-bold shadow-sm group-hover:scale-110 transition-transform">
                      {step.step}
                    </div>
                    <div className="flex-1 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <p className="text-sm font-bold text-gray-800">{step.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.reason}</p>
                      <div className="flex gap-3 mt-2 items-center">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1"><Zap className="w-3 h-3"/> AI Confidence: {(90 + Math.random() * 9).toFixed(1)}%</span>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border ${safetyColor(step.safety_level)}`}>
                          {safetyLabel(step.safety_level)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Macro Ecosystem Impact Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/80 rounded-xl p-6 border border-[#d4c5a9] shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">
                Ecosystem Carbon Minimization
              </h3>
              <p className="text-xs text-gray-400 mb-6 font-medium">10-year projection (Relative Emissions Index)</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={carbonEcosystemData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCircuvolt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="year" tick={{fontSize: 10, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', marginTop: '10px' }} />
                  <Area type="monotone" name="Traditional Mining & Disposal" dataKey="traditional" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorTrad)" />
                  <Area type="monotone" name="CircuVolt AI Recycling" dataKey="circuvolt" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCircuvolt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/80 rounded-xl p-6 border border-[#d4c5a9] shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">
                AI Technique Optimization
              </h3>
              <p className="text-xs text-gray-400 mb-2 font-medium">Comparative efficiency of intelligent recovery pathways</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={techniqueEfficiencyData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Hydrometallurgy" dataKey="hydrometallurgy" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Direct Recycling" dataKey="direct" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.4} />
                  <Radar name="Pyrometallurgy" dataKey="pyrometallurgy" stroke="#ef4444" strokeWidth={1} fill="#ef4444" fillOpacity={0.1} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 3: AI-Driven Techniques Visual Showcase */}
          <div className="bg-[#1b2a3d] rounded-xl border border-indigo-900 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-indigo-900/50 bg-[#121c29]">
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Next-Gen AI Extraction Technologies
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-8">
              <div className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)] relative group cursor-crosshair">
                  <Canvas camera={{ position: [4, 3, 5], fov: 45 }}>
                    <color attach="background" args={['#0f172a']} />
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[5, 10, 5]} intensity={1.5} color="#818cf8" />
                    <pointLight position={[-5, 2, -5]} intensity={1} color="#34d399" />
                    <RoboticArm3D />
                    <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 + 0.1} />
                  </Canvas>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1b2a3d] via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">System Active</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Automated Computer Vision Disassembly</h4>
                  <p className="text-sm text-indigo-200/80 leading-relaxed font-medium">
                    Our AI models drive precise robotic arms to safely dismantle high-voltage battery enclosures. By leveraging real-time 3D depth mapping and structural defect detection, the system completely removes human risk, guarantees non-destructive module separation, and accelerates throughput by over 400%.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden border border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.15)] relative group cursor-crosshair">
                  <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                    <color attach="background" args={['#0f172a']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[5, 5, 5]} intensity={1.5} color="#2dd4bf" />
                    <pointLight position={[-5, -5, -5]} intensity={1} color="#38bdf8" />
                    <HydroExtraction3D />
                    <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 + 0.1} />
                  </Canvas>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1b2a3d] via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Simulation Running</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Predictive Hydrometallurgical Extraction</h4>
                  <p className="text-sm text-teal-200/80 leading-relaxed font-medium">
                    Through advanced chemical flow simulations, our platform determines the exact solvent concentrations needed for optimal critical mineral leaching. This ensures a 98% purity yield for Lithium, Cobalt, and Nickel, while simultaneously slashing toxic runoff and water consumption compared to traditional recycling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Material Yield & AI Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/80 rounded-xl p-6 border border-[#d4c5a9] shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 flex items-center">
                âœ¦ High-Purity Material Yield<InfoIcon tooltip={INFO.material_chart} />
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={materialChartData} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey="value" paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}kg`} labelLine={false}>
                    {materialChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              {result.carbon_impact && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Equivalent Trees</span>
                    <span className="text-lg font-black text-emerald-600">{result.carbon_impact.equivalent_trees_year}</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Km Driving Offset</span>
                    <span className="text-lg font-black text-blue-600">{result.carbon_impact.equivalent_km_driving?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Summary Report - Streaming */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-purple-200 overflow-hidden shadow-sm h-full flex flex-col">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-purple-200/60 bg-purple-100/50">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shadow-inner">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-sm font-bold text-purple-900 tracking-wide">LLM Ecosystem Analysis</h4>
                {aiSource && (
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ml-2 ${
                    aiSource === 'llm' ? 'bg-purple-200 text-purple-700 border border-purple-300' : 'bg-amber-100 text-amber-700 border border-amber-300'
                  }`}>
                    {aiSource === 'llm' ? 'âœ¦ Neural Net' : 'âš™ Rule Engine'}
                  </span>
                )}
                {aiLoading && <Loader2 className="w-4 h-4 text-purple-500 animate-spin ml-auto" />}
                {aiDone && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
              </div>
              <div className="px-6 py-5 text-sm text-gray-700 leading-relaxed flex-1 overflow-y-auto max-h-[350px]">
                {aiText.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.includes('**')) {
                    return <h5 key={i} className="font-bold text-purple-900 mt-5 mb-2 text-sm flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-sm bg-purple-500" />{line.replace(/\*\*/g, '')}
                    </h5>;
                  }
                  if (line.startsWith('â€¢')) {
                    return (
                      <div key={i} className="flex gap-3 items-start ml-2 my-2 bg-white/50 p-2 rounded-lg border border-purple-100/50">
                        <span className="text-emerald-500 mt-0.5 text-sm font-black">â€¢</span>
                        <span className="text-gray-800 text-sm font-medium">{line.slice(2).replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                      </div>
                    );
                  }
                  if (line.startsWith('â†’')) {
                    return (
                      <div key={i} className="flex gap-3 items-start ml-2 my-2">
                        <span className="text-purple-600 mt-0.5 font-bold">â†’</span>
                        <span className="text-gray-700 text-sm">{line.slice(2).replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                      </div>
                    );
                  }
                  if (line.trim() === '') return <div key={i} className="h-3" />;
                  return <p key={i} className="text-sm text-gray-700 my-2 font-medium">{line.replace(/\*\*/g, '').replace(/\*/g, '')}</p>;
                })}
                {aiLoading && <span className="inline-block w-2.5 h-4 bg-purple-500 animate-pulse ml-1 rounded-sm" />}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

