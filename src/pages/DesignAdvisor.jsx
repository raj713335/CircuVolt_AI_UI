import React, { useState, useRef, useEffect } from 'react';
import { Wrench, Lightbulb, AlertCircle, CheckCircle, Sparkles, Bot, Loader2, Shield, Zap, Target, TrendingUp, Info, X, Layers, Gauge, FlaskConical, Tag, Box, Scissors, AlertTriangle } from 'lucide-react';
import { getDesignSuggestions, streamDesignAiAnalysis } from '../services/api';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import toast from 'react-hot-toast';

// ── Info Icon ──
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

// ── Field tooltips ──
const TIPS = {
  page: "Evaluates how easy it is to recycle each EV component at end-of-life. A higher score means less waste, faster disassembly, and more material recovered. Based on EU Battery Regulation 2023/1542 design-for-recycling principles.",
  component_selector: "Pre-built component templates with realistic design parameters. Select one to auto-fill all fields, or customize manually. Each preset reflects typical EV manufacturing designs.",
  component_name: "The name of the component being analyzed. This appears in reports and is used to match against industry benchmarks for that component type.",
  fastener_count: "Total number of screws, bolts, clips, and rivets. Fewer = faster disassembly. Industry best practice: <20 fasteners per component. More than 50 significantly increases recycling labor cost.",
  adhesive_use: "How much glue or bonding agent is used. 'High' means permanent adhesives that prevent non-destructive separation — the #1 barrier to recyclability. Thermally-debondable adhesives score much better.",
  labeling_quality: "How well materials are labeled with ISO material codes (e.g., PP, ABS, Al). 'Poor' means no labels → recyclers can't sort materials → lower recovery rates and contaminated streams.",
  modularity: "Can the component be separated into sub-modules without destroying them? 'High' modularity = parts can be individually replaced or reused. 'Low' = monolithic design that must be shredded whole.",
  hazard_separation: "How easy it is to isolate hazardous materials (electrolyte, coolant, heavy metals) before recycling. 'Difficult' = safety risk to workers and potential environmental contamination.",
  material_mix: "List of materials used in the component. More diverse mixes are harder to recycle because each material needs different processing. Mono-material designs score highest.",
  score: "Overall recyclability rating from 0-100. Combines all design attributes into a single metric. 70+ = good (easy to recycle), 45-69 = needs improvement, <45 = poor (significant redesign needed).",
  target_score: "Industry benchmark recyclability score for this component type. The EU target for overall vehicle recyclability is 85%. Components should aim to meet or exceed their category target.",
  radar: "Spider chart showing how each design attribute contributes to the overall score. Attributes closer to the outer edge are better. Look for 'dents' — those are your weakest areas to improve first.",
  materials_pie: "Breakdown of materials by estimated proportion. More colors = more material diversity = harder to recycle. Ideal: 1-2 dominant materials that are easily separable.",
  severity: "How much each design issue hurts recyclability, from 0 (no problem) to 3 (critical blocker). Red bars are urgent — fix those first for the biggest score improvement.",
  ai_analysis: "LLM-powered deep analysis that goes beyond the rule engine. Considers EU regulations, industry trends, material science, and real-world recycling constraints to give actionable advice.",
  priority_actions: "Top 3 most impactful changes ranked by score improvement potential. These are quick wins — implementing just these could increase your recyclability score by 15-30 points.",
  suggestions: "Detailed improvement recommendations organized by category. Each includes the expected impact on recyclability score and practical implementation guidance.",
  eu_progress: "Visual comparison of your current score vs the EU target (85). The vertical line marks the target. Green = meeting/exceeding, amber = close but below, red = significant gap.",
};

