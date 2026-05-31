import React, { useState, useRef } from 'react';
import { Recycle, Info, Bot, Loader2, CheckCircle, Sparkles, X, Shield, DollarSign, Leaf } from 'lucide-react';
import { recommendRecovery, streamRecoveryAiSummary } from '../services/api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

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
                el.style.top = `${Math.max(8, r.top - el.offsetHeight - 8)}px`;
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

export default function RecoveryOptimizer() {
  const [formData, setFormData] = useState({
    component_id: 'BAT-IND-2026-001',
    grade: 'B',
    soh: 76.4,
    chemistry: 'NMC',
    module_count: 16,
    cell_count: 192,
    rated_capacity_kwh: 75.0,
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
      toast.success('Recovery plan generated!');

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
          Disassembly & Recovery Optimizer
          <InfoIcon tooltip="This tool creates a step-by-step plan to safely take apart an EV battery and recover valuable materials. It calculates the economic value, environmental benefit, and safety requirements for each step." />
        </h2>
        <p className="text-gray-500">Intelligent disassembly sequence and material recovery recommendations</p>
      </div>

      {/* Input */}
      <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">Grade<InfoIcon tooltip={INFO.grade} /></label>
            <select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800">
              <option value="A">A - Reuse</option>
              <option value="B">B - Second Life</option>
              <option value="C">C - Refurbish</option>
              <option value="D">D - Recycle</option>
            </select>
          </div>
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">SOH %<InfoIcon tooltip={INFO.soh} /></label>
            <input type="number" value={formData.soh} onChange={e => setFormData({...formData, soh: parseFloat(e.target.value)})}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800" />
          </div>
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">Chemistry<InfoIcon tooltip={INFO.chemistry} /></label>
            <input type="text" value={formData.chemistry} onChange={e => setFormData({...formData, chemistry: e.target.value})}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800" />
          </div>
          <div>
            <label className="flex items-center text-xs text-gray-500 mb-1">Modules<InfoIcon tooltip={INFO.modules} /></label>
            <input type="number" value={formData.module_count} onChange={e => setFormData({...formData, module_count: parseInt(e.target.value)})}
              className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-3 py-2 text-sm text-gray-800" />
          </div>
        </div>
        <button onClick={handleRecommend} disabled={loading || aiLoading}
          className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 shadow-md">
          {loading ? 'Generating...' : aiLoading ? (
            <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 animate-pulse" /> AI Analyzing...</span>
          ) : (
            <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Generate & Analyze with AI</span>
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
              <div className="flex items-center text-xs text-gray-500 mb-1">Recovery Score<InfoIcon tooltip={INFO.recovery_score} /></div>
              <div className="text-2xl font-bold text-emerald-600">{result.recovery_score}/100</div>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${result.recovery_score >= 70 ? 'bg-emerald-500' : result.recovery_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${result.recovery_score}%` }} />
              </div>
            </div>
            <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
              <div className="flex items-center text-xs text-gray-500 mb-1">CO₂ Avoided<InfoIcon tooltip={INFO.co2_avoided} /></div>
              <div className="text-2xl font-bold text-teal-600">{result.carbon_impact?.total_carbon_avoided_kgco2e} kg</div>
            </div>
            <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
              <div className="flex items-center text-xs text-gray-500 mb-1">Net Value<InfoIcon tooltip={INFO.net_value} /></div>
              <div className="text-2xl font-bold text-blue-600">${result.economic_value?.net_value_usd}</div>
            </div>
            <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
              <div className="flex items-center text-xs text-gray-500 mb-1">Material Recovery<InfoIcon tooltip={INFO.material_recovery} /></div>
              <div className="text-2xl font-bold text-amber-600">{result.material_recovery?.summary?.overall_recovery_pct}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Disassembly Steps */}
            <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center">
                ✦ Disassembly Sequence<InfoIcon tooltip={INFO.disassembly} />
              </h3>
              <div className="space-y-3">
                {result.recovery_plan?.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs text-emerald-600 flex-shrink-0 font-semibold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{step.action}</p>
                      <p className="text-xs text-gray-500">{step.reason}</p>
                      <div className="flex gap-2 mt-1.5 items-center">
                        <span className="text-xs text-gray-400">{step.duration_min} min</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${safetyColor(step.safety_level)}`}>
                          {safetyLabel(step.safety_level)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Material Recovery Chart + Environmental */}
            <div className="space-y-4">
              <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center">
                  ✦ Material Recovery Breakdown<InfoIcon tooltip={INFO.material_chart} />
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={materialChartData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" paddingAngle={2}
                      label={({ name, value }) => `${name}: ${value}kg`} labelLine={false}>
                      {materialChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d4c5a9', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {result.carbon_impact && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex items-center text-xs text-gray-500 mb-1">Equivalent Trees/Year<InfoIcon tooltip={INFO.trees} /></div>
                    <p className="text-2xl font-bold text-emerald-600">{result.carbon_impact.equivalent_trees_year}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center text-xs text-gray-500 mb-1">Equivalent km Driving<InfoIcon tooltip={INFO.driving} /></div>
                    <p className="text-2xl font-bold text-blue-600">{result.carbon_impact.equivalent_km_driving?.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Summary Report - Streaming */}
          {(aiText || aiLoading) && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-purple-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-purple-200/60 bg-purple-50/50">
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <h4 className="text-sm font-semibold text-purple-800">AI Recovery Analysis Report</h4>
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
                    return <h5 key={i} className="font-bold text-gray-900 mt-4 mb-1.5 text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />{line.replace(/\*\*/g, '')}
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
        </div>
      )}
    </div>
  );
}
