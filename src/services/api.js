import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const predictSOH = async (batteryData) => {
  const response = await api.post('/predict-soh', batteryData);
  return response.data;
};

export const generatePassport = async (passportData) => {
  const response = await api.post('/generate-passport', passportData);
  return response.data;
};

export const getPassport = async (componentId) => {
  const response = await api.get(`/passport/${componentId}`);
  return response.data;
};

export const recommendRecovery = async (recoveryData) => {
  const response = await api.post('/recommend-recovery', recoveryData);
  return response.data;
};

export const calculateCircularity = async (data) => {
  const response = await api.post('/calculate-circularity-score', data);
  return response.data;
};

export const getDesignSuggestions = async (designData) => {
  const response = await api.post('/design-recyclability-suggestions', designData);
  return response.data;
};

export const getSampleBatteries = async () => {
  const response = await api.get('/sample-batteries');
  return response.data;
};

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard-summary');
  return response.data;
};

export const generateDisassemblyPlan = async (data) => {
  const response = await api.post('/disassembly-plan', data);
  return response.data;
};

// Disassembly AI Analysis - SSE Streaming
export const streamDisassemblyAiAnalysis = async (vehicleData, planResult, onEvent) => {
  const response = await fetch(`${API_BASE}/disassembly-ai-analysis-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicle_data: vehicleData, plan_result: planResult }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// A2A Protocol - Agent Card
export const getAgentCard = async () => {
  const response = await api.get('/.well-known/agent.json');
  return response.data;
};

// Direct LLM Chat
export const chatWithAgent = async (message) => {
  const response = await api.post('/chat', { message });
  return response.data;
};

// Design AI Analysis (LLM with rule-engine fallback)
export const getDesignAiAnalysis = async (designInput, scoreResult) => {
  const response = await api.post('/design-ai-analysis', {
    design_input: designInput,
    score_result: scoreResult,
  });
  return response.data;
};

// Design AI Analysis - SSE Streaming version
export const streamDesignAiAnalysis = async (designInput, scoreResult, onEvent) => {
  const response = await fetch(`${API_BASE}/design-ai-analysis-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_input: designInput, score_result: scoreResult }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// Health / LLM Status
export const getHealthStatus = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Circularity AI Summary - SSE Streaming
export const streamCircularityAiSummary = async (params, scoreResult, onEvent) => {
  const response = await fetch(`${API_BASE}/circularity-ai-summary-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params, score_result: scoreResult }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// Recovery AI Summary - SSE Streaming
export const streamRecoveryAiSummary = async (params, recoveryResult, onEvent) => {
  const response = await fetch(`${API_BASE}/recovery-ai-summary-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params, recovery_result: recoveryResult }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// SOH AI Summary - SSE Streaming
export const streamSohAiSummary = async (params, prediction, onEvent) => {
  const response = await fetch(`${API_BASE}/soh-ai-summary-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params, prediction }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// Passport AI Analysis - SSE Streaming
export const streamPassportAiAnalysis = async (passportData, onEvent) => {
  const response = await fetch(`${API_BASE}/passport-ai-analysis-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passport_data: passportData }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// Dashboard AI Insights - SSE Streaming
export const streamDashboardAiInsights = async (topic, onEvent) => {
  const response = await fetch(`${API_BASE}/dashboard-ai-insights-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// Vehicle Agentic Search - SSE Streaming
export const streamVehicleSearch = async (query, onEvent) => {
  const response = await fetch(`${API_BASE}/vehicle-search-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

// A2A Protocol - Send Task
export const sendA2ATask = async (message, sessionId) => {
  const response = await api.post('/a2a/tasks/send', {
    jsonrpc: '2.0',
    id: Date.now().toString(),
    method: 'tasks/send',
    params: {
      sessionId: sessionId || crypto.randomUUID(),
      message: { role: 'user', parts: [{ type: 'text', text: message }] },
    },
  });
  return response.data;
};

// RAG Knowledge Base Endpoints
export const getSecuritySettings = async () => {
  const response = await api.get('/security-settings');
  return response.data;
};

export const updateSecuritySettings = async (settings) => {
  const response = await api.post('/security-settings', settings);
  return response.data;
};

export const uploadDocument = async (file, agenticScan = true, wordMasking = true) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('agentic_scan', agenticScan);
  formData.append('word_masking', wordMasking);
  const response = await api.post('/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getDocuments = async () => {
  const response = await api.get('/documents');
  return response.data;
};

export const getDocument = async (docId) => {
  const response = await api.get(`/documents/${docId}`);
  return response.data;
};

// Agent Builder Endpoints
export const getAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

export const saveAgent = async (agent) => {
  const response = await api.post('/agents', agent);
  return response.data;
};

export const deleteAgent = async (agentId) => {
  const response = await api.delete(`/agents/${agentId}`);
  return response.data;
};

export const verifyMcpUrl = async (url) => {
  const response = await api.post('/verify-mcp-url', { url });
  return response.data;
};

export const verifyA2aUrl = async (url) => {
  const response = await api.post('/verify-a2a-url', { url });
  return response.data;
};

export const streamAgentTest = async (agentId, message, onEvent) => {
  const response = await fetch(`${API_BASE}/agents/${agentId}/test-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
};

export default api;
