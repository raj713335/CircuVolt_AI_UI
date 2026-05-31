import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import {
  FileText, QrCode, Download, CheckCircle, Shield, Recycle, Leaf, DollarSign,
  Battery, Zap, Info, X, Sparkles, Loader2, AlertTriangle, Award, Globe,
  Clock, Layers, FlaskConical, Scale, ChevronRight, Cpu, Target
} from 'lucide-react';
import { generatePassport, streamPassportAiAnalysis } from '../services/api';
import toast from 'react-hot-toast';

// ── Info icon ──
const InfoIcon = ({ tooltip }) => {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="w-3.5 h-3.5 rounded-full bg-gray-200 hover:bg-emerald-100 text-gray-500 hover:text-emerald-600 inline-flex items-center justify-center transition-colors cursor-help">
        <Info className="w-2 h-2" />
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="fixed z-50 w-72 bg-white rounded-xl shadow-xl border border-[#d4c5a9] p-3.5 text-xs text-gray-600 leading-relaxed"
            ref={el => {
              if (el) {
                const btn = el.parentElement.querySelector('button');
                const r = btn.getBoundingClientRect();
                el.style.top = `${Math.max(8, r.top - el.offsetHeight - 8)}px`;
                el.style.left = `${Math.max(8, Math.min(r.left - 136, window.innerWidth - 296))}px`;
              }
            }}>
            <button onClick={() => setShow(false)} className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
            {tooltip}
          </div>
        </>
      )}
    </span>
  );
};

// ── Field info tooltips ──
const FIELD_INFO = {
  component_id: "Unique identifier for this battery component. Used to look up existing SOH predictions and link passport data across the system.",
  battery_id: "Battery pack serial number assigned by the manufacturer. Appears on the physical label and is used for warranty tracking.",
  vehicle_id: "Vehicle identification number (VIN) or internal ID of the vehicle this battery was installed in.",
  manufacturer: "Company that manufactured the battery pack. Required for EU supply chain due diligence.",
  model: "Battery or vehicle model name. Helps identify the specific pack design and chemistry variant.",
  chemistry: "Cathode chemistry type (e.g., NMC = Nickel Manganese Cobalt, LFP = Lithium Iron Phosphate). Determines recycling process and recovered material value.",
  manufacturing_date: "Date the battery was manufactured. Used to calculate age, warranty status, and expected degradation.",
  rated_capacity_kwh: "Original energy capacity in kilowatt-hours when the battery was new. Compared against current capacity to determine SOH.",
  voltage: "Nominal voltage of the pack in volts. Determines the electrical architecture and compatibility for second-life applications.",
  module_count: "Number of modules inside the battery pack. Modules are the mid-level packaging between cells and the full pack.",
  cell_count: "Total number of individual cells in the battery. More cells = more capacity but also more complex recycling.",
  service_history: "Maintenance and inspection records throughout the battery's life. Important for assessing actual usage conditions.",
  qr_code: "QR code linking to the digital passport record. When scanned, it opens the full passport data including health, materials, and compliance status. Required by EU Regulation 2023/1542.",
  completeness: "Percentage of required data fields that are filled in. EU regulation requires 100% completeness for compliant passports. Missing: SOH data, supply chain info, carbon verification.",
  identity_section: "Core identification data linking this passport to a specific battery, vehicle, and manufacturer. Forms the 'identity' layer of the EU digital battery passport.",
  technical_section: "Engineering specifications: chemistry, capacity, voltage, cell/module count, total mass. Used for compatibility matching in second-life applications.",
  health_section: "AI-predicted State of Health (SOH), remaining useful life (RUL), safety grade, and recommended end-of-life pathway. Updated each time the battery is assessed.",
  materials_section: "Bill of materials showing mass and estimated recovery value for each material. Critical for recycliclers to plan processing and for verifying recycled content targets.",
  sustainability_section: "Environmental metrics: embodied carbon (CO₂ from manufacturing), recycled content percentage, and material recovery potential. Benchmarked against EU 2031 targets.",
  eol_section: "End-of-life guidance: recommended pathway (second-life vs recycling), disassembly complexity, safety warnings, and estimated recovery value.",
  lifecycle_section: "Usage history: manufacturing date, service records, ownership changes, and total energy delivered over the battery's lifetime.",
  traceability_section: "Digital audit trail: QR code link, record URL, last update timestamp, and EU regulation compliance status. Ensures chain of custody.",
};

