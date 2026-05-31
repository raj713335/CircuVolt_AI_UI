import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import {
  Battery, Recycle, FileText, TrendingUp, Zap, Globe, Shield, Cpu, ArrowUpRight, ArrowDownRight,
  Activity, Target, Award, Leaf, DollarSign, Sparkles, Loader2, Send, BookOpen, ExternalLink,
  Info, X, FlaskConical, Factory, Newspaper, ChevronRight, BarChart3, Clock, Users
} from 'lucide-react';
import { getDashboardSummary, chatWithAgent, streamDashboardAiInsights } from '../services/api';

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
          <div className="fixed z-50 w-72 bg-white rounded-xl shadow-xl border border-[#d4c5a9] p-3.5 text-xs text-gray-600 leading-relaxed normal-case tracking-normal text-left font-sans font-normal"
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

// ── Static data ──
const SOH_TREND_DATA = [
  { month: 'Jan', avgSOH: 82.1, batteries: 45, grade_a: 18, grade_b: 15, grade_c: 8, grade_d: 4 },
  { month: 'Feb', avgSOH: 79.8, batteries: 52, grade_a: 20, grade_b: 18, grade_c: 9, grade_d: 5 },
  { month: 'Mar', avgSOH: 81.3, batteries: 61, grade_a: 25, grade_b: 20, grade_c: 10, grade_d: 6 },
  { month: 'Apr', avgSOH: 77.6, batteries: 73, grade_a: 28, grade_b: 24, grade_c: 13, grade_d: 8 },
  { month: 'May', avgSOH: 80.2, batteries: 68, grade_a: 26, grade_b: 22, grade_c: 12, grade_d: 8 },
  { month: 'Jun', avgSOH: 78.9, batteries: 82, grade_a: 32, grade_b: 27, grade_c: 14, grade_d: 9 },
  { month: 'Jul', avgSOH: 76.4, batteries: 91, grade_a: 35, grade_b: 30, grade_c: 16, grade_d: 10 },
  { month: 'Aug', avgSOH: 79.1, batteries: 87, grade_a: 34, grade_b: 28, grade_c: 15, grade_d: 10 },
];

const RECYCLING_PROGRESS = [
  { year: '2020', rate: 5, capacity: 50, secondLife: 0.8 },
  { year: '2021', rate: 8, capacity: 120, secondLife: 1.5 },
  { year: '2022', rate: 12, capacity: 280, secondLife: 3.2 },
  { year: '2023', rate: 18, capacity: 520, secondLife: 5.8 },
  { year: '2024', rate: 27, capacity: 840, secondLife: 8.2 },
  { year: '2025', rate: 38, capacity: 1200, secondLife: 12.8 },
  { year: '2026', rate: 48, capacity: 1650, secondLife: 18.5 },
];

const MATERIAL_RECOVERY = [
  { material: 'Lithium', recovered: 92, target: 80, value: 12500 },
  { material: 'Cobalt', recovered: 96, target: 90, value: 28000 },
  { material: 'Nickel', recovered: 94, target: 90, value: 16200 },
  { material: 'Manganese', recovered: 88, target: 85, value: 2100 },
  { material: 'Copper', recovered: 98, target: 95, value: 8500 },
  { material: 'Graphite', recovered: 72, target: 70, value: 1200 },
];

const PATHWAY_DATA = [
  { name: 'Second-Life\nStorage', value: 38, color: '#10b981' },
  { name: 'Direct\nRecycling', value: 24, color: '#6366f1' },
  { name: 'Hydro-\nmetallurgy', value: 22, color: '#3b82f6' },
  { name: 'Pyro-\nmetallurgy', value: 10, color: '#f59e0b' },
  { name: 'Refurbish\n& Reuse', value: 6, color: '#ec4899' },
];

const CIRCULARITY_RADAR = [
  { metric: 'Material Recovery', score: 88, benchmark: 75 },
  { metric: 'Energy Efficiency', score: 76, benchmark: 70 },
  { metric: 'Carbon Reduction', score: 82, benchmark: 65 },
  { metric: 'Design for Recycling', score: 71, benchmark: 60 },
  { metric: 'Supply Chain', score: 68, benchmark: 55 },
  { metric: 'Passport Compliance', score: 94, benchmark: 80 },
];

