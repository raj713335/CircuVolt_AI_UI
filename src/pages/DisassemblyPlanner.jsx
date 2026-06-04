import React, { useState, useRef } from 'react';
import {
  Hammer, AlertTriangle, ShieldCheck, DollarSign, Leaf, Sparkles,
  Activity, Layers, Zap, Bot, Loader2, CheckCircle, Info, X, ArrowRight,
  Shield, Wrench, Clock, Weight, Recycle
} from 'lucide-react';
import { generateDisassemblyPlan, streamDisassemblyAiAnalysis } from '../services/api';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

const ROUTE_COLORS = {
  'SOH_test': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  'reuse_certified': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  'reuse_or_e_waste': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  'copper_recovery': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  'alloy_sorting': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  'resale_grade_B': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  'shredding': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  'refurbish': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
};

const SAFETY_STYLES = {
  'critical': { bg: 'bg-red-500', text: 'text-red-100' },
  'high': { bg: 'bg-orange-500', text: 'text-orange-100' },
  'medium': { bg: 'bg-amber-500', text: 'text-amber-100' },
  'low': { bg: 'bg-emerald-500', text: 'text-emerald-100' },
};

const VEHICLE_CATALOG = {
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
  'BMW': ['i4', 'iX', 'i3', 'i7'],
  'Nissan': ['Leaf', 'Ariya'],
  'Volkswagen': ['ID.4', 'ID.3', 'e-Golf'],
  'Hyundai': ['Ioniq 5', 'Kona Electric', 'Ioniq 6']
};