// ── Component presets ──
const COMPONENT_PRESETS = {
  'EV Battery Pack': {
    fastener_count: 42, adhesive_use: 'High', material_mix: ['Lithium-ion', 'Aluminum', 'Copper', 'Plastics', 'Steel'],
    labeling_quality: 'Poor', modularity: 'Low', hazard_separation: 'Difficult',
    description: 'Main traction battery with NMC/LFP cells, BMS, and thermal management.',
  },
  'Electric Motor': {
    fastener_count: 18, adhesive_use: 'Low', material_mix: ['Copper', 'Neodymium', 'Steel', 'Aluminum'],
    labeling_quality: 'Fair', modularity: 'Medium', hazard_separation: 'Moderate',
    description: 'Permanent magnet synchronous motor with rare earth magnets.',
  },
  'Power Electronics': {
    fastener_count: 28, adhesive_use: 'Medium', material_mix: ['Silicon', 'Copper', 'PCB', 'Aluminum', 'Solder'],
    labeling_quality: 'Poor', modularity: 'Low', hazard_separation: 'Difficult',
    description: 'Inverter, DC-DC converter, and onboard charger assembly.',
  },
  'Chassis Frame': {
    fastener_count: 85, adhesive_use: 'Low', material_mix: ['High-Strength Steel', 'Aluminum'],
    labeling_quality: 'Good', modularity: 'High', hazard_separation: 'Easy',
    description: 'Structural body-in-white with crash structures and subframes.',
  },
  'Interior Cabin': {
    fastener_count: 120, adhesive_use: 'High', material_mix: ['Plastics', 'Fabric', 'Foam', 'Leather', 'Glass', 'PCB'],
    labeling_quality: 'Poor', modularity: 'Low', hazard_separation: 'Difficult',
    description: 'Dashboard, seats, trim panels, infotainment, and wiring harness.',
  },
  'Thermal System': {
    fastener_count: 22, adhesive_use: 'Medium', material_mix: ['Aluminum', 'Rubber', 'Refrigerant', 'Copper'],
    labeling_quality: 'Fair', modularity: 'Medium', hazard_separation: 'Moderate',
    description: 'Heat pump, coolant lines, radiator, and thermal interface materials.',
  },
  'Body Panels': {
    fastener_count: 55, adhesive_use: 'Medium', material_mix: ['Steel', 'Aluminum', 'Paint', 'Primer'],
    labeling_quality: 'Fair', modularity: 'High', hazard_separation: 'Easy',
    description: 'Doors, hood, fenders, roof, and trunk panels.',
  },
  'Wheels & Tires': {
    fastener_count: 20, adhesive_use: 'Low', material_mix: ['Rubber', 'Aluminum', 'Steel', 'Carbon Black'],
    labeling_quality: 'Good', modularity: 'High', hazard_separation: 'Easy',
    description: 'Alloy wheels, tires, TPMS sensors, and brake components.',
  },
  'Wiring Harness': {
    fastener_count: 60, adhesive_use: 'Medium', material_mix: ['Copper', 'PVC', 'Connectors', 'Tape'],
    labeling_quality: 'Poor', modularity: 'Low', hazard_separation: 'Difficult',
    description: 'Complete vehicle wiring harness with connectors and fuse boxes.',
  },
  'Exhaust / Catalytic Converter': {
    fastener_count: 12, adhesive_use: 'Low', material_mix: ['Stainless Steel', 'Platinum', 'Palladium', 'Rhodium', 'Ceramic'],
    labeling_quality: 'Good', modularity: 'High', hazard_separation: 'Moderate',
    description: 'Catalytic converter with PGM recovery potential. High-value recycling.',
  },
};