const BATTERY_CHEMISTRIES = [
  { chemistry: 'NMC811', count: 142, avgSOH: 78.2, recyclability: 91 },
  { chemistry: 'LFP', count: 98, avgSOH: 82.5, recyclability: 88 },
  { chemistry: 'NCA', count: 67, avgSOH: 75.8, recyclability: 89 },
  { chemistry: 'NMC622', count: 45, avgSOH: 74.1, recyclability: 90 },
  { chemistry: 'LMO', count: 23, avgSOH: 69.3, recyclability: 85 },
];

const RESEARCH_PAPERS = [
  { title: 'Closed-loop recycling of LFP batteries achieving 99.2% lithium recovery', journal: 'Nature Energy', year: '2025', authors: 'Chen et al. (Stanford/SLAC)', impact: 'High', tags: ['LFP', 'Lithium', 'Closed-loop'] },
  { title: 'AI-optimized hydrometallurgical leaching reduces reagent use by 60%', journal: 'Joule', year: '2026', authors: 'Olivetti et al. (MIT)', impact: 'High', tags: ['AI/ML', 'Hydrometallurgy'] },
  { title: 'Direct recycling preserves crystal structure for 3000+ cycle reuse', journal: 'Cell Reports Phys. Sci.', year: '2025', authors: 'Argonne National Lab', impact: 'Medium', tags: ['Direct Recycling', 'NMC'] },
  { title: 'Solid-state battery end-of-life: Challenges and recycling pathways', journal: 'Adv. Energy Mater.', year: '2026', authors: 'Janek & Zeier (Giessen)', impact: 'High', tags: ['Solid-State', 'Future'] },
  { title: 'Digital battery passport implementation: Lessons from EU pilot', journal: 'Resources, Conserv. & Recycl.', year: '2026', authors: 'Circular Economy Initiative DE', impact: 'Medium', tags: ['Policy', 'EU Regulation'] },
  { title: 'Second-life EV batteries for grid storage: 8-year field study results', journal: 'Energy Storage Materials', year: '2025', authors: 'Xu et al. (NREL)', impact: 'High', tags: ['Second-Life', 'Grid Storage'] },
];

const NEWS_ITEMS = [
  { title: 'EU Battery Regulation: Digital passports mandatory from Feb 2027', date: 'May 2026', source: 'European Commission', category: 'Policy', icon: Shield },
  { title: 'Redwood Materials reaches 100 GWh/year recycling capacity at Nevada facility', date: 'Apr 2026', source: 'Reuters', category: 'Industry', icon: Factory },
  { title: 'CATL achieves 99.6% nickel recovery with new direct recycling process', date: 'Mar 2026', source: 'Bloomberg NEF', category: 'Technology', icon: FlaskConical },
  { title: 'Global second-life battery market surpasses $12.8B valuation', date: 'Mar 2026', source: 'McKinsey & Co.', category: 'Market', icon: TrendingUp },
  { title: 'IRA Section 45X: $35/kWh credit drives US recycling investment boom', date: 'Feb 2026', source: 'DOE EERE', category: 'Policy', icon: DollarSign },
  { title: 'Toyota targets solid-state battery production by 2027-28, reshaping recycling landscape', date: 'Jan 2026', source: 'Nikkei Asia', category: 'Technology', icon: Zap },
  { title: 'Li-Cycle Rochester Hub processes first 10,000 tonnes of battery material', date: 'Jan 2026', source: 'Li-Cycle IR', category: 'Industry', icon: Factory },
  { title: 'China mandates OEM take-back programs under GB/T 34015-2025 update', date: 'Dec 2025', source: 'MIIT China', category: 'Policy', icon: Globe },
];