const PIE_COLORS = ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f97316'];

const SECTION_ICONS = {
  identity: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  technical: { icon: Cpu, color: 'text-violet-500', bg: 'bg-violet-50' },
  health: { icon: Battery, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  materials: { icon: FlaskConical, color: 'text-orange-500', bg: 'bg-orange-50' },
  sustainability: { icon: Leaf, color: 'text-green-500', bg: 'bg-green-50' },
  end_of_life: { icon: Recycle, color: 'text-teal-500', bg: 'bg-teal-50' },
  lifecycle: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  traceability: { icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-50' },
};

export default function MaterialPassport() {
  const [formData, setFormData] = useState({
    component_id: 'BAT-IND-2026-001',
    battery_id: 'BAT-NMC-75-001',
    vehicle_id: 'VEH-EV-2022-X100',
    manufacturer: 'EV Motors India',
    model: 'ElectraX 75',
    chemistry: 'NMC (Nickel Manganese Cobalt)',
    rated_capacity_kwh: 75.0,
    voltage: 400.0,
    module_count: 16,
    cell_count: 192,
    manufacturing_date: '2022-03-15',
    service_history: ['2023-06 Regular maintenance', '2024-01 Module inspection', '2025-08 End of first life assessment'],
  });
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const aiRef = useRef(null);

  const handleGenerate = async () => {
    setLoading(true);
    setAiText('');
    try {
      const res = await generatePassport(formData);
      setPassport(res);
      toast.success('Material Passport generated!');
      runAiAnalysis(res.passport_data);
    } catch (err) {
      toast.error('Generation failed: ' + (err.response?.data?.detail || err.message));
    }
    setLoading(false);
  };

  const runAiAnalysis = async (data) => {
    setAiLoading(true);
    setAiText('');
    try {
      await streamPassportAiAnalysis(data, (event) => {
        if (event.type === 'text') setAiText(prev => prev + event.content);
        if (event.type === 'done') setAiLoading(false);
      });
    } catch {
      setAiText('⚠ Could not reach AI agent. Ensure backend is running.');
      setAiLoading(false);
    }
    setAiLoading(false);
  };

  useEffect(() => {
    if (aiRef.current) aiRef.current.scrollTop = aiRef.current.scrollHeight;
  }, [aiText]);

  const materialsData = passport?.passport_data?.materials
    ? Object.entries(passport.passport_data.materials).map(([name, info], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        mass: info.mass_kg,
        value: info.estimated_value_usd,
        recyclable: info.recyclable,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
    : [];

  const sustainability = passport?.passport_data?.sustainability || {};
  const completeness = passport?.completeness_score || 0;
  const health = passport?.passport_data?.health || {};

  const complianceData = [
    { metric: 'Identity', score: passport ? 95 : 0 },
    { metric: 'Technical', score: passport ? 90 : 0 },
    { metric: 'Health', score: health.predicted_soh ? 85 : 30 },
    { metric: 'Materials', score: passport ? 80 : 0 },
    { metric: 'Sustainability', score: passport ? 70 : 0 },
    { metric: 'Traceability', score: passport ? 60 : 0 },
  ];

  return (
    <div className="h-screen overflow-y-auto bg-[#f5f0e8] p-6" style={{ fontFamily: "'Georgia', serif" }}>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
          </div>
          AI Material Passport Generator
          <InfoIcon tooltip="Creates a digital battery passport compliant with EU Battery Regulation 2023/1542. Contains full material composition, health data, carbon footprint, and end-of-life guidance. Think of it as a 'birth certificate + health record + recycling manual' for the battery." />
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-11">EU Battery Regulation 2023/1542 compliant · QR-linked digital record · AI-powered compliance analysis</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* ═══ Left: Input Form (4 cols) ═══ */}
        <div className="col-span-4 space-y-3">
          <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-violet-500" />Component Information
              <InfoIcon tooltip="Enter the battery's identification and technical details. These form the core of the EU digital passport. Pre-filled with sample data — edit to match your battery." />
            </h3>

            <div className="space-y-2">
              {['component_id', 'battery_id', 'vehicle_id', 'manufacturer', 'model'].map(key => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                    {key.replace(/_/g, ' ')}
                    <InfoIcon tooltip={FIELD_INFO[key]} />
                  </label>
                  <input type="text" value={formData[key]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none" />
                </div>
              ))}

              <div>
                <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                  chemistry<InfoIcon tooltip={FIELD_INFO.chemistry} />
                </label>
                <select value={formData.chemistry}
                  onChange={e => setFormData({ ...formData, chemistry: e.target.value })}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none">
                  {['NMC (Nickel Manganese Cobalt)', 'NCA (Nickel Cobalt Aluminum)', 'LFP (Lithium Iron Phosphate)', 'NMC811', 'NMC622', 'LMO (Lithium Manganese Oxide)'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                  manufacturing date<InfoIcon tooltip={FIELD_INFO.manufacturing_date} />
                </label>
                <input type="date" value={formData.manufacturing_date}
                  onChange={e => setFormData({ ...formData, manufacturing_date: e.target.value })}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'rated_capacity_kwh', label: 'capacity (kWh)' },
                  { key: 'voltage', label: 'voltage (V)' },
                  { key: 'module_count', label: 'modules' },
                  { key: 'cell_count', label: 'cells' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                      {label}<InfoIcon tooltip={FIELD_INFO[key]} />
                    </label>
                    <input type="number" value={formData[key]}
                      onChange={e => setFormData({ ...formData, [key]: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none" />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                  service history<InfoIcon tooltip={FIELD_INFO.service_history} />
                </label>
                <div className="space-y-1">
                  {formData.service_history.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-[9px] text-emerald-600">●</span>
                      <span className="text-[10px] text-gray-600 flex-1">{entry}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={loading}
              className="mt-4 w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><FileText className="w-4 h-4" />Generate Material Passport</>}
            </button>
          </div>
        </div>

        {/* ═══ Middle: Passport Display (5 cols) ═══ */}
        <div className="col-span-5 space-y-3">
          {passport ? (
            <>
              {/* QR + Completeness + EU Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9] text-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center justify-center">
                    QR Code<InfoIcon tooltip={FIELD_INFO.qr_code} />
                  </h4>
                  <img src={passport.qr_code_url} alt="QR" className="w-24 h-24 mx-auto bg-white p-1.5 rounded-lg shadow-sm" />
                  <p className="text-[9px] text-gray-400 mt-1.5">Scan for digital record</p>
                </div>

                <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9] text-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center justify-center">
                    Completeness<InfoIcon tooltip={FIELD_INFO.completeness} />
                  </h4>
                  <div className="relative w-20 h-20 mx-auto">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                        stroke={completeness >= 80 ? '#10b981' : completeness >= 60 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${completeness}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-800">{completeness}%</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${completeness >= 80 ? 'bg-emerald-50 text-emerald-600' : completeness >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                    {completeness >= 80 ? 'Good' : completeness >= 60 ? 'Partial' : 'Incomplete'}
                  </span>
                </div>

                <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9] text-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center justify-center">
                    EU Status<InfoIcon tooltip="Compliance status against EU Battery Regulation 2023/1542. Full compliance required by Feb 2027 for all EV batteries >2 kWh sold in the EU." />
                  </h4>
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-1">
                    <Shield className={`w-7 h-7 ${completeness >= 80 ? 'text-emerald-500' : 'text-amber-500'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${completeness >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {completeness >= 80 ? 'COMPLIANT' : 'PARTIAL'}
                  </span>
                  <p className="text-[8px] text-gray-400 mt-0.5">EU Reg 2023/1542</p>
                </div>
              </div>

              {/* Material Charts */}
              {materialsData.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">
                      <Scale className="w-3 h-3 mr-1 text-orange-500" />Material Mass
                      <InfoIcon tooltip="Weight distribution of all materials in the battery pack. Graphite (anode) and aluminum (casing) are heaviest, but cobalt and nickel are most valuable. Recyclable materials shown in color, non-recyclable in gray." />
                    </h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={materialsData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="mass" strokeWidth={2} stroke="#f5f0e8">
                          {materialsData.map((d, i) => <Cell key={i} fill={d.recyclable ? d.color : '#9ca3af'} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} formatter={(v) => `${v} kg`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">
                      <DollarSign className="w-3 h-3 mr-1 text-green-500" />Recovery Value
                      <InfoIcon tooltip="Estimated dollar value of each recoverable material based on current commodity prices. Cobalt ($33/kg) and nickel ($16.5/kg) are most valuable per kg, but copper and lithium also contribute significantly." />
                    </h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={materialsData.filter(m => m.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 8 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} width={55} />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} formatter={(v) => `$${v.toFixed(0)}`} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                          {materialsData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Sustainability Cards */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Carbon Footprint', value: `${(sustainability.embodied_carbon_kgco2e || 0).toLocaleString()} kg`, sub: `${((sustainability.embodied_carbon_kgco2e || 0) / (formData.rated_capacity_kwh || 1)).toFixed(0)} kg/kWh`, icon: Leaf, color: 'text-green-600', info: "Total CO₂ emissions from manufacturing this battery. EU target: <65 kgCO2e/kWh by 2028. Lower is better." },
                  { label: 'Recovery Rate', value: `${sustainability.recovery_score_pct || 0}%`, sub: `${sustainability.recyclable_mass_kg || 0} kg`, icon: Recycle, color: 'text-teal-600', info: "Percentage of total battery mass that can be recovered through recycling. EU minimum: 65% by 2025, 70% by 2030." },
                  { label: 'Material Value', value: `$${(sustainability.total_material_value_usd || 0).toLocaleString()}`, sub: 'at current prices', icon: DollarSign, color: 'text-amber-600', info: "Total estimated value of recoverable materials based on current commodity market prices. This is the 'urban mining' potential." },
                  { label: 'Recycled Content', value: `${sustainability.recycled_content_pct || 0}%`, sub: 'vs 16% target', icon: Target, color: 'text-violet-600', info: "Percentage of materials sourced from recycled feedstock. EU 2031 targets: 16% cobalt, 6% lithium, 6% nickel from recycled sources." },
                ].map((card, i) => (
                  <div key={i} className="bg-white/60 rounded-lg p-2.5 border border-[#d4c5a9] text-center">
                    <card.icon className={`w-4 h-4 mx-auto mb-1 ${card.color}`} />
                    <p className="text-sm font-bold text-gray-800">{card.value}</p>
                    <p className="text-[9px] text-gray-500 flex items-center justify-center">{card.label}<InfoIcon tooltip={card.info} /></p>
                    <p className="text-[8px] text-gray-400">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Full Passport Sections */}
              <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-500" />Full Passport Data
                  <InfoIcon tooltip="Complete digital passport record organized by EU Battery Regulation sections. Click any section to expand/collapse. Each section maps to specific articles in EU Reg 2023/1542." />
                </h4>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {Object.entries(passport.passport_data)
                    .filter(([k]) => k !== 'completeness_score')
                    .map(([section, data]) => {
                      const sectionInfo = SECTION_ICONS[section] || { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' };
                      const SectionIcon = sectionInfo.icon;
                      const isOpen = activeSection === section;
                      return (
                        <div key={section} className="border border-gray-100 rounded-lg overflow-hidden">
                          <button onClick={() => setActiveSection(isOpen ? null : section)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/60 transition-colors text-left">
                            <div className={`w-6 h-6 rounded-md ${sectionInfo.bg} flex items-center justify-center`}>
                              <SectionIcon className={`w-3.5 h-3.5 ${sectionInfo.color}`} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 flex-1 capitalize">{section.replace(/_/g, ' ')}</span>
                            <InfoIcon tooltip={FIELD_INFO[`${section}_section`] || `${section} data section of the EU battery passport.`} />
                            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                          </button>
                          {isOpen && typeof data === 'object' && data !== null && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-3 pb-2">
                              <div className="grid grid-cols-1 gap-0.5 pl-8">
                                {Object.entries(data).map(([key, val]) => (
                                  <div key={key} className="flex justify-between text-[10px] py-0.5 border-b border-gray-50">
                                    <span className="text-gray-500">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-gray-800 text-right max-w-[55%] truncate font-medium">
                                      {Array.isArray(val) ? (val.length > 0 ? val.join(', ') : '—') : typeof val === 'object' && val !== null ? JSON.stringify(val).slice(0, 60) : val !== null ? String(val) : '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/60 rounded-xl p-10 border border-[#d4c5a9] text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                <QrCode className="w-10 h-10 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Generate Your Battery Passport</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed mb-4">
                Fill in the component details on the left and click "Generate" to create an EU Battery Regulation 2023/1542 compliant digital passport with QR code, material composition, and AI-powered compliance analysis.
              </p>
              <div className="flex items-center justify-center gap-6 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-blue-400" />EU Compliant</span>
                <span className="flex items-center gap-1"><QrCode className="w-3.5 h-3.5 text-violet-400" />QR-Linked</span>
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-emerald-400" />AI Analysis</span>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Right: AI Analysis + Compliance (3 cols) ═══ */}
        <div className="col-span-3 space-y-3">
          {passport && (
            <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center">
                <Shield className="w-3 h-3 mr-1 text-blue-500" />EU Compliance Radar
                <InfoIcon tooltip="How well each section of your passport meets EU Regulation 2023/1542 requirements. 100% = fully compliant. Areas below 70% need attention before the Feb 2027 enforcement date." />
              </h4>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={complianceData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 7 }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f130" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {passport && health.grade && (
            <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">
                <Battery className="w-3 h-3 mr-1 text-emerald-500" />Health Assessment
                <InfoIcon tooltip="AI-predicted battery health data linked from the SOH Predictor. If no prediction exists for this component ID, this section shows 'Not assessed' — run a prediction first on the SOH Predictor page." />
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-emerald-700">{health.predicted_soh || '—'}%</p>
                  <p className="text-[9px] text-emerald-600">SOH</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{health.grade || '—'}</p>
                  <p className="text-[9px] text-blue-600">Grade</p>
                </div>
              </div>
              {health.recommendation && (
                <p className="text-[10px] text-gray-600 mt-2 bg-gray-50 rounded-lg px-2 py-1.5">
                  <span className="font-semibold text-gray-700">Recommendation:</span> {health.recommendation}
                </p>
              )}
              {health.risk_flags?.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {health.risk_flags.map((flag, i) => (
                    <div key={i} className="flex items-center gap-1 text-[9px] text-amber-700 bg-amber-50 rounded px-2 py-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />{flag}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Deep Analysis */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-700 text-white flex flex-col">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />AI Compliance Analysis
              <InfoIcon tooltip="LLM-powered deep analysis of your passport against EU Battery Regulation requirements. Identifies gaps, recommends improvements, assesses material recovery value, and benchmarks environmental impact." />
            </h4>
            <div ref={aiRef} className="flex-1 min-h-[180px] max-h-[300px] overflow-y-auto bg-black/20 rounded-lg p-2.5 text-[10px] leading-relaxed text-gray-300 whitespace-pre-wrap">
              {aiText ? (
                <div>
                  {aiText.split('**').map((part, i) =>
                    i % 2 === 1 ? <strong key={i} className="text-emerald-400">{part}</strong> : <span key={i}>{part}</span>
                  )}
                  {aiLoading && <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse ml-0.5" />}
                </div>
              ) : passport ? (
                <div className="text-gray-500 text-center mt-6">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-500" />
                  <p className="text-[10px]">Analyzing passport compliance...</p>
                </div>
              ) : (
                <div className="text-gray-500 italic text-center mt-8">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-emerald-500/40" />
                  <p className="text-[10px]">Generate a passport to get AI compliance analysis</p>
                </div>
              )}
            </div>
            {passport && (
              <button onClick={() => runAiAnalysis(passport.passport_data)} disabled={aiLoading}
                className="mt-2 w-full py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Re-analyze Passport
              </button>
            )}
          </div>

          {/* EU Timeline */}
          <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">
              <Globe className="w-3 h-3 mr-1 text-blue-500" />EU Regulation Timeline
              <InfoIcon tooltip="Key milestones of EU Battery Regulation 2023/1542. This regulation mandates digital battery passports, recycled content minimums, carbon footprint declarations, and material recovery targets." />
            </h4>
            <div className="space-y-1.5">
              {[
                { date: 'Aug 2024', event: 'Carbon footprint declaration', status: 'active' },
                { date: 'Feb 2025', event: 'Due diligence requirements', status: 'active' },
                { date: 'Feb 2027', event: 'Digital battery passport mandatory', status: 'upcoming' },
                { date: 'Dec 2027', event: 'Carbon footprint thresholds', status: 'future' },
                { date: 'Aug 2031', event: 'Recycled content minimums', status: 'future' },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.status === 'active' ? 'bg-emerald-500' : m.status === 'upcoming' ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-[9px] text-gray-400 w-16">{m.date}</span>
                  <span className={`text-[10px] flex-1 ${m.status === 'active' ? 'text-emerald-700 font-medium' : m.status === 'upcoming' ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>{m.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
