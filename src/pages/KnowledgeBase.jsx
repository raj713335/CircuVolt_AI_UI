import React, { useState, useEffect, useRef } from 'react';
import { Database, Shield, UploadCloud, FileText, X, CheckCircle, AlertCircle, Edit2, Play } from 'lucide-react';
import { getDocuments, uploadDocument, getSecuritySettings, updateSecuritySettings, getDocument } from '../services/api';
import toast from 'react-hot-toast';

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState('store');
  const [documents, setDocuments] = useState([]);
  const [securitySettings, setSecuritySettings] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  
  // Settings Form State
  const [editingPii, setEditingPii] = useState(false);
  const [piiJsonStr, setPiiJsonStr] = useState('');
  
  const [editingBlocklist, setEditingBlocklist] = useState(false);
  const [blocklistStr, setBlocklistStr] = useState('');
  
  const [wordMasking, setWordMasking] = useState(true);
  const [agenticScan, setAgenticScan] = useState(true);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    fetchSettings();
  }, []);

  const fetchDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs.reverse()); // latest first
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const settings = await getSecuritySettings();
      setSecuritySettings(settings);
      setPiiJsonStr(JSON.stringify(settings.pii_regex, null, 2));
      setBlocklistStr(settings.blocklist);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    toast.loading('Processing document...', { id: 'upload' });
    
    try {
      await uploadDocument(file, agenticScan, wordMasking);
      toast.success('File processed', { id: 'upload' });
      fetchDocuments();
    } catch (e) {
      toast.error('Upload failed', { id: 'upload' });
      console.error(e);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePreview = async (doc) => {
    if (doc.status !== 'indexed') return;
    try {
      const fullDoc = await getDocument(doc.id);
      setPreviewDoc(fullDoc);
    } catch (e) {
      toast.error('Failed to load document content');
    }
  };

  const savePiiRules = async () => {
    try {
      const parsed = JSON.parse(piiJsonStr);
      await updateSecuritySettings({ pii_regex: parsed });
      toast.success('PII Redaction Controls updated');
      setEditingPii(false);
      fetchSettings();
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const saveBlocklist = async () => {
    try {
      await updateSecuritySettings({ blocklist: blocklistStr });
      toast.success('Sensitive Data Blocklist updated');
      setEditingBlocklist(false);
      fetchSettings();
    } catch (e) {
      toast.error('Failed to update blocklist');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            RAG Knowledge Base
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Upload documents to your corporate RAG store. When security is enabled, all files pass through the Agentic Security Scanner to prevent PII leakage and prompt injections before being vectorized.
          </p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'store' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Database className="w-4 h-4" />
            Document Store
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'security' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            RAG Security Controls
          </button>
        </div>
      </div>

      {activeTab === 'store' && (
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {/* Upload Zone */}
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl bg-white p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.md,.pdf" onChange={handleFileUpload} />
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Upload Documents</h3>
              <p className="text-sm text-gray-500 mb-6">Drag and drop your .txt, .md, or .pdf files here, or click to browse.</p>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold border border-gray-200 flex items-center gap-1"><Shield className="w-3 h-3"/> Agentic Scan</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold border border-gray-200">Auto-Chunking</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold border border-gray-200">Vector Embedded</span>
              </div>
            </div>

            {/* Processing Queue */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Processing Queue</h3>
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-gray-800">{doc.filename}</span>
                        {doc.status === 'rejected' ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">
                            <X className="w-3.5 h-3.5" /> Security Scan Rejected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                            <CheckCircle className="w-3.5 h-3.5" /> Indexed
                          </span>
                        )}
                      </div>
                      {doc.status === 'rejected' && (
                        <div className="text-xs text-red-700 bg-red-50 p-3 rounded border border-red-100 leading-relaxed whitespace-pre-line font-medium">
                          {doc.message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No documents processed yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-700">
                  <Database className="w-4 h-4" /> Indexed Data
                </h3>
                <span className="text-xs font-bold text-gray-500">{documents.filter(d => d.status === 'indexed').length} Files</span>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Word Masking (PII)</span>
                  <div 
                    className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${wordMasking ? 'bg-indigo-500' : 'bg-gray-300'}`}
                    onClick={() => setWordMasking(!wordMasking)}
                  >
                    <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${wordMasking ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Agentic Security Scan</span>
                  <div 
                    className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${agenticScan ? 'bg-indigo-500' : 'bg-gray-300'}`}
                    onClick={() => setAgenticScan(!agenticScan)}
                  >
                    <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${agenticScan ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {documents.filter(d => d.status === 'indexed').map(doc => (
                  <div 
                    key={doc.id} 
                    onClick={() => handlePreview(doc)}
                    className="p-3 border border-gray-100 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group bg-gray-50 hover:bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                      <span className="text-sm font-semibold text-gray-700 truncate">{doc.filename}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" /> {doc.vectors} vectors
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-8 max-w-4xl">
          {/* PII Redaction Controls */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">5.2 PII Redaction Controls</h3>
                <p className="text-sm text-gray-500">Configure Presidio-style Regular Expressions to proactively mask PII in documents before RAG indexing.</p>
              </div>
              {!editingPii ? (
                <button onClick={() => setEditingPii(true)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Rules
                </button>
              ) : (
                <button onClick={savePiiRules} className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-700 hover:bg-indigo-700 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" /> Save Rules
                </button>
              )}
            </div>
            <div className="p-6 bg-[#1e1e1e]">
              <textarea 
                value={piiJsonStr}
                onChange={e => setPiiJsonStr(e.target.value)}
                disabled={!editingPii}
                className="w-full h-64 bg-transparent text-emerald-400 font-mono text-sm resize-none focus:outline-none disabled:opacity-80"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Sensitive Data Blocklist */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">5.1 Sensitive Data Disclosure & Prompt Leakage</h3>
                <p className="text-sm text-gray-500">Blocklist terms that agents are strictly forbidden from outputting when retrieving RAG knowledge.</p>
              </div>
              {!editingBlocklist ? (
                <button onClick={() => setEditingBlocklist(true)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Rules
                </button>
              ) : (
                <button onClick={saveBlocklist} className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-700 hover:bg-indigo-700 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" /> Save List
                </button>
              )}
            </div>
            <div className="p-6">
              <textarea 
                value={blocklistStr}
                onChange={e => setBlocklistStr(e.target.value)}
                disabled={!editingBlocklist}
                className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-mono text-sm resize-none focus:outline-none focus:border-indigo-400 disabled:opacity-80 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Global Security Pipeline Policy */}
          <div className="bg-gradient-to-br from-indigo-900 to-[#1b2a3d] rounded-xl border border-indigo-500/30 shadow-lg p-6 relative overflow-hidden">
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
             <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2 relative z-10"><Shield className="w-5 h-5 text-indigo-400" /> Global Security Pipeline</h3>
             <p className="text-indigo-200/80 text-sm mb-6 font-medium relative z-10">A unified interceptor layer that all agent requests pass through before entering the AGL Gateway:</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
               <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5"><Shield className="w-3.5 h-3.5" /></div>
                 <div>
                   <span className="text-white font-bold text-sm block mb-0.5">PII Redactor</span>
                   <span className="text-indigo-200/70 text-xs leading-relaxed block">Regex-based engine masking sensitive entities (Email, SSN, Credit Cards, API Keys).</span>
                 </div>
               </div>
               <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5"><CheckCircle className="w-3.5 h-3.5" /></div>
                 <div>
                   <span className="text-white font-bold text-sm block mb-0.5">Goal Integrity Checker</span>
                   <span className="text-indigo-200/70 text-xs leading-relaxed block">Validates that requested tools align perfectly with the user's intent.</span>
                 </div>
               </div>
               <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5"><Database className="w-3.5 h-3.5" /></div>
                 <div>
                   <span className="text-white font-bold text-sm block mb-0.5">OPA / Rego Engine</span>
                   <span className="text-indigo-200/70 text-xs leading-relaxed block">Centralized access control evaluating principal and tool risk against declarative .rego policies.</span>
                 </div>
               </div>
               <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5"><AlertCircle className="w-3.5 h-3.5" /></div>
                 <div>
                   <span className="text-white font-bold text-sm block mb-0.5">Sandbox Limits</span>
                   <span className="text-indigo-200/70 text-xs leading-relaxed block">Hard limits on autonomy budgets and a strict blocklist for unsafe tools (e.g. run_shell).</span>
                 </div>
               </div>
               <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5"><Play className="w-3.5 h-3.5" /></div>
                 <div>
                   <span className="text-white font-bold text-sm block mb-0.5">Human Review Queue</span>
                   <span className="text-indigo-200/70 text-xs leading-relaxed block">High-risk actions identified by OPA pause execution and route to a human-in-the-loop UI.</span>
                 </div>
               </div>
               <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5"><FileText className="w-3.5 h-3.5" /></div>
                 <div>
                   <span className="text-white font-bold text-sm block mb-0.5">Output Validator</span>
                   <span className="text-indigo-200/70 text-xs leading-relaxed block">Final scan of the agent's output against a blocklist before returning payload.</span>
                 </div>
               </div>
             </div>
          </div>

          {/* Static UI for other requested sections to complete the look */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 opacity-75">
             <h3 className="text-lg font-bold text-gray-900 mb-1">Memory Poisoning and Context Governance</h3>
             <p className="text-sm text-gray-500 mb-4">Define hard limits on context size and sandbox rules.</p>
             <div className="flex gap-4">
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-bold text-gray-500 block mb-1">Max Context Window</span>
                  <span className="text-sm font-mono text-gray-900">8,192 tokens</span>
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-bold text-gray-500 block mb-1">RAG Query Limit</span>
                  <span className="text-sm font-mono text-gray-900">5 queries / min</span>
                </div>
             </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 opacity-75">
             <h3 className="text-lg font-bold text-gray-900 mb-1">RAG Threats: Poisoned Documents</h3>
             <p className="text-sm text-gray-500 mb-4">OPA Rego policy governing explicit access to the RAG vector store for specific agents.</p>
             <div className="bg-[#1e1e1e] p-4 rounded-lg">
                <pre className="text-xs text-blue-300 font-mono">
{`package rag.authz
default allow = false
allow {
    input.agent.role == "knowledge_retriever"
    input.tenant == data.documents[input.document_id].tenant
}`}
                </pre>
             </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{previewDoc.filename}</h3>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">Ingested Content Preview</p>
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap leading-relaxed">
                  {previewDoc.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
