import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Car, Battery, FileText, Recycle, Wrench, BarChart3,
  ChevronLeft, ChevronRight, Zap, Bot
} from 'lucide-react';

const navItems = [
  { path: '/', icon: Car, label: 'Car Studio' },
  { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { path: '/predict', icon: Battery, label: 'SOH Predictor' },
  { path: '/passport', icon: FileText, label: 'Material Passport' },
  { path: '/recovery', icon: Recycle, label: 'Recovery Optimizer' },
  { path: '/circularity', icon: Zap, label: 'Circularity Score' },
  { path: '/design', icon: Wrench, label: 'Design Advisor' },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isCarStudio = location.pathname === '/';

  return (
    <div className="flex h-screen bg-[#f5f0e8] text-gray-800 overflow-hidden" style={{ fontFamily: "'Georgia', serif" }}>
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-[#1b2a3d] flex flex-col transition-all duration-200 flex-shrink-0 z-20`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/10 gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          {!collapsed && <span className="font-bold text-sm text-white tracking-wide">CircuVolt AI</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 border-t border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className={`flex-1 overflow-auto ${isCarStudio ? '' : 'p-6'}`}>
        {children}
      </main>
    </div>
  );
}
