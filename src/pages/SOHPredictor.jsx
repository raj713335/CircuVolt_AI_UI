import React, { useState, useEffect, useRef } from 'react';
import { Battery, AlertTriangle, CheckCircle, Info, Sparkles, Bot, Loader2, X } from 'lucide-react';
import { predictSOH, getSampleBatteries, streamSohAiSummary } from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const gradeColors = { A: '#22c55e', B: '#eab308', C: '#f97316', D: '#ef4444' };
const gradeLabels = {
  A: 'Excellent - Continue EV/Premium Second-Life',
  B: 'Good - Stationary Energy Storage',
  C: 'Fair - Module Refurbishment',
  D: 'Recycle - Material Recovery'
};

// ── Info tooltips ──
const INFO = {
  soh_title: "This tool uses machine learning to predict how healthy an EV battery is (its 'State of Health'). It analyzes sensor data to estimate remaining capacity and assigns a grade (A–D) for the best recovery pathway.",
  cycle_count: "Number of full charge-discharge cycles the battery has completed. Like an odometer for batteries — higher counts mean more wear. Typical EV batteries last 1000–3000 cycles.",
  voltage: "Current battery voltage in volts. Healthy lithium cells typically read 3.6–4.2V. Lower voltage can indicate degradation or deep discharge.",
  current: "The electrical current flowing through the battery in amperes. Higher current during charging/discharging generates more heat and can accelerate wear.",
  temperature: "Current operating temperature in °C. Batteries perform best between 20–35°C. Extreme temperatures (hot or cold) accelerate degradation.",
  charge_capacity: "How much energy the battery can accept during charging (in Ah). This decreases over time as the battery degrades — comparing it to rated capacity shows how much capacity has been lost.",
  discharge_capacity: "How much energy the battery can deliver during use (in Ah). The gap between charge and discharge capacity indicates internal energy losses.",
  internal_resistance: "Opposition to current flow inside the battery (in milliohms). Higher resistance = more energy lost as heat = less efficient battery. Increases as battery ages.",
  rated_capacity: "The battery's original design capacity when new (in Ah). Used as the baseline to calculate how much capacity has been lost over time.",
  depth_of_discharge: "How deeply the battery is discharged each cycle (as %). Deeper discharges (>80%) stress the battery more and accelerate aging. Shallower cycles extend life.",
  max_temperature: "Highest temperature the battery has experienced (°C). Temperatures above 40°C cause permanent damage to the electrode materials and electrolyte.",
  energy_throughput: "Total cumulative energy that has flowed through the battery (in kWh). A measure of total lifetime usage — like 'total kilometers driven' for a car.",
  predicted_soh: "The AI model's prediction of how much original capacity the battery retains. 100% = like new, 80% = typical retirement threshold for EVs, below 60% = significant degradation.",
  grade: "A letter grade (A–D) indicating the best recovery pathway:\n• A = Reuse in EVs or premium second-life\n• B = Stationary energy storage\n• C = Module-level refurbishment\n• D = Material recycling",
  rul: "Remaining Useful Life — estimated number of charge cycles before the battery drops below usable threshold. Helps plan retirement timing and second-life duration.",
  confidence: "How confident the AI model is in its prediction. Based on how similar this battery's parameters are to the training data. Higher confidence = more reliable prediction.",
  risk_flags: "Warnings about specific parameters that are outside normal ranges. These flags highlight potential issues that could accelerate degradation or pose safety concerns.",
  shap: "SHAP (SHapley Additive exPlanations) shows which battery parameters had the biggest influence on the SOH prediction. Taller bars = more important factors in determining battery health.",
  recommendation: "The AI's suggested next step based on the battery's health, grade, and risk factors. Could be continued use, second-life application, refurbishment, or recycling.",
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

const FIELD_INFO_MAP = {
  cycle_count: 'cycle_count', voltage: 'voltage', current: 'current', temperature: 'temperature',
  charge_capacity: 'charge_capacity', discharge_capacity: 'discharge_capacity',
  internal_resistance: 'internal_resistance', rated_capacity: 'rated_capacity',
  depth_of_discharge: 'depth_of_discharge', max_temperature: 'max_temperature',
  energy_throughput: 'energy_throughput',
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
          Battery SOH Prediction
          <InfoIcon tooltip={INFO.soh_title} />
        </h2>
        <p className="text-gray-500">AI-powered State of Health prediction with second-life grading</p>
      </div>

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
        {/* Input Form */}
        <div className="bg-white/60 rounded-xl p-6 border border-[#d4c5a9] lg:col-span-1">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4">✦ Battery Parameters</h3>
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
                      ✦ Feature Importance (SHAP)<InfoIcon tooltip={INFO.shap} />
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
                      ✦ Health Radar<InfoIcon tooltip="A visual overview of the battery's health across key dimensions. Points closer to the edge indicate better performance. Identifies weak spots at a glance." />
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
