import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import CarStudio from './pages/CarStudio';
import Dashboard from './pages/Dashboard';
import SOHPredictor from './pages/SOHPredictor';
import MaterialPassport from './pages/MaterialPassport';
import RecoveryOptimizer from './pages/RecoveryOptimizer';
import CircularityDashboard from './pages/CircularityDashboard';
import DesignAdvisor from './pages/DesignAdvisor';
import DisassemblyPlanner from './pages/DisassemblyPlanner';
import KnowledgeBase from './pages/KnowledgeBase';
import AgentBuilder from './pages/AgentBuilder';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: '#fee2e2', color: '#991b1b', height: '100vh' }}>
          <h2>Something went wrong rendering the page.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 20 }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Layout>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<CarStudio />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/predict" element={<SOHPredictor />} />
            <Route path="/disassembly" element={<DisassemblyPlanner />} />
            <Route path="/passport" element={<MaterialPassport />} />
            <Route path="/recovery" element={<RecoveryOptimizer />} />
            <Route path="/circularity" element={<CircularityDashboard />} />
            <Route path="/design" element={<DesignAdvisor />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/agent-builder" element={<AgentBuilder />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </Router>
  );
}

export default App;
