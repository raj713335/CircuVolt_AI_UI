import React, { useState, useEffect } from 'react';
import { Bot, Plus, Save, Play, Code, Trash2, Database, Shield, X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getAgents, saveAgent, deleteAgent, streamAgentTest, verifyMcpUrl, verifyA2aUrl } from '../services/api';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:8000';

const UrlListEditor = ({ title, badgeText, badgeColor, badgeBg, urls, onChange, verifyFn, onValidityChange }) => {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    const hasError = Object.values(statuses).some(s => s && s.status === 'invalid');
    if (onValidityChange) onValidityChange(hasError);
  }, [statuses, onValidityChange]);

  const handleAdd = () => onChange([...urls, '']);
  const handleUpdate = (i, val) => {
    const newUrls = [...urls]; newUrls[i] = val; onChange(newUrls);
    if(statuses[i]) setStatuses(prev => ({...prev, [i]: null}));
  };
  const handleRemove = (i) => {
    const newUrls = urls.filter((_, idx) => idx !== i); onChange(newUrls);
    const newStatuses = {};
    Object.keys(statuses).forEach(k => {
      const idx = parseInt(k);
      if (idx < i) newStatuses[idx] = statuses[idx];
      else if (idx > i) newStatuses[idx - 1] = statuses[idx];
    });
    setStatuses(newStatuses);
  };
  const handleVerify = async (i) => {
    if (!urls[i]) {
       setStatuses(prev => { const n = {...prev}; delete n[i]; return n; });
       return;
    }
    setStatuses(prev => ({...prev, [i]: { status: 'checking', msg: 'Verifying...' }}));
    try {
      const res = await verifyFn(urls[i]);
      setStatuses(prev => ({...prev, [i]: { status: res.status, msg: res.message }}));
    } catch(e) {
      setStatuses(prev => ({...prev, [i]: { status: 'invalid', msg: 'Failed to verify connection' }}));
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 0 }}>{title}</label>
        <div style={{ fontSize: 11, color: badgeColor, background: badgeBg, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
          {badgeText}
        </div>
      </div>
      {(urls || []).map((url, i) => {
        const s = statuses[i];
        const isError = s && s.status === 'invalid';
        const isSuccess = s && s.status === 'valid';
        const isChecking = s && s.status === 'checking';
        const borderColor = isError ? '#fca5a5' : isSuccess ? '#86efac' : '#d1d5db';
        const bgColor = isError ? '#fef2f2' : isSuccess ? '#f0fdf4' : '#fff';
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                style={{ 
                  padding: '10px 12px', paddingRight: 36, borderRadius: 8, 
                  border: `1px solid ${borderColor}`, backgroundColor: bgColor,
                  fontSize: 14, outline: 'none', width: '100%',
                  boxShadow: isError ? '0 0 0 1px #fca5a5' : 'none',
                  transition: 'all 0.2s'
                }} 
                value={url} 
                onChange={e => handleUpdate(i, e.target.value)} 
                onBlur={() => handleVerify(i)}
                placeholder="https://..." 
              />
              <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', alignItems: 'center' }}>
                {isChecking && <Loader2 size={16} color="#6b7280" style={{ animation: 'spin 1s linear infinite' }} />}
                {isSuccess && <CheckCircle2 size={16} color="#10b981" />}
                {isError && <XCircle size={16} color="#ef4444" />}
              </div>
              {isError && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <XCircle size={12} /> {s.msg}
                </div>
              )}
              {isSuccess && (
                <div style={{ color: '#10b981', fontSize: 12, marginTop: 4, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} /> {s.msg}
                </div>
              )}
            </div>
            <button 
              style={{ 
                padding: '10px', background: '#fee2e2', color: '#ef4444', 
                borderRadius: 8, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }} 
              onClick={() => handleRemove(i)}
              title="Remove URL"
            >
              <Trash2 size={18} />
            </button>
          </div>
        );
      })}
      <button 
        style={{ 
          background: 'none', border: 'none', color: '#4f46e5', 
          fontSize: 13, fontWeight: 600, cursor: 'pointer', 
          display: 'inline-flex', alignItems: 'center', gap: 4, 
          marginTop: 4, padding: '4px 8px', borderRadius: 6,
          transition: 'background 0.2s'
        }} 
        onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={handleAdd}
      >
        <Plus size={16} /> Add URL
      </button>
    </div>
  );
};

