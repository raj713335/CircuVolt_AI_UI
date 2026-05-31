import React from 'react';
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
import './index.css';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/" element={<CarStudio />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/predict" element={<SOHPredictor />} />
          <Route path="/passport" element={<MaterialPassport />} />
          <Route path="/recovery" element={<RecoveryOptimizer />} />
          <Route path="/circularity" element={<CircularityDashboard />} />
          <Route path="/design" element={<DesignAdvisor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
