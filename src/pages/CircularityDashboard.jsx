import React, { useState, useRef } from 'react';
import { Target, Info, Bot, Loader2, CheckCircle, Sparkles, X } from 'lucide-react';
import { calculateCircularity, streamCircularityAiSummary } from '../services/api';
import toast from 'react-hot-toast';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#8b5cf6'];

// ── Info tooltip descriptions for non-domain users ──
const INFO = {
  soh: "State of Health (SOH) measures how much capacity the battery still has compared to when it was new. 100% = brand new, 0% = completely degraded. Think of it like the 'fitness level' of the battery.",
  materials_recovered: "The percentage of raw materials (lithium, cobalt, nickel, copper, etc.) that can be extracted and reused from this battery when it reaches end-of-life. Higher = less mining needed.",
  carbon_avoided: "The amount of CO₂ emissions prevented by recycling/reusing this battery instead of manufacturing a new one from raw materials. Measured in kilograms of CO₂ equivalent.",
  grade: "A letter grade (A–D) indicating the best recovery pathway:\n• A = Reuse as-is (best)\n• B = Second-life application (e.g., home energy storage)\n• C = Refurbish components\n• D = Recycle for raw materials",
  second_life: "Whether this battery can be repurposed for a less demanding application (like home energy storage or grid backup) instead of being immediately recycled. Extends useful life by 5-10 years.",
  circularity_score: "An overall score (0–100) measuring how 'circular' this component is — meaning how well it keeps materials in use, extends product lifetime, avoids carbon emissions, and retains economic value. Higher = more sustainable.",
  material_circularity: "Measures how effectively materials are recovered and reused rather than wasted. Considers recovery rate, material purity, and whether recycled content is used. Max 30 points.",
  lifetime_extension: "Scores how much additional useful life the component gets through reuse or second-life applications. Longer use = fewer new batteries needed = less environmental impact. Max 25 points.",
  carbon_avoidance: "Measures the environmental benefit in terms of CO₂ emissions prevented through recycling and reuse compared to virgin material production. Max 25 points.",
  value_retention: "How much economic value is preserved through the recovery process. Higher-grade recovery (reuse > recycle) retains more value. Max 20 points.",
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
          <div className="fixed z-50 w-72 bg-white rounded-xl shadow-xl border border-[#d4c5a9] p-3.5 text-xs text-gray-600 leading-relaxed whitespace-pre-line"
            style={{ top: 'auto', left: 'auto' }}
            ref={el => {
              if (el) {
                const btn = el.parentElement.querySelector('button');
                const r = btn.getBoundingClientRect();
                el.style.top = `${r.top - el.offsetHeight - 8}px`;
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

const GaugeCard = ({ label, value, max = 100, color, infoKey }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="bg-white/60 rounded-xl p-5 border border-[#d4c5a9]">
      <div className="flex items-center text-xs text-gray-500 mb-2">
        {label}
        {infoKey && <InfoIcon tooltip={INFO[infoKey]} />}
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {value}<span className="text-sm text-gray-400">/{max}</span>
      </div>
      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

export default function CircularityDashboard() {
  const [formData, setFormData] = useState({
    component_id: 'BAT-IND-2026-001',
    soh: 76.4,
    grade: 'B',
    materials_recovered_pct: 80.0,
    carbon_avoided_kg: 750.0,
    second_life_potential: true,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // AI Summary streaming state
  const [aiText, setAiText] = useState('');
  const [aiSource, setAiSource] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const aiTextRef = useRef('');

  const handleCalculate = async () => {
    setLoading(true);
    setAiText('');
    setAiSource(null);
    setAiDone(false);
    aiTextRef.current = '';
    try {
      const res = await calculateCircularity(formData);
      setResult(res);
      toast.success(`Circularity Score: ${res.circularity_score}/100`);

      // Auto-stream AI summary
      setAiLoading(true);
      await streamCircularityAiSummary(formData, res, (event) => {
        if (event.type === 'meta') {
          setAiSource(event.source);
        } else if (event.type === 'text') {
          aiTextRef.current += event.content;
          setAiText(aiTextRef.current);
        } else if (event.type === 'done') {
          setAiDone(true);
          setAiLoading(false);
        }
      });
    } catch (err) {
      toast.error('Calculation failed: ' + (err.response?.data?.detail || err.message));
      setAiLoading(false);
    }
    setLoading(false);
  };

  const breakdownData = result?.breakdown?.breakdown
    ? Object.entries(result.breakdown.breakdown)
        .map(([name, info], i) => ({ name: name.replace(/_/g, ' '), value: info.score, max: info.max, fill: COLORS[i % COLORS.length] }))
    : [];

  const radarData = breakdownData.map(d => ({
    attribute: d.name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    score: Math.round((d.value / d.max) * 100),
    fullMark: 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
          Circularity Score Dashboard
          <InfoIcon tooltip={INFO.circularity_score} />
        </h2>
        <p className="text-gray-500">Comprehensive circularity assessment combining health, materials, and design metrics</p>
      </div>

      {/* Input */}
      <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
        <h3 className="text-sm font-medium text-gray-600 mb-4">Component Parameters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">
              SOH %<InfoIcon tooltip={INFO.soh} />
            </label>
            <input type="number" value={formData.soh}
              onChange={e => setFormData({ ...formData, soh: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:outline-none" />
          </div>
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">
              Materials Recovered %<InfoIcon tooltip={INFO.materials_recovered} />
            </label>
            <input type="number" value={formData.materials_recovered_pct}
              onChange={e => setFormData({ ...formData, materials_recovered_pct: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:outline-none" />
          </div>
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">
              Carbon Avoided (kg)<InfoIcon tooltip={INFO.carbon_avoided} />
            </label>
            <input type="number" value={formData.carbon_avoided_kg}
              onChange={e => setFormData({ ...formData, carbon_avoided_kg: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:outline-none" />
          </div>
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">
              Grade<InfoIcon tooltip={INFO.grade} />
            </label>
            <select value={formData.grade}
              onChange={e => setFormData({ ...formData, grade: e.target.value })}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800">
              <option value="A">A - Reuse</option>
              <option value="B">B - Second Life</option>
              <option value="C">C - Refurbish</option>
              <option value="D">D - Recycle</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.second_life_potential}
                onChange={e => setFormData({ ...formData, second_life_potential: e.target.checked })}
                className="w-4 h-4 rounded border-[#d4c5a9] bg-white text-emerald-500 focus:ring-emerald-400" />
              <span className="text-sm text-gray-700 flex items-center">
                Second-life potential<InfoIcon tooltip={INFO.second_life} />
              </span>
            </label>
          </div>
          <div className="flex items-end md:col-span-3">
            <button onClick={handleCalculate} disabled={loading || aiLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 shadow-md">
              {loading ? 'Calculating...' : aiLoading ? (
                <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 animate-pulse" /> AI Analyzing...</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Calculate & Analyze with AI</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Main Score + Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-1 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200 text-center flex flex-col items-center justify-center">
              <div className="text-6xl font-black text-emerald-600">{result.circularity_score}</div>
              <div className="text-sm text-gray-500 mt-1 flex items-center justify-center">
                Circularity Score<InfoIcon tooltip={INFO.circularity_score} />
              </div>
              <div className="text-xs text-gray-400 mt-1">/100</div>
              <div className="w-full mt-4">
                <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                  <span>Current</span><span>EU Target</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all duration-1000 ${
                    result.circularity_score >= 70 ? 'bg-emerald-500' : result.circularity_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${result.circularity_score}%` }} />
                  <div className="absolute top-0 h-full w-px bg-emerald-800" style={{ left: '75%' }} />
                </div>
              </div>
            </div>
            <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <GaugeCard label="Material Circularity" value={result.breakdown?.breakdown?.material_circularity?.score || 0} max={30} color="#22c55e" infoKey="material_circularity" />
              <GaugeCard label="Lifetime Extension" value={result.breakdown?.breakdown?.lifetime_extension?.score || 0} max={25} color="#3b82f6" infoKey="lifetime_extension" />
              <GaugeCard label="Carbon Avoidance" value={result.breakdown?.breakdown?.carbon_avoidance?.score || 0} max={25} color="#8b5cf6" infoKey="carbon_avoidance" />
              <GaugeCard label="Value Retention" value={result.breakdown?.breakdown?.value_retention?.score || 0} max={20} color="#f97316" infoKey="value_retention" />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breakdownData.length > 0 && (
              <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center">
                  ✦ Score Breakdown<InfoIcon tooltip="Visual breakdown showing how each category contributes to the overall circularity score. Larger slices = bigger contribution." />
                </h3>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={breakdownData} cx="50%" cy="50%" outerRadius={85} innerRadius={45} dataKey="value" paddingAngle={2}
                        label={({ value }) => `${value}`}>
                        {breakdownData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d4c5a9', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {breakdownData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="text-xs text-gray-600 capitalize">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {radarData.length > 0 && (
              <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center">
                  ✦ Performance Radar<InfoIcon tooltip="A radar view showing relative performance across all circularity dimensions. Points closer to the edge = better performance in that area. Identifies weaknesses at a glance." />
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#d4c5a9" />
                    <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 10, fill: '#666' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Summary Report - Streaming */}
          {(aiText || aiLoading) && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-purple-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-purple-200/60 bg-purple-50/50">
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <h4 className="text-sm font-semibold text-purple-800">AI Circularity Summary Report</h4>
                {aiSource && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ml-2 ${
                    aiSource === 'llm' ? 'bg-purple-200 text-purple-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {aiSource === 'llm' ? '✦ LLM' : '⚙ Rule Engine'}
                  </span>
                )}
                {aiLoading && <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin ml-auto" />}
                {aiDone && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
              </div>
              <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto">
                {aiText.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.includes('**')) {
                    const heading = line.replace(/\*\*/g, '');
                    return <h5 key={i} className="font-bold text-gray-900 mt-4 mb-1.5 text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />{heading}
                    </h5>;
                  }
                  if (line.startsWith('•')) {
                    return (
                      <div key={i} className="flex gap-2 items-start ml-2 my-1">
                        <span className="text-emerald-500 mt-0.5 text-xs font-bold">•</span>
                        <span className="text-gray-700 text-sm">{line.slice(2).replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                      </div>
                    );
                  }
                  if (line.startsWith('→')) {
                    return (
                      <div key={i} className="flex gap-2 items-start ml-2 my-1">
                        <span className="text-purple-500 mt-0.5">→</span>
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
      )}

      {!result && (
        <div className="bg-white/60 rounded-xl p-16 border border-[#d4c5a9] text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Enter component parameters and calculate the circularity score</p>
          <p className="text-xs text-gray-400 mt-2">AI agent will automatically generate a detailed summary report</p>
        </div>
      )}
    </div>
  );
}