export default function AgentBuilder() {
  const [agents, setAgents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [urlErrors, setUrlErrors] = useState({ mcp: false, a2a: false });

  const [formData, setFormData] = useState({
    name: '', tool_budget: 10, description: '',
    system_prompt: 'You are a helpful AI assistant.', tools: []
  });

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try {
      const data = await getAgents();
      setAgents(data);
      if (data.length > 0 && !activeAgentId) setActiveAgent(data[0]);
    } catch (e) { console.error(e); }
  };

  const setActiveAgent = (agent) => {
    setActiveAgentId(agent.id);
    setFormData({
      id: agent.id, name: agent.name || '', tool_budget: agent.tool_budget || 10,
      description: agent.description || '', system_prompt: agent.system_prompt || '',
      tools: agent.tools || [], mcp_urls: agent.mcp_urls || [], a2a_urls: agent.a2a_urls || []
    });
  };

  const handleCreateNewAgent = () => {
    setFormData({
      name: 'New Custom Agent', tool_budget: 10, description: '',
      system_prompt: 'You are a helpful AI assistant.', tools: [], mcp_urls: [], a2a_urls: []
    });
    setIsNewAgentModalOpen(true);
  };

  const handleSaveAgent = async () => {
    if (urlErrors.mcp || urlErrors.a2a) {
      toast.error('Please fix invalid URLs before saving.');
      return;
    }
    try {
      const saved = await saveAgent(formData);
      toast.success('Agent saved!');
      setIsNewAgentModalOpen(false);
      await fetchAgents();
      setActiveAgentId(saved.id);
      setActiveAgent(saved);
    } catch (e) { toast.error('Failed to save agent'); }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Delete this agent?')) return;
    try {
      await deleteAgent(agentId);
      toast.success('Agent deleted');
      if (activeAgentId === agentId) setActiveAgentId(null);
      fetchAgents();
    } catch (e) { toast.error('Failed to delete agent'); }
  };

  const addCustomTool = () => {
    setFormData(prev => ({ ...prev, tools: [...prev.tools, {
      name: 'new_tool', description: 'A new custom tool',
      code: 'def new_tool(input_str: str) -> str:\n    return "Processed: " + input_str'
    }]}));
  };

  const addRagTool = () => {
    setFormData(prev => ({ ...prev, tools: [...prev.tools, {
      name: 'query_knowledge_base',
      description: 'Queries the corporate RAG Knowledge Base for relevant document content.',
      code: `def query_knowledge_base(query: str) -> str:
    """Search the RAG Knowledge Base for documents matching the query."""
    try:
        response = requests.post(
            "http://localhost:8000/rag-query",
            json={"query": query},
            timeout=10
        )
        data = response.json()
        answer = data.get("answer", "")
        if not answer or answer.startswith("No documents"):
            return "No relevant documents found in the Knowledge Base for: " + query
        return "RAG Knowledge Base Results:\\n" + answer
    except Exception as e:
        return "Error querying Knowledge Base: " + str(e)`
    }]}));
  };

  const updateTool = (i, field, val) => {
    const t = [...formData.tools]; t[i] = { ...t[i], [field]: val };
    setFormData(prev => ({ ...prev, tools: t }));
  };

  const removeTool = (i) => {
    const t = [...formData.tools]; t.splice(i, 1);
    setFormData(prev => ({ ...prev, tools: t }));
  };

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isTesting) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTesting(true);
    try {
      let aiText = '';
      let pendingAssistant = false;
      await streamAgentTest(activeAgentId, userMsg.content, (event) => {
        if (event.type === 'chunk') {
          aiText += event.content;
          if (!pendingAssistant) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
            pendingAssistant = true;
          } else {
            setChatMessages(prev => {
              const m = [...prev]; m[m.length - 1] = { ...m[m.length - 1], content: aiText }; return m;
            });
          }
        } else if (event.type === 'tool_start') {
          pendingAssistant = false;
          aiText = '';
          setChatMessages(prev => [...prev, { role: 'tool', content: `⚡ Calling: ${event.tool}`, detail: JSON.stringify(event.input, null, 2) }]);
        } else if (event.type === 'tool_end') {
          setChatMessages(prev => [...prev, { role: 'tool_result', content: event.output }]);
        } else if (event.type === 'error') {
          setChatMessages(prev => [...prev, { role: 'system', content: `❌ Error: ${event.message}` }]);
        }
      });
      // Clean up any empty trailing assistant messages
      setChatMessages(prev => prev.filter(m => m.content && m.content.trim() !== ''));
    } catch (err) { toast.error('Agent execution failed'); }
    finally { setIsTesting(false); }
  };

  // Styles
  const s = {
    page: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 800, color: '#1a1a2e' },
    subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
    newBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#fff', border: '1.5px solid #ddd', borderRadius: 10, fontWeight: 700, fontSize: 13, color: '#333', cursor: 'pointer' },
    layout: { display: 'flex', gap: 24 },
    sidebar: { width: 280, flexShrink: 0 },
    main: { flex: 1, minWidth: 0 },
    // Agent card
    card: (active) => ({ padding: 16, borderRadius: 12, border: active ? '2px solid #f59e0b' : '1.5px solid #e5e5e5', background: active ? '#fffbeb' : '#fff', cursor: 'pointer', marginBottom: 12, transition: 'all 0.15s', position: 'relative' }),
    cardName: { fontWeight: 700, fontSize: 15, color: '#1a1a2e' },
    cardDesc: { fontSize: 12, color: '#888', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    cardBadge: { display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#666', background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, marginTop: 8 },
    cardDel: { position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', padding: 4 },
    // Config panel
    panel: { background: '#fff', borderRadius: 14, border: '1.5px solid #e5e5e5', overflow: 'hidden' },
    panelHeader: { padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' },
    panelTitle: { fontWeight: 700, fontSize: 17, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 },
    panelBody: { padding: 24 },
    row: { display: 'flex', gap: 16, marginBottom: 20 },
    field: (flex) => ({ flex: flex || 1 }),
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    textarea: { width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: "'SF Mono', 'Fira Code', monospace", resize: 'vertical', boxSizing: 'border-box', minHeight: 100 },
    codeArea: { width: '100%', border: '1.5px solid #d0d5dd', borderRadius: 8, padding: '12px 14px', fontSize: 13, outline: 'none', fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace", resize: 'vertical', boxSizing: 'border-box', minHeight: 120, background: '#f8f9fb', color: '#1e293b', lineHeight: 1.6 },
    // Buttons
    btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    btnOutline: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#fff', color: '#4f46e5', border: '1.5px solid #c7d2fe', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    btnDanger: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    btnGreen: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
    btnGhost: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', background: 'transparent', color: '#666', border: '1.5px solid #ddd', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
    linkBtn: { background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 },
    // Tools section
    toolCard: { border: '1.5px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 16, background: '#fff', position: 'relative' },
    toolDelBtn: { position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' },
    // Empty state
    empty: { padding: 48, textAlign: 'center', color: '#aaa', border: '2px dashed #e5e5e5', borderRadius: 12, fontSize: 14 },
    // Test panel
    testPanel: { position: 'fixed', top: 0, right: 0, width: 420, height: '100vh', background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.08)', zIndex: 100, display: 'flex', flexDirection: 'column' },
    testHeader: { padding: '16px 20px', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    testBody: { flex: 1, overflowY: 'auto', padding: 16, background: '#f8f9fb' },
    testFooter: { padding: 16, borderTop: '1px solid #eee', background: '#fff' },
    chatUser: { background: '#4f46e5', color: '#fff', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', maxWidth: '80%', marginLeft: 'auto', marginBottom: 12, fontSize: 13, lineHeight: 1.5 },
    chatBot: { background: '#fff', color: '#333', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', maxWidth: '80%', marginBottom: 12, fontSize: 13, lineHeight: 1.5, border: '1px solid #e5e5e5', whiteSpace: 'pre-wrap' },
    chatSys: { fontSize: 11, color: '#888', background: '#f0f0f0', padding: '6px 10px', borderRadius: 8, marginBottom: 8, fontFamily: 'monospace', maxWidth: '90%', wordBreak: 'break-word' },
    // Modal
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalBody: { padding: 24 },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#fafafa' },
  };

  const ToolEditor = ({ tool, idx, onUpdate, onRemove }) => (
    <div style={s.toolCard}>
      <button onClick={() => onRemove(idx)} style={s.toolDelBtn} title="Remove tool">
        <Trash2 size={15} />
      </button>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, paddingRight: 30 }}>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Tool Name</label>
          <input style={s.input} value={tool.name} onChange={e => onUpdate(idx, 'name', e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Description (Important for LLM)</label>
          <input style={s.input} value={tool.description} onChange={e => onUpdate(idx, 'description', e.target.value)} />
        </div>
      </div>
      <div>
        <label style={s.label}>Python Implementation</label>
        <textarea style={s.codeArea} value={tool.code} spellCheck="false"
          onChange={e => onUpdate(idx, 'code', e.target.value)} rows={6} />
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Agent Builder</div>
          <div style={s.subtitle}>Design custom agents, write dynamic tools, and bind them to governance policies.</div>
        </div>
        <button style={s.newBtn} onClick={handleCreateNewAgent}>
          <Plus size={16} /> New Agent
        </button>
      </div>

      {/* Main Layout */}
      <div style={s.layout}>
        {/* Left Sidebar */}
        <div style={s.sidebar}>
          {agents.map(agent => (
            <div key={agent.id} style={s.card(activeAgentId === agent.id)} onClick={() => setActiveAgent(agent)}>
              <button style={s.cardDel} onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                <Trash2 size={14} />
              </button>
              <div style={s.cardName}>{agent.name}</div>
              <div style={s.cardDesc}>{agent.description || 'No description'}</div>
              <span style={s.cardBadge}>{agent.tools?.length || 0} Tools</span>
            </div>
          ))}
          {agents.length === 0 && (
            <div style={s.empty}>
              <Bot size={32} color="#ddd" style={{ margin: '0 auto 12px' }} />
              <div>No agents yet. Click <strong>+ New Agent</strong> to start.</div>
            </div>
          )}
        </div>

        {/* Right Config Panel */}
        <div style={s.main}>
          {activeAgentId ? (
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <div style={s.panelTitle}>
                  <Code size={18} color="#4f46e5" /> Agent Configuration
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btnDanger} onClick={() => handleDeleteAgent(activeAgentId)}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button style={s.btnOutline} onClick={() => { setIsTestOpen(true); setChatMessages([]); }}>
                    <Play size={14} /> Test Agent
                  </button>
                  <button style={s.btnPrimary} onClick={handleSaveAgent}>
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>
              <div style={s.panelBody}>
                <div style={{ background: '#eff6ff', border: '1px dashed #bfdbfe', padding: '10px 14px', borderRadius: 8, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 2 }}>A2A Agent Card Endpoint</div>
                    <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'monospace' }}>http://localhost:8000/agents/{activeAgentId}/.well-known/agent.json</div>
                  </div>
                  <div style={{ fontSize: 10, background: '#1d4ed8', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 600 }}>A2A Discovery</div>
                </div>
                <div style={s.row}>
                  <div style={s.field(3)}>
                    <label style={s.label}>Agent Name</label>
                    <input style={s.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div style={s.field(1)}>
                    <label style={s.label}>Tool Budget</label>
                    <input style={s.input} type="number" value={formData.tool_budget} onChange={e => setFormData({...formData, tool_budget: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={s.label}>Description</label>
                  <input style={s.input} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <UrlListEditor 
                  title="MCP Server URLs" 
                  badgeText="Model Context Protocol" 
                  badgeColor="#059669" 
                  badgeBg="#d1fae5" 
                  urls={formData.mcp_urls || []} 
                  onChange={newUrls => setFormData({...formData, mcp_urls: newUrls})}
                  verifyFn={verifyMcpUrl}
                  onValidityChange={hasError => setUrlErrors(prev => ({...prev, mcp: hasError}))}
                />
                
                <UrlListEditor 
                  title="A2A Agent URLs" 
                  badgeText="A2A Delegation" 
                  badgeColor="#1d4ed8" 
                  badgeBg="#eff6ff" 
                  urls={formData.a2a_urls || []} 
                  onChange={newUrls => setFormData({...formData, a2a_urls: newUrls})}
                  verifyFn={verifyA2aUrl}
                  onValidityChange={hasError => setUrlErrors(prev => ({...prev, a2a: hasError}))}
                />
                <div style={{ marginBottom: 20 }}>
                  <label style={s.label}>System Prompt</label>
                  <textarea style={s.textarea} value={formData.system_prompt} rows={4}
                    onChange={e => setFormData({...formData, system_prompt: e.target.value})} />
                </div>

                {/* Tools */}
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={16} color="#4f46e5" /> Custom Python Tools
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button style={{ ...s.linkBtn, color: '#7c3aed' }} onClick={addRagTool}>
                        <Database size={14} /> Add RAG Tool
                      </button>
                      <button style={{ ...s.linkBtn, color: '#4f46e5' }} onClick={addCustomTool}>
                        <Plus size={14} /> Add Tool
                      </button>
                    </div>
                  </div>
                  {formData.tools.length === 0 ? (
                    <div style={s.empty}>No custom tools defined. This agent will only use built-in capabilities.</div>
                  ) : (
                    formData.tools.map((tool, idx) => (
                      <ToolEditor key={idx} tool={tool} idx={idx} onUpdate={updateTool} onRemove={removeTool} />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...s.empty, padding: 80 }}>
              <Bot size={48} color="#ddd" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Select an agent or create a new one</div>
            </div>
          )}
        </div>
      </div>

      {/* New Agent Modal */}
      {isNewAgentModalOpen && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>New Agent</div>
              <button onClick={() => setIsNewAgentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                <X size={20} />
              </button>
            </div>
            <div style={s.modalBody}>
              <div style={s.row}>
                <div style={s.field(3)}>
                  <label style={s.label}>Agent Name</label>
                  <input style={s.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div style={s.field(1)}>
                  <label style={s.label}>Tool Budget</label>
                  <input style={s.input} type="number" value={formData.tool_budget} onChange={e => setFormData({...formData, tool_budget: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Description</label>
                <input style={s.input} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>System Prompt</label>
                <textarea style={s.textarea} value={formData.system_prompt} rows={4}
                  onChange={e => setFormData({...formData, system_prompt: e.target.value})} />
              </div>

              {/* Tools in modal */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={14} color="#4f46e5" /> Custom Python Tools
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button style={{ ...s.linkBtn, color: '#7c3aed' }} onClick={addRagTool}>
                      <Database size={14} /> Add RAG Tool
                    </button>
                    <button style={{ ...s.linkBtn, color: '#4f46e5' }} onClick={addCustomTool}>
                      <Plus size={14} /> Add Tool
                    </button>
                  </div>
                </div>
                {formData.tools.length === 0 ? (
                  <div style={{ ...s.empty, padding: 24 }}>No custom tools defined.</div>
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {formData.tools.map((tool, idx) => (
                      <ToolEditor key={idx} tool={tool} idx={idx} onUpdate={updateTool} onRemove={removeTool} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnGhost} onClick={() => setIsNewAgentModalOpen(false)}>Cancel</button>
              <button style={s.btnGreen} onClick={handleSaveAgent}>Create Agent</button>
            </div>
          </div>
        </div>
      )}

      {/* Test Agent Slide-in */}
      {isTestOpen && (
        <>
          <div onClick={() => setIsTestOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: 450, height: '100vh', background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', zIndex: 100, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e5e5' }}>
            {/* Header */}
            <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{formData.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{formData.tools?.length || 0} tools · LangGraph Runtime</div>
                </div>
              </div>
              <button onClick={() => setIsTestOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f8f9fb' }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 80 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Bot size={28} color="#4f46e5" />
                  </div>
                  <div style={{ fontWeight: 600, color: '#555', fontSize: 14 }}>Agent Ready</div>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Send a message to test your agent and its tools.</div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  {msg.role === 'user' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ background: '#4f46e5', color: '#fff', padding: '10px 16px', borderRadius: '16px 16px 4px 16px', maxWidth: '80%', fontSize: 13, lineHeight: 1.5 }}>
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ background: '#fff', color: '#333', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', maxWidth: '85%', fontSize: 13, lineHeight: 1.6, border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        {msg.content || (isTesting && i === chatMessages.length - 1 ? '●●●' : '')}
                      </div>
                    </div>
                  )}
                  {msg.role === 'tool' && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '8px 12px', maxWidth: '90%', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 4 }}>{msg.content}</div>
                      {msg.detail && <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#78350f', background: '#fffbeb', padding: '6px 8px', borderRadius: 6 }}>{msg.detail}</div>}
                    </div>
                  )}
                  {msg.role === 'tool_result' && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '8px 12px', maxWidth: '90%', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 4 }}>✓ Tool Result</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#047857', whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>{msg.content}</div>
                    </div>
                  )}
                  {msg.role === 'system' && (
                    <div style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca' }}>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: 16, borderTop: '1px solid #eee', background: '#fff' }}>
              <form onSubmit={handleTestSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask your agent something..."
                  disabled={isTesting}
                  style={{ flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 24, padding: '11px 18px', fontSize: 13, outline: 'none', background: '#f9fafb' }}
                />
                <button type="submit" disabled={isTesting || !chatInput.trim()}
                  style={{ width: 42, height: 42, borderRadius: 21, background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isTesting || !chatInput.trim() ? 0.4 : 1 }}>
                  <Play size={16} style={{ marginLeft: 2 }} />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