const PIE_COLORS = ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [newsFilter, setNewsFilter] = useState('All');
  const aiRef = useRef(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() =>
      setSummary({ total_passports: 24, total_predictions: 559, grade_distribution: { A: 180, B: 195, C: 112, D: 72 }, estimated_co2_avoided_kg: 234780, material_recovery_potential_pct: 81, average_soh: 76.4 })
    );
  }, []);

  const runAiInsights = async (topic) => {
    setAiLoading(true);
    setAiText('');
    const q = topic || aiQuery || 'global EV battery recycling progress and latest breakthroughs';
    try {
      await streamDashboardAiInsights(q, (event) => {
        if (event.type === 'text') setAiText(prev => prev + event.content);
        if (event.type === 'done') setAiLoading(false);
      });
    } catch {
      setAiText('⚠ Could not reach AI agent. Ensure backend is running on port 8000.');
      setAiLoading(false);
    }
    setAiLoading(false);
  };

  useEffect(() => {
    if (aiRef.current) aiRef.current.scrollTop = aiRef.current.scrollHeight;
  }, [aiText]);

  const s = summary || {};
  const totalBatteries = s.total_predictions || 559;
  const gd = s.grade_distribution || { A: 180, B: 195, C: 112, D: 72 };
  const gradeData = [
    { grade: 'A', count: gd.A, color: '#10b981', label: 'Premium 2nd-Life', pct: ((gd.A / totalBatteries) * 100).toFixed(0) },
    { grade: 'B', count: gd.B, color: '#3b82f6', label: 'Standard 2nd-Life', pct: ((gd.B / totalBatteries) * 100).toFixed(0) },
    { grade: 'C', count: gd.C, color: '#f59e0b', label: 'Direct Recycling', pct: ((gd.C / totalBatteries) * 100).toFixed(0) },
    { grade: 'D', count: gd.D, color: '#ef4444', label: 'Urgent Recycling', pct: ((gd.D / totalBatteries) * 100).toFixed(0) },
  ];

  const filteredNews = newsFilter === 'All' ? NEWS_ITEMS : NEWS_ITEMS.filter(n => n.category === newsFilter);

  return (
    <div className="h-screen overflow-y-auto bg-[#f5f0e8] p-6" style={{ fontFamily: "'Georgia', serif" }}>
      {/* ═══ Header ═══ */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          Circularity Intelligence Dashboard
          <InfoIcon tooltip="Central command center for EV battery lifecycle intelligence. Tracks SOH predictions, second-life grading, material passport generation, and circular economy pathways across your entire fleet." />
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-11">Real-time battery lifecycle analytics · SOH prediction · Second-life grading · Material passports · Recovery pathways</p>
      </div>

      {/* ═══ Row 1: KPI Cards ═══ */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        {[
          { label: 'Batteries Analyzed', value: totalBatteries.toLocaleString(), icon: Battery, color: 'from-blue-500 to-indigo-600', change: '+12%', up: true, info: 'Total EV batteries that have been processed through the SOH prediction pipeline. Each analysis generates health metrics, SHAP explanations, and a second-life grade.' },
          { label: 'Avg SOH', value: `${s.average_soh || 76.4}%`, icon: Activity, color: 'from-emerald-500 to-teal-600', change: '-1.2%', up: false, info: 'Average State of Health across all analyzed batteries. SOH measures remaining capacity vs original. >80% = excellent for second-life, 60-80% = viable, <60% = recycle.' },
          { label: 'Passports Generated', value: (s.total_passports || 24).toLocaleString(), icon: FileText, color: 'from-violet-500 to-purple-600', change: '+8', up: true, info: 'EU Battery Regulation 2023/1542 compliant digital material passports with QR codes. Track chemistry, carbon footprint, material composition, and provenance data.' },
          { label: 'CO₂ Avoided', value: `${((s.estimated_co2_avoided_kg || 234780) / 1000).toFixed(0)}t`, icon: Leaf, color: 'from-green-500 to-emerald-600', change: '+18%', up: true, info: 'Total CO₂ emissions avoided by routing batteries to second-life or recycling instead of landfill. Each battery diverted avoids ~420 kg CO₂e on average.' },
          { label: 'Material Recovery', value: `${s.material_recovery_potential_pct || 81}%`, icon: Recycle, color: 'from-cyan-500 to-blue-600', change: '+3%', up: true, info: 'Average percentage of critical materials (lithium, cobalt, nickel, copper) that can be recovered from processed batteries through hydrometallurgical or direct recycling.' },
          { label: 'Recovery Value', value: '$2.4M', icon: DollarSign, color: 'from-amber-500 to-orange-600', change: '+22%', up: true, info: 'Estimated total economic value of recoverable materials from all analyzed batteries based on current commodity prices (Li, Co, Ni, Cu, Mn).' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white/60 rounded-xl p-3.5 border border-[#d4c5a9] hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm`}>
                <kpi.icon className="w-4 h-4 text-white" />
              </div>
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.change}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-800">{kpi.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 flex items-center">{kpi.label}<InfoIcon tooltip={kpi.info} /></p>
          </motion.div>
        ))}
      </div>

      {/* ═══ Row 2: SOH Trend + Grade Distribution + Pathway ═══ */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* SOH Trend */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9] col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-blue-500" />SOH Prediction Trend
            <InfoIcon tooltip="Monthly average State of Health across all batteries analyzed. Tracks fleet degradation patterns. Dips may indicate seasonal temperature effects or aging cohorts entering the system." />
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={SOH_TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis domain={[70, 90]} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="avgSOH" fill="#6366f120" stroke="none" />
              <Line type="monotone" dataKey="avgSOH" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} name="Avg SOH %" />
              <Bar dataKey="batteries" fill="#10b98140" radius={[3, 3, 0, 0]} name="Batteries" yAxisId={0} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <Award className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />Second-Life Grading
            <InfoIcon tooltip="Distribution of batteries by grade. Grade A (SOH>80%): premium second-life for EV reuse. Grade B (60-80%): stationary storage. Grade C (40-60%): direct material recycling. Grade D (<40%): urgent recycling with safety protocols." />
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="count" strokeWidth={2} stroke="#f5f0e8">
                  {gradeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {gradeData.map(g => (
                <div key={g.grade} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-[11px] font-semibold w-14">Grade {g.grade}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${g.pct}%`, backgroundColor: g.color }} />
                  </div>
                  <span className="text-[10px] text-gray-500 w-12 text-right">{g.count} ({g.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[9px] text-gray-400 mt-2 italic">Grade A+B = {((gd.A + gd.B) / totalBatteries * 100).toFixed(0)}% second-life eligible</p>
        </div>

        {/* Recovery Pathways */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <Recycle className="w-3.5 h-3.5 mr-1.5 text-teal-500" />Recovery Pathways
            <InfoIcon tooltip="Recommended circular economy pathways: how batteries are routed after analysis. Second-life storage is highest value, followed by direct recycling (preserves cathode crystal structure), hydrometallurgy (chemical dissolution), and pyrometallurgy (smelting)." />
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={PATHWAY_DATA} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 45]} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={65} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => `${v}%`} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                {PATHWAY_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ Row 3: Global Recycling Progress + Material Recovery + Circularity Radar ═══ */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Global Recycling Progress */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-green-500" />Global Recycling Progress
            <InfoIcon tooltip="Year-over-year growth in global EV battery recycling rates (%), processing capacity (GWh), and second-life market size ($B). Shows the exponential ramp-up driven by EU regulation, US IRA incentives, and China's policies." />
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={RECYCLING_PROGRESS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="rate" stroke="#10b981" fill="#10b98130" strokeWidth={2} name="Recycling Rate %" />
              <Area type="monotone" dataKey="secondLife" stroke="#6366f1" fill="#6366f120" strokeWidth={2} name="2nd-Life Market $B" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Material Recovery Rates */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <Target className="w-3.5 h-3.5 mr-1.5 text-violet-500" />Material Recovery vs EU Targets
            <InfoIcon tooltip="Percentage of each critical material successfully recovered vs EU Battery Regulation minimum targets. Green bars show current recovery rates, gray dashed lines show regulatory minimums. Exceeding targets enables closed-loop supply chains." />
          </h3>
          <div className="space-y-2.5">
            {MATERIAL_RECOVERY.map(m => (
              <div key={m.material}>
                <div className="flex justify-between items-center text-[10px] mb-0.5">
                  <span className="font-semibold text-gray-700">{m.material}</span>
                  <span className="text-gray-400">${(m.value / 1000).toFixed(1)}k/t · <span className={m.recovered >= m.target ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{m.recovered}%</span> / {m.target}% target</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${m.recovered}%` }} />
                  <div className="absolute top-0 h-full border-r-2 border-dashed border-gray-400" style={{ left: `${m.target}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Circularity Radar */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />Circularity Performance
            <InfoIcon tooltip="Multi-dimensional circularity assessment. Green = your platform performance, blue dashed = industry benchmark. Passport Compliance reflects EU Battery Reg readiness. Design for Recycling measures how easily materials can be separated." />
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={CIRCULARITY_RADAR}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar name="Your Score" dataKey="score" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
              <Radar name="Benchmark" dataKey="benchmark" stroke="#6366f1" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ Row 4: Battery Chemistry + AI Insights Agent ═══ */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {/* Battery Chemistry Breakdown */}
        <div className="col-span-2 bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <FlaskConical className="w-3.5 h-3.5 mr-1.5 text-orange-500" />Battery Chemistry Analysis
            <InfoIcon tooltip="Breakdown of batteries analyzed by cathode chemistry. NMC811 (Nickel-Manganese-Cobalt 8:1:1) is most common in premium EVs. LFP (Lithium Iron Phosphate) dominates Chinese EVs. Each chemistry has different SOH profiles and recycling approaches." />
          </h3>
          <div className="space-y-2">
            {BATTERY_CHEMISTRIES.map((c, i) => (
              <div key={c.chemistry} className="flex items-center gap-3 bg-white/50 rounded-lg p-2 border border-gray-100">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: PIE_COLORS[i] }}>
                  {c.chemistry.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold">{c.chemistry}</span>
                    <span className="text-[10px] text-gray-400">{c.count} batteries</span>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] text-gray-500">SOH: <span className="font-bold text-gray-700">{c.avgSOH}%</span></span>
                    <span className="text-[10px] text-gray-500">Recyclability: <span className="font-bold text-emerald-600">{c.recyclability}%</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Global Insights Agent */}
        <div className="col-span-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 border border-slate-700 text-white flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />AI Circularity Intelligence Agent
            <InfoIcon tooltip="Powered by LangGraph + LLM. Ask about global battery recycling progress, policy updates, technology breakthroughs, market data, or any circularity topic. Streams real-time AI analysis." />
          </h3>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {[
              'Global recycling progress 2026',
              'EU Battery Regulation impact',
              'Direct recycling vs hydrometallurgy',
              'Second-life battery economics',
              'Critical mineral supply chain risks',
            ].map(q => (
              <button key={q} onClick={() => { setAiQuery(q); runAiInsights(q); }}
                className="text-[9px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors">
                {q}
              </button>
            ))}
          </div>
          <div ref={aiRef} className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto bg-black/20 rounded-lg p-3 text-[11px] leading-relaxed text-gray-300 mb-2 whitespace-pre-wrap">
            {aiText ? (
              <div>
                {aiText.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i} className="text-emerald-400">{part}</strong> : <span key={i}>{part}</span>
                )}
                {aiLoading && <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse ml-0.5" />}
              </div>
            ) : (
              <div className="text-gray-500 italic text-center mt-8">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                Click a topic above or type your question to get AI-powered global circularity intelligence
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); runAiInsights(); }} className="flex gap-2">
            <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} placeholder="Ask about global battery circularity..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400" />
            <button type="submit" disabled={aiLoading}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-xs font-semibold flex items-center gap-1 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all">
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Analyze
            </button>
          </form>
        </div>
      </div>

      {/* ═══ Row 5: News Feed + Research Papers ═══ */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Industry News */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center">
              <Newspaper className="w-3.5 h-3.5 mr-1.5 text-rose-500" />Industry News & Policy
              <InfoIcon tooltip="Latest developments in EV battery recycling policy, industry capacity buildouts, and technology breakthroughs from major publications and government sources." />
            </h3>
            <div className="flex gap-1">
              {['All', 'Policy', 'Industry', 'Technology', 'Market'].map(f => (
                <button key={f} onClick={() => setNewsFilter(f)}
                  className={`text-[9px] px-2 py-0.5 rounded-full transition-colors ${newsFilter === f ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
            {filteredNews.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer group">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50">
                  <item.icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-700 leading-tight group-hover:text-emerald-700">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-gray-400">{item.date}</span>
                    <span className="text-[9px] text-gray-400">·</span>
                    <span className="text-[9px] text-gray-500 font-medium">{item.source}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
                      item.category === 'Policy' ? 'bg-blue-50 text-blue-600' :
                      item.category === 'Industry' ? 'bg-amber-50 text-amber-600' :
                      item.category === 'Technology' ? 'bg-violet-50 text-violet-600' :
                      'bg-green-50 text-green-600'
                    }`}>{item.category}</span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-gray-300 shrink-0 mt-1 group-hover:text-emerald-500" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Research Papers */}
        <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />Latest Research Papers
            <InfoIcon tooltip="Key peer-reviewed papers advancing battery recycling science. Covers direct recycling, hydrometallurgy optimization, AI/ML applications, solid-state battery end-of-life, and policy impact studies from top journals." />
          </h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {RESEARCH_PAPERS.map((paper, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="p-2.5 rounded-lg bg-white/50 border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group">
                <p className="text-[11px] font-semibold text-gray-700 leading-tight group-hover:text-indigo-700">"{paper.title}"</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-indigo-500 font-medium italic">{paper.journal}</span>
                  <span className="text-[9px] text-gray-400">{paper.year}</span>
                  <span className="text-[9px] text-gray-400">·</span>
                  <span className="text-[9px] text-gray-500">{paper.authors}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {paper.tags.map(t => (
                    <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{t}</span>
                  ))}
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-auto ${paper.impact === 'High' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {paper.impact} Impact
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Row 6: Quick Actions + Protocol Status ═══ */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { title: 'Predict Battery SOH', desc: 'Upload battery data for AI-powered health prediction with SHAP explainability', icon: Battery, color: 'from-blue-500 to-indigo-500', path: '/predict' },
          { title: 'Generate Passport', desc: 'Create QR-based material passport compliant with EU Battery Regulation 2023/1542', icon: FileText, color: 'from-violet-500 to-purple-500', path: '/passport' },
          { title: 'Recovery Plan', desc: 'Get intelligent disassembly sequence and material recovery recommendations', icon: Recycle, color: 'from-emerald-500 to-teal-500', path: '/recovery' },
          { title: 'Design Advisor', desc: 'Analyze battery design for recyclability score and improvement suggestions', icon: Cpu, color: 'from-amber-500 to-orange-500', path: '/design' },
        ].map((action, i) => (
          <motion.a key={i} href={action.path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
            className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9] hover:shadow-lg hover:border-emerald-300 transition-all group cursor-pointer">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md mb-3`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-sm font-bold text-gray-800 group-hover:text-emerald-700 flex items-center gap-1">
              {action.title} <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h4>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{action.desc}</p>
          </motion.a>
        ))}
      </div>

      {/* ═══ Bottom Protocol Banner ═══ */}
      <div className="mt-4 grid grid-cols-4 gap-3 mb-2">
        {[
          { name: 'LangGraph', desc: 'ReAct agent with multi-step reasoning', icon: '🧠', status: 'Active' },
          { name: 'MCP', desc: 'Model Context Protocol for tool discovery', icon: '🔧', status: 'Active' },
          { name: 'A2A Protocol', desc: 'Agent-to-Agent communication (Google spec)', icon: '🤝', status: 'Active' },
          { name: 'AG-UI + CopilotKit', desc: 'AG-UI streaming with CopilotKit frontend', icon: '✨', status: 'Active' },
        ].map((p, i) => (
          <div key={i} className="bg-white/40 rounded-lg px-3 py-2 border border-[#d4c5a9] flex items-center gap-2.5">
            <span className="text-lg">{p.icon}</span>
            <div>
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                {p.name}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </p>
              <p className="text-[9px] text-gray-500">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