export default function DesignAdvisor() {
  const [selectedComponent, setSelectedComponent] = useState('');
  const [formData, setFormData] = useState({
    component_name: 'EV Battery Pack',
    fastener_count: 42,
    adhesive_use: 'High',
    material_mix: ['Aluminum', 'Plastic', 'Steel', 'Copper'],
    labeling_quality: 'Poor',
    modularity: 'Low',
    hazard_separation: 'Difficult',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [streamDone, setStreamDone] = useState(false);
  const aiTextRef = useRef('');
  const aiScrollRef = useRef(null);

  const handleSelectComponent = (name) => {
    const preset = COMPONENT_PRESETS[name];
    if (!preset) return;
    setSelectedComponent(name);
    setFormData({
      component_name: name,
      fastener_count: preset.fastener_count,
      adhesive_use: preset.adhesive_use,
      material_mix: preset.material_mix,
      labeling_quality: preset.labeling_quality,
      modularity: preset.modularity,
      hazard_separation: preset.hazard_separation,
    });
    setResult(null);
    setAiInsight('');
    setChartData(null);
    setStreamDone(false);
    toast.success(`Loaded: ${name}`);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setAiInsight('');
    setAiSource(null);
    setChartData(null);
    setStreamDone(false);
    aiTextRef.current = '';
    try {
      const res = await getDesignSuggestions(formData);
      setResult(res);
      toast.success(`Recyclability Score: ${res.recyclability_score}/100`);
      setAiLoading(true);
      await streamDesignAiAnalysis(formData, res, (event) => {
        if (event.type === 'meta') setAiSource(event.source);
        else if (event.type === 'chart') setChartData(event.chart_data);
        else if (event.type === 'text') { aiTextRef.current += event.content; setAiInsight(aiTextRef.current); }
        else if (event.type === 'done') { setStreamDone(true); setAiLoading(false); }
      });
    } catch (err) {
      toast.error('Analysis failed: ' + (err.response?.data?.detail || err.message));
      setAiLoading(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (aiScrollRef.current) aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
  }, [aiInsight]);

  const scoreColor = (s) => s >= 70 ? 'text-emerald-600' : s >= 45 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = (s) => s >= 70 ? 'bg-emerald-500' : s >= 45 ? 'bg-amber-500' : 'bg-red-500';
  const priorityColors = { high: 'border-red-200 bg-red-50', medium: 'border-amber-200 bg-amber-50', low: 'border-blue-200 bg-blue-50' };
  const priorityText = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-blue-600' };

  return (
    <div className="h-screen overflow-y-auto bg-[#f5f0e8] p-6" style={{ fontFamily: "'Georgia', serif" }}>
      {/* ═══ Header ═══ */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          Design for Recyclability Advisor
          <InfoIcon tooltip={TIPS.page} />
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-11">Select a component type and get AI-powered recyclability analysis with actionable redesign recommendations</p>
      </div>

      {/* ═══ Component Selector ═══ */}
      <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9] mb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
          <Layers className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />Select Component Type
          <InfoIcon tooltip={TIPS.component_selector} />
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(COMPONENT_PRESETS).map((name) => (
            <button key={name} onClick={() => handleSelectComponent(name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedComponent === name
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200'
                  : 'bg-white hover:bg-emerald-50 text-gray-700 border-[#d4c5a9] hover:border-emerald-400'
              }`}>
              {name}
            </button>
          ))}
        </div>
        {selectedComponent && COMPONENT_PRESETS[selectedComponent] && (
          <p className="mt-2.5 text-xs text-gray-500 italic border-t border-[#d4c5a9] pt-2.5">
            {COMPONENT_PRESETS[selectedComponent].description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* ═══ Left: Input Form (3 cols) ═══ */}
        <div className="col-span-3">
          <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center">
              <Gauge className="w-3.5 h-3.5 mr-1.5 text-violet-500" />Design Attributes
              <InfoIcon tooltip="These 7 parameters determine the recyclability score. Each is weighted differently — adhesive use and modularity have the highest impact. Adjust values to see how design changes affect the score." />
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                  component name<InfoIcon tooltip={TIPS.component_name} />
                </label>
                <input type="text" value={formData.component_name}
                  onChange={e => setFormData({ ...formData, component_name: e.target.value })}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none" />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                  fastener count<InfoIcon tooltip={TIPS.fastener_count} />
                </label>
                <input type="number" value={formData.fastener_count}
                  onChange={e => setFormData({ ...formData, fastener_count: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none" />
              </div>

              {[
                { key: 'adhesive_use', options: ['Low', 'Medium', 'High'] },
                { key: 'labeling_quality', options: ['Poor', 'Fair', 'Good', 'Excellent'] },
                { key: 'modularity', options: ['Low', 'Medium', 'High'] },
                { key: 'hazard_separation', options: ['Easy', 'Moderate', 'Difficult'] },
              ].map(({ key, options }) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                    {key.replace(/_/g, ' ')}<InfoIcon tooltip={TIPS[key]} />
                  </label>
                  <select value={formData[key]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none">
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}

              <div>
                <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
                  material mix (comma separated)<InfoIcon tooltip={TIPS.material_mix} />
                </label>
                <input type="text" value={formData.material_mix.join(', ')}
                  onChange={e => setFormData({ ...formData, material_mix: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full bg-white/70 border border-[#d4c5a9] rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:border-emerald-400 focus:outline-none" />
              </div>
            </div>

            <button onClick={handleAnalyze} disabled={loading || aiLoading}
              className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Scoring...</>
                : aiLoading ? <><Sparkles className="w-4 h-4 animate-pulse" />AI Analyzing...</>
                : <><Sparkles className="w-4 h-4" />Analyze with AI</>}
            </button>
          </div>
        </div>

        {/* ═══ Middle: Score + Charts + Suggestions (5 cols) ═══ */}
        <div className="col-span-5 space-y-3">
          {result ? (
            <>
              {/* Score Header */}
              <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-5xl font-bold ${scoreColor(result.recyclability_score)}`}>
                      {result.recyclability_score}
                    </div>
                    <div className="text-gray-500 mt-1 text-sm flex items-center">
                      Recyclability Score / 100
                      <InfoIcon tooltip={TIPS.score} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">{result.component_name}</div>
                    {chartData && (
                      <div className="text-xs text-gray-400 mt-1 flex items-center justify-end">
                        Target: <span className="text-emerald-600 font-semibold ml-1">{chartData.target_score}</span>/100
                        <InfoIcon tooltip={TIPS.target_score} />
                      </div>
                    )}
                    {aiSource && (
                      <span className={`inline-block mt-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        aiSource === 'llm' ? 'bg-purple-200 text-purple-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {aiSource === 'llm' ? '✦ LLM' : '⚙ Rule Engine'}
                      </span>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                {chartData && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Current</span>
                      <span className="flex items-center">EU Target (85)<InfoIcon tooltip={TIPS.eu_progress} /></span>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden relative">
                      <div className={`h-full rounded-full transition-all duration-1000 ${scoreBg(result.recyclability_score)}`}
                        style={{ width: `${result.recyclability_score}%` }} />
                      <div className="absolute top-0 h-full w-px bg-emerald-700" style={{ left: '85%' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Charts Row */}
              {chartData && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center">
                      <Target className="w-3 h-3 mr-1 text-emerald-500" />Design Attributes
                      <InfoIcon tooltip={TIPS.radar} />
                    </h4>
                    <ResponsiveContainer width="100%" height={170}>
                      <RadarChart data={chartData.radar} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="#d4c5a9" />
                        <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 8, fill: '#888' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center">
                      <FlaskConical className="w-3 h-3 mr-1 text-violet-500" />Material Composition
                      <InfoIcon tooltip={TIPS.materials_pie} />
                    </h4>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={chartData.materials} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          outerRadius={60} innerRadius={30} paddingAngle={2}
                          label={({ name }) => name.length > 8 ? name.slice(0, 7) + '…' : name} labelLine={false}>
                          {chartData.materials.map((_, i) => (
                            <Cell key={i} fill={['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'][i % 8]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Severity Bar */}
              {chartData?.categories?.length > 0 && (
                <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />Issue Severity by Category
                    <InfoIcon tooltip={TIPS.severity} />
                  </h4>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={chartData.categories} layout="vertical" margin={{ left: 70, right: 15, top: 5, bottom: 5 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} domain={[0, 'auto']} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fill: '#555' }} width={65} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      <Bar dataKey="severity" radius={[0, 4, 4, 0]} barSize={12}>
                        {chartData.categories.map((_, i) => (
                          <Cell key={i} fill={['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#8b5cf6', '#06b6d4'][i % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Priority Actions */}
              {result.priority_actions?.length > 0 && (
                <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9]">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5 flex items-center">
                    <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-500" />Priority Actions
                    <InfoIcon tooltip={TIPS.priority_actions} />
                  </h4>
                  <div className="space-y-1.5">
                    {result.priority_actions.map((action, i) => (
                      <div key={i} className="flex gap-2 items-start bg-amber-50/60 rounded-lg px-3 py-2 border border-amber-100">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Suggestions */}
              <div className="bg-white/60 rounded-xl p-4 border border-[#d4c5a9] max-h-64 overflow-y-auto">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5 flex items-center">
                  <Scissors className="w-3.5 h-3.5 mr-1.5 text-blue-500" />Detailed Suggestions
                  <InfoIcon tooltip={TIPS.suggestions} />
                </h4>
                <div className="space-y-2">
                  {result.suggestions?.map((s, i) => (
                    <div key={i} className={`rounded-lg p-3 border ${priorityColors[s.priority]}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-gray-600">{s.category}</span>
                        <span className={`text-[10px] font-bold ${priorityText[s.priority]}`}>{s.priority} priority</span>
                      </div>
                      <p className="text-xs text-gray-800 mb-0.5">{s.suggestion}</p>
                      <p className="text-[10px] text-gray-500">Impact: {s.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/60 rounded-xl p-12 border border-[#d4c5a9] text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                <Wrench className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Analyze Component Recyclability</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                Select a component type above, adjust design attributes, then click "Analyze with AI" to get a recyclability score, charts, and actionable improvement suggestions.
              </p>
              <div className="flex items-center justify-center gap-6 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5 text-emerald-400" />Score 0-100</span>
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-violet-400" />AI Analysis</span>
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-blue-400" />EU Benchmark</span>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Right: AI Agent Deep Analysis (4 cols) ═══ */}
        <div className="col-span-4 space-y-3">
          {/* AI Deep Analysis */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-700 text-white flex flex-col">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />AI Agent Deep Analysis
              <InfoIcon tooltip={TIPS.ai_analysis} />
              {aiLoading && <Loader2 className="w-3 h-3 text-emerald-400 animate-spin ml-auto" />}
              {streamDone && <CheckCircle className="w-3 h-3 text-emerald-400 ml-auto" />}
            </h4>
            <div ref={aiScrollRef} className="flex-1 min-h-[320px] max-h-[520px] overflow-y-auto bg-black/20 rounded-lg p-3 text-[10px] leading-relaxed text-gray-300 whitespace-pre-wrap">
              {aiInsight ? (
                <div>
                  {aiInsight.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**'))
                      return <h5 key={i} className="font-bold text-emerald-400 mt-3 mb-1 text-[11px]">{line.replace(/\*\*/g, '')}</h5>;
                    if (line.match(/^\*\*.+\*\*:/)) {
                      const parts = line.replace(/\*\*/g, '').split(':');
                      return <h5 key={i} className="font-bold text-emerald-400 mt-3 mb-1 text-[11px]">{parts[0]}:{parts.slice(1).join(':')}</h5>;
                    }
                    if (line.startsWith('•') || line.startsWith('→') || line.startsWith('-'))
                      return <div key={i} className="flex gap-1.5 items-start ml-1 my-0.5"><span className="text-emerald-500 mt-0.5">•</span><span>{line.slice(line.startsWith('- ') ? 2 : 2)}</span></div>;
                    if (line.trim() === '') return <div key={i} className="h-1.5" />;
                    return <p key={i} className="my-0.5">{line}</p>;
                  })}
                  {aiLoading && <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse ml-0.5" />}
                </div>
              ) : result ? (
                <div className="text-gray-500 text-center mt-16">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-500" />
                  <p>Running AI analysis...</p>
                </div>
              ) : (
                <div className="text-gray-500 italic text-center mt-16">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-emerald-500/40" />
                  <p>Analyze a component to get AI-powered deep analysis</p>
                  <p className="text-[9px] mt-1 text-gray-600">Covers EU regulations, material science, and actionable design changes</p>
                </div>
              )}
            </div>
            {result && (
              <button onClick={handleAnalyze} disabled={loading || aiLoading}
                className="mt-2 w-full py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Re-analyze with AI
              </button>
            )}
          </div>

          {/* Quick Reference Card */}
          <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">
              <Shield className="w-3 h-3 mr-1 text-blue-500" />Recyclability Benchmarks
              <InfoIcon tooltip="Industry-standard recyclability score ranges for EV components. These are approximate targets — actual scores vary by manufacturer and design generation." />
            </h4>
            <div className="space-y-1.5">
              {[
                { comp: 'Chassis / Body', range: '75–90', status: 'good' },
                { comp: 'Wheels & Tires', range: '70–85', status: 'good' },
                { comp: 'Electric Motor', range: '55–75', status: 'fair' },
                { comp: 'Battery Pack', range: '25–55', status: 'poor' },
                { comp: 'Electronics / PCB', range: '15–40', status: 'poor' },
                { comp: 'Interior Cabin', range: '20–45', status: 'poor' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <div className={`w-2 h-2 rounded-full ${b.status === 'good' ? 'bg-emerald-500' : b.status === 'fair' ? 'bg-amber-500' : 'bg-red-400'}`} />
                  <span className="text-gray-600 flex-1">{b.comp}</span>
                  <span className="text-gray-800 font-semibold">{b.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scoring Weights */}
          <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">
              <Gauge className="w-3 h-3 mr-1 text-violet-500" />Score Weights
              <InfoIcon tooltip="How each design attribute contributes to the final recyclability score. Adhesive use has the highest weight because permanent bonding is the single biggest barrier to component disassembly and material recovery." />
            </h4>
            <div className="space-y-1">
              {[
                { attr: 'Adhesive Use', weight: 25, color: 'bg-red-400' },
                { attr: 'Modularity', weight: 20, color: 'bg-emerald-400' },
                { attr: 'Hazard Separation', weight: 20, color: 'bg-amber-400' },
                { attr: 'Labeling Quality', weight: 15, color: 'bg-blue-400' },
                { attr: 'Fastener Count', weight: 10, color: 'bg-violet-400' },
                { attr: 'Material Diversity', weight: 10, color: 'bg-teal-400' },
              ].map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="text-gray-500 w-24">{w.attr}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${w.color}`} style={{ width: `${w.weight * 4}%` }} />
                  </div>
                  <span className="text-gray-700 font-semibold w-8 text-right">{w.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