// ── InfoIcon ──
const InfoIcon = ({ tooltip }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1.5">
      <button onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="w-4 h-4 rounded-full bg-gray-200 hover:bg-emerald-100 text-gray-500 hover:text-emerald-600 inline-flex items-center justify-center transition-colors cursor-help">
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

// ── 3D Exploded Vehicle Component ──
const ExplodedVehicle3D = ({ isExploded }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.15;
    }
  });

  const spread = isExploded ? 1 : 0;

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Chassis / Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 0.15, 1.8]} />
        <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Battery Pack (underbody) */}
      <mesh position={[0, -0.3 - spread * 1.2, 0]}>
        <boxGeometry args={[3.2, 0.25, 1.5]} />
        <meshStandardMaterial color="#6366f1" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Body Shell */}
      <group position={[0, 0.5 + spread * 1.5, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[3.8, 0.6, 1.7]} />
          <meshStandardMaterial color="#1f2937" roughness={0.1} metalness={0.95} transparent opacity={0.7} />
        </mesh>
        {/* Roof */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[2.5, 0.12, 1.6]} />
          <meshStandardMaterial color="#111827" roughness={0.05} metalness={0.98} />
        </mesh>
      </group>

      {/* Front Motor */}
      <mesh position={[1.5 + spread * 0.8, 0.1, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#ec4899" roughness={0.3} metalness={0.85} />
      </mesh>

      {/* Rear Motor */}
      <mesh position={[-1.5 - spread * 0.8, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.85} />
      </mesh>

      {/* Wheels */}
      {[
        [1.6, -0.2, 1 + spread * 0.5],
        [1.6, -0.2, -1 - spread * 0.5],
        [-1.6, -0.2, 1 + spread * 0.5],
        [-1.6, -0.2, -1 - spread * 0.5],
      ].map((pos, i) => (
        <mesh key={i} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.15, 24]} />
          <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Power Electronics box */}
      <mesh position={[0.8 + spread * 0.5, 0.25 + spread * 0.8, 0.5 + spread * 0.4]}>
        <boxGeometry args={[0.5, 0.2, 0.4]} />
        <meshStandardMaterial color="#06b6d4" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Wiring Harness visual */}
      <mesh position={[0, 0.15, 0.7 + spread * 0.6]}>
        <torusGeometry args={[1.5, 0.03, 8, 48]} />
        <meshStandardMaterial color="#a855f7" roughness={0.5} />
      </mesh>
    </group>
  );
};

// ── 3D Robotic Disassembly Arm ──
const DisassemblyArm3D = () => {
  const armRef = useRef();
  const clawRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (armRef.current) armRef.current.rotation.y = Math.sin(t * 0.6) * 0.6;
    if (clawRef.current) {
      clawRef.current.rotation.z = Math.PI / 4 + Math.sin(t * 1.5) * 0.15;
    }
  });

  return (
    <group position={[0, -1.2, 0]}>
      {/* Conveyor belt */}
      <mesh position={[0, 0.05, 1.5]}>
        <boxGeometry args={[5, 0.1, 1.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Conveyor rollers */}
      {[-2, -1, 0, 1, 2].map((x, i) => (
        <mesh key={i} position={[x, 0.05, 1.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.15, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
      ))}

      {/* Parts on conveyor */}
      <mesh position={[-1, 0.25, 1.5]}>
        <boxGeometry args={[0.6, 0.25, 0.5]} />
        <meshStandardMaterial color="#6366f1" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[1.2, 0.2, 1.5]}>
        <cylinderGeometry args={[0.2, 0.2, 0.3, 12]} />
        <meshStandardMaterial color="#ec4899" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Robot Base */}
      <mesh position={[0, 0.15, -0.5]}>
        <cylinderGeometry args={[0.5, 0.7, 0.3, 32]} />
        <meshStandardMaterial color="#1f2937" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Robot arm assembly */}
      <group ref={armRef} position={[0, 0.3, -0.5]}>
        {/* Main pillar */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.15, 0.18, 1.6, 16]} />
          <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Joint */}
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.9} />
        </mesh>
        {/* Forearm */}
        <group ref={clawRef} position={[0, 1.6, 0]}>
          <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 1.6, 12]} />
            <meshStandardMaterial color="#6366f1" metalness={0.8} />
          </mesh>
          {/* Tool head */}
          <mesh position={[0, -0.15, 1.6]}>
            <boxGeometry args={[0.35, 0.5, 0.35]} />
            <meshStandardMaterial color="#0f172a" metalness={0.95} />
          </mesh>
          {/* Laser */}
          <mesh position={[0, -1.2, 1.6]}>
            <cylinderGeometry args={[0.015, 0.04, 1.6, 6]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export default function DisassemblyPlanner() {
  const [formData, setFormData] = useState({
    vehicle_id: 'VIN-9876-EV',
    make: 'Tesla',
    model: 'Model 3',
    year: 2021,
    accident_condition: 'Frontal Impact',
    passport_status: 'incomplete'
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [aiSource, setAiSource] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setAiText('');
    setAiDone(false);
    setAiSource(null);
    try {
      const data = await generateDisassemblyPlan(formData);
      setResult(data);
      setIsExploded(true);
      toast.success('Intelligent Disassembly Plan Generated!');

      // Stream AI analysis
      setAiLoading(true);
      try {
        await streamDisassemblyAiAnalysis(formData, data, (event) => {
          if (event.type === 'meta') {
            setAiSource(event.source);
          } else if (event.type === 'text') {
            setAiText(prev => prev + event.content);
          } else if (event.type === 'done') {
            setAiLoading(false);
            setAiDone(true);
          }
        });
      } catch {
        setAiLoading(false);
        setAiText('AI analysis unavailable. Results based on ML model output.');
        setAiDone(true);
        setAiSource('fallback');
      }
    } catch (error) {
      toast.error('Failed to generate plan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Chart data derived from result
  const materialChartData = result?.material_breakdown?.map((m, i) => ({
    name: m.material, value: m.weight_kg, color: COLORS[i % COLORS.length]
  })) || [];

  const partValueData = result?.priority_parts?.map(p => ({
    name: p.part.replace(/_/g, ' '), value: p.value_usd || 0, recyclability: p.recyclability_pct || 0
  })) || [];

  const radarData = result ? [
    { attr: 'Revenue', score: Math.min(100, (result.estimated_revenue / 600) ) },
    { attr: 'CO2 Saved', score: Math.min(100, (result.estimated_co2e_saving_kg / 15)) },
    { attr: 'Automation', score: result.automation_feasibility || 65 },
    { attr: 'Material Yield', score: result.material_breakdown?.reduce((acc, m) => acc + m.recovery_rate_pct, 0) / (result.material_breakdown?.length || 1) || 75 },
    { attr: 'Safety', score: 100 - (result.risk_score || 30) },
    { attr: 'Compliance', score: result.passport_status === 'complete' ? 95 : 70 },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Hammer className="w-8 h-8 text-emerald-600" />
            Intelligent Disassembly Planner
          </h1>
          <p className="text-gray-500 mt-1 text-sm">AI-driven ELV component routing, depollution strategy, and value recovery optimization.</p>
        </div>
      </div>

      {/* Top: 3D + Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Vehicle Exploded View */}
        <div className="lg:col-span-2 bg-[#1b2a3d] rounded-xl border border-[#d4c5a9] overflow-hidden relative shadow-inner h-[420px]">
          <div className="absolute top-5 left-5 z-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Digital Twin Disassembly View
            </h3>
            <p className="text-[10px] text-gray-400 font-medium">
              {isExploded ? 'Components separated for routing analysis' : 'Drag to rotate - Click generate to explode'}
            </p>
          </div>
          <button onClick={() => setIsExploded(!isExploded)}
            className="absolute top-5 right-5 z-10 text-xs bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all font-medium">
            {isExploded ? 'Assemble' : 'Explode'}
          </button>
          <Canvas camera={{ position: [6, 4, 6], fov: 40 }}>
            <color attach="background" args={['#1b2a3d']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#818cf8" />
            <Environment preset="city" />
            <ExplodedVehicle3D isExploded={isExploded} />
            <ContactShadows position={[0, -1.8, 0]} opacity={0.4} scale={20} blur={2.5} far={5} />
            <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minDistance={4} maxDistance={15} autoRotate={!isExploded} autoRotateSpeed={0.5} />
          </Canvas>
        </div>

        {/* Input Form */}
        <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4">Vehicle Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Vehicle ID / VIN</label>
              <input type="text" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
                className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Make</label>
                <select value={formData.make} onChange={e => {
                  const make = e.target.value;
                  const models = VEHICLE_CATALOG[make] || ['Unknown'];
                  setFormData({...formData, make, model: models[0]});
                }} className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                  {Object.keys(VEHICLE_CATALOG).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Model</label>
                <select value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                  {(VEHICLE_CATALOG[formData.make] || ['Unknown']).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Year</label>
                <select value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                  {[2026,2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Passport Status</label>
                <select value={formData.passport_status} onChange={e => setFormData({...formData, passport_status: e.target.value})}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                  <option value="incomplete">Incomplete</option>
                  <option value="complete">Complete</option>
                  <option value="expired">Expired</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Accident / Condition</label>
              <select value={formData.accident_condition} onChange={e => setFormData({...formData, accident_condition: e.target.value})}
                className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                <optgroup label="No Damage">
                  <option>None (Normal End of Life)</option>
                  <option>Age Retirement (High Mileage)</option>
                  <option>Lease Return / Fleet Decommission</option>
                </optgroup>
                <optgroup label="Collision Damage">
                  <option>Frontal Impact</option>
                  <option>Rear Impact</option>
                  <option>Side Impact (T-Bone)</option>
                  <option>Rollover</option>
                  <option>Multi-Vehicle Collision</option>
                  <option>Pedestrian / Obstacle Impact</option>
                </optgroup>
                <optgroup label="Environmental Damage">
                  <option>Flood / Water Damage</option>
                  <option>Hail / Storm Damage</option>
                  <option>Salt Corrosion (Coastal)</option>
                </optgroup>
                <optgroup label="Thermal / Electrical">
                  <option>Thermal Event History</option>
                  <option>Battery Fire / Thermal Runaway</option>
                  <option>Electrical System Failure</option>
                  <option>Charging Port Damage</option>
                </optgroup>
                <optgroup label="Mechanical">
                  <option>Suspension / Chassis Damage</option>
                  <option>Drivetrain Failure</option>
                  <option>Vandalism / Theft Recovery</option>
                </optgroup>
              </select>
            </div>
            <button onClick={handleGenerate} disabled={loading || aiLoading}
              className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] uppercase tracking-wide text-sm flex items-center justify-center gap-2">
              {loading ? 'Analyzing Vehicle...' : aiLoading ? (
                <><Sparkles className="w-5 h-5 animate-pulse" /> AI Analyzing...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Disassembly Plan</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-emerald-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-emerald-300 mb-2 uppercase tracking-widest gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Value Recovery</div>
              <div className="text-3xl font-black text-white">${result.estimated_revenue?.toLocaleString()}</div>
              <div className="mt-2 text-[10px] text-emerald-400 font-medium">Estimated salvage + material value</div>
            </div>
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-teal-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-teal-300 mb-2 uppercase tracking-widest gap-1.5"><Leaf className="w-3.5 h-3.5" /> CO2e Avoided</div>
              <div className="text-3xl font-black text-white">{result.estimated_co2e_saving_kg?.toLocaleString()} <span className="text-lg text-teal-200">kg</span></div>
              <div className="mt-2 text-[10px] text-teal-400 font-medium">vs. virgin material extraction</div>
            </div>
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-indigo-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-indigo-300 mb-2 uppercase tracking-widest gap-1.5"><Weight className="w-3.5 h-3.5" /> Total Mass</div>
              <div className="text-3xl font-black text-white">{result.total_weight_kg?.toLocaleString()} <span className="text-lg text-indigo-200">kg</span></div>
              <div className="mt-2 text-[10px] text-indigo-400 font-medium">Recoverable vehicle weight</div>
            </div>
            <div className="bg-gradient-to-br from-[#1b2a3d] to-[#121c29] rounded-xl p-5 border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
              <div className="flex items-center text-xs font-bold text-amber-300 mb-2 uppercase tracking-widest gap-1.5"><Activity className="w-3.5 h-3.5" /> Automation</div>
              <div className="text-3xl font-black text-white">{result.automation_feasibility?.toFixed(0)}%</div>
              <div className="mt-2 text-[10px] text-amber-400 font-medium">Robotic disassembly feasibility</div>
            </div>
          </div>

          {/* Depollution + 3D Robot + Disassembly Sequence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Robot 3D + Depollution */}
            <div className="space-y-4">
              <div className="bg-[#1b2a3d] rounded-xl border border-indigo-900 overflow-hidden relative h-[300px]">
                <div className="absolute top-4 left-4 z-10">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-1.5">
                    <Wrench className="w-3 h-3" /> Robotic Disassembly Station
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">System Active</span>
                  </div>
                </div>
                <Canvas camera={{ position: [4, 3, 5], fov: 45 }}>
                  <color attach="background" args={['#0f172a']} />
                  <ambientLight intensity={0.4} />
                  <directionalLight position={[5, 10, 5]} intensity={1.5} color="#818cf8" />
                  <pointLight position={[-5, 2, -5]} intensity={1} color="#34d399" />
                  <DisassemblyArm3D />
                  <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 + 0.1} />
                </Canvas>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1b2a3d] via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Depollution Steps */}
              <div className="bg-white/80 rounded-xl p-5 border border-[#d4c5a9] shadow-sm">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Mandatory Depollution Protocol
                </h4>
                <div className="space-y-2">
                  {result.depollution_steps?.map((step, i) => {
                    const s = typeof step === 'string' ? { action: step, safety_level: 'medium', duration_min: 10 } : step;
                    const safety = SAFETY_STYLES[s.safety_level] || SAFETY_STYLES['medium'];
                    return (
                      <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg p-3 shadow-sm group hover:border-emerald-200 transition-all">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-xs text-emerald-700 font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800 capitalize">{s.action}</span>
                          {s.reason && <p className="text-[10px] text-gray-400 mt-0.5">{s.reason}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {s.duration_min && (
                            <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />{s.duration_min}m
                            </span>
                          )}
                          <span className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${safety.bg} ${safety.text}`}>
                            {s.safety_level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Disassembly Sequence */}
            <div className="bg-white/80 rounded-xl p-6 border border-[#d4c5a9] shadow-sm overflow-y-auto max-h-[660px]">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-4 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500" /> AI-Optimized Disassembly Sequence
              </h4>
              <div className="space-y-3">
                {result.disassembly_sequence?.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start group">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center text-xs text-indigo-700 flex-shrink-0 font-bold group-hover:scale-110 transition-transform">
                      {step.step}
                    </div>
                    <div className="flex-1 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <p className="text-sm font-bold text-gray-800 capitalize">{step.component?.replace(/_/g, ' ')}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {step.tool_required && (
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Wrench className="w-2.5 h-2.5" />{step.tool_required}
                          </span>
                        )}
                        {step.time_min && (
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{step.time_min} min
                          </span>
                        )}
                      </div>
                      {step.safety_note && (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />{step.safety_note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority Part Routing - Premium Cards */}
          <div className="bg-white/80 rounded-xl p-6 border border-[#d4c5a9] shadow-sm">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-4 flex items-center gap-1.5">
              <Recycle className="w-3.5 h-3.5 text-emerald-500" /> Component Recovery Routing
              <InfoIcon tooltip="Each component is assigned an optimal recovery route based on its condition, material value, and environmental impact. Routes include: SOH testing for batteries, certified reuse, copper/alloy recovery, and controlled shredding." />
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.priority_parts?.map((item, i) => {
                const routeStyle = ROUTE_COLORS[item.route] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                        {(item.part || '').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 capitalize text-sm">{(item.part || '').replace(/_/g, ' ')}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.weight_kg && <span className="text-[9px] text-gray-400 font-medium">{item.weight_kg} kg</span>}
                          {item.value_usd && <span className="text-[9px] text-emerald-500 font-bold">${item.value_usd}</span>}
                          {item.recyclability_pct && (
                            <span className="text-[9px] text-indigo-500 font-medium">{item.recyclability_pct}% recoverable</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.safety_risk === 'high' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${routeStyle.bg} ${routeStyle.text} border ${routeStyle.border}`}>
                        {(item.route || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Material Breakdown Pie */}
            {materialChartData.length > 0 && (
              <div className="bg-white/80 rounded-xl p-5 border border-[#d4c5a9] shadow-sm">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-3">
                  Material Recovery Breakdown
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={materialChartData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={3}
                      label={({ name, value }) => `${name}: ${value}kg`} labelLine={false}>
                      {materialChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Part Value Bar Chart */}
            {partValueData.length > 0 && (
              <div className="bg-white/80 rounded-xl p-5 border border-[#d4c5a9] shadow-sm">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-3">
                  Component Value (USD)
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={partValueData} layout="vertical" margin={{ left: 70, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} width={65} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Radar Chart */}
            {radarData.length > 0 && (
              <div className="bg-white/80 rounded-xl p-5 border border-[#d4c5a9] shadow-sm">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-3">
                  Recovery Performance Radar
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="#d4c5a9" />
                    <PolarAngleAxis dataKey="attr" tick={{ fontSize: 8, fill: '#666' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Performance" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Analysis Panel */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-purple-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-purple-200/60 bg-purple-100/50">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shadow-inner">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-sm font-bold text-purple-900 tracking-wide">LLM Disassembly Intelligence Report</h4>
              {aiSource && (
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ml-2 ${
                  aiSource === 'llm' ? 'bg-purple-200 text-purple-700 border border-purple-300' : 'bg-amber-100 text-amber-700 border border-amber-300'
                }`}>
                  {aiSource === 'llm' ? 'Neural Net' : 'Rule Engine'}
                </span>
              )}
              {aiLoading && <Loader2 className="w-4 h-4 text-purple-500 animate-spin ml-auto" />}
              {aiDone && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
            </div>
            <div className="px-6 py-5 text-sm text-gray-700 leading-relaxed max-h-[400px] overflow-y-auto">
              {aiText.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.includes('**')) {
                  return <h5 key={i} className="font-bold text-purple-900 mt-5 mb-2 text-sm flex items-center gap-2 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-sm bg-purple-500" />{line.replace(/\*\*/g, '')}
                  </h5>;
                }
                if (line.startsWith('--') || line.startsWith('---')) {
                  return <div key={i} className="flex gap-3 items-start ml-2 my-2 bg-white/50 p-2 rounded-lg border border-purple-100/50">
                    <span className="text-emerald-500 mt-0.5 text-sm font-black">--</span>
                    <span className="text-gray-800 text-sm font-medium">{line.slice(3).replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                  </div>;
                }
                if (line.startsWith('->')) {
                  return <div key={i} className="flex gap-3 items-start ml-2 my-2">
                    <span className="text-purple-600 mt-0.5 font-bold">-&gt;</span>
                    <span className="text-gray-700 text-sm">{line.slice(3).replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                  </div>;
                }
                if (line.trim() === '') return <div key={i} className="h-3" />;
                return <p key={i} className="text-sm text-gray-700 my-2 font-medium">{line.replace(/\*\*/g, '').replace(/\*/g, '')}</p>;
              })}
              {aiLoading && <span className="inline-block w-2.5 h-4 bg-purple-500 animate-pulse ml-1 rounded-sm" />}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
