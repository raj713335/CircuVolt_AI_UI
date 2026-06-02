import React, { useState, useRef, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, ContactShadows, Environment, Stage } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Search, RotateCcw, Eye, Camera, Download, Star, ChevronDown, Recycle, DollarSign, Leaf, Weight, Zap, Info, X, Wrench, Shield, Cpu, Loader2, Sparkles, ImageIcon, ExternalLink, Layers, Bot } from 'lucide-react';
import { streamVehicleSearch } from '../services/api';
import { searchCarImages } from '../services/carImageSearch';
import RealisticCar3D from '../components/RealisticCar3D';

// ── Real car photos from /cars/ directory ──
const CAR_PHOTOS = {
  'Tesla Model 3': '/cars/tesla-model-3.png',
  'BMW i4': '/cars/bmw-i4.png',
  'Toyota Camry Hybrid': '/cars/toyota-camry.png',
  'Ford F-150 Lightning': '/cars/ford-f150.png',
  'Lamborghini Urus': '/cars/lamborghini-urus.png',
  'Ferrari 458 Italia': '/cars/ferrari.png',
};

// ── Fallback SVG generator ──
const carSvg = (color = '#10b981', w = 400, h = 200) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.9"/><stop offset="100%" stop-color="${color}" stop-opacity="0.5"/></linearGradient></defs><rect width="${w}" height="${h}" fill="#1a1a2e"/><path d="M60 140 L80 100 L140 70 L260 65 L320 85 L350 110 L355 140 Z" fill="url(#g)" stroke="${color}" stroke-width="2"/><path d="M140 70 L155 45 L265 42 L280 65" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5"/><circle cx="110" cy="145" r="22" fill="#111" stroke="#555" stroke-width="3"/><circle cx="110" cy="145" r="10" fill="#333"/><circle cx="300" cy="145" r="22" fill="#111" stroke="#555" stroke-width="3"/><circle cx="300" cy="145" r="10" fill="#333"/><line x1="345" y1="105" x2="355" y2="108" stroke="#ff4444" stroke-width="3" stroke-linecap="round"/><line x1="345" y1="112" x2="355" y2="115" stroke="#ff4444" stroke-width="3" stroke-linecap="round"/><circle cx="70" cy="108" r="5" fill="#ffee88" opacity="0.9"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
const carThumb = (color) => carSvg(color, 120, 80);

// ── Info tooltips for non-domain users ──
const INFO = {
  studio: "This interactive 3D tool lets you explore how a car is built and how recyclable each part is. Click any component to see what it's made of, its environmental impact, and how it can be recycled.",
  recyclability: "A percentage showing how much of this component's materials can be recovered and reused at end-of-life. 90%+ = excellent, 70-89% = good, below 70% = needs improvement.",
  weight: "The mass of this component in kilograms. Heavier components contain more raw materials and have bigger environmental impact, but also more recovery potential.",
  recovery_cost: "Estimated cost to manufacture or replace this component. Higher-value parts justify more expensive recycling processes.",
  carbon: "The carbon dioxide equivalent emissions produced during manufacturing this component. Lower is better. Recycling can avoid 50-90% of these emissions.",
  recovery_method: "The industrial process used to recycle this component. Different materials need different methods — metals are melted, plastics are shredded, batteries use chemical processes.",
  material: "The primary materials used to make this component. Understanding composition helps determine the best recycling approach and recovered material value.",
  material_breakdown: "Detailed percentage breakdown of materials in this component. Shows exactly what can be recovered and the complexity of separation needed.",
  eu_passport: "EU Battery Regulation 2023/1542 requires a 'digital passport' for every EV battery — tracking materials, carbon footprint, and recycling data throughout its lifetime.",
  recycl_cert: "Overall recyclability grade based on average component recyclability. Grade A (>85%) exceeds EU requirements; Grade B (70-85%) meets minimum standards.",
  carbon_footprint: "Total lifecycle carbon emissions from manufacturing all components. This is the CO₂ that can be avoided through effective recycling and material recovery.",
  eol_plan: "End-of-Life plan mapping out how each component will be recovered — which parts get reused, refurbished, or recycled, and through which facilities.",
  circular_economy: "The circular economy model: instead of make-use-dispose, materials flow in a loop — manufactured into products, used, then recovered and fed back into manufacturing.",
  msrp: "Manufacturer's Suggested Retail Price — the base starting price of the vehicle before options, taxes, or dealer markups.",
  specs: "Key vehicle specifications: driving range (how far on full charge/tank), horsepower (engine/motor power), 0-60 acceleration time, and curb weight.",
  compare: "Compare two vehicles side-by-side on recyclability, carbon footprint, material recovery rates, and end-of-life value.",
  exploded: "Exploded view separates all components so you can see how they fit together. Assembled view shows the complete car. Click individual parts for details.",
  powertrain: "The vehicle's primary propulsion system (e.g., Battery Electric, Internal Combustion Engine, Hybrid). Determines core material composition and recovery pathways.",
};

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
            <button onClick={() => setShow(false)} className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
            {tooltip}
          </div>
        </>
      )}
    </span>
  );
};

const CAR_DATABASE = {
  'Tesla Model 3': {
    type: 'Electric Sedan', year: '2024', msrp: '$38,990', powertrain: 'Battery Electric (EV)',
    get image() { return CAR_PHOTOS['Tesla Model 3']; }, get thumbnail() { return CAR_PHOTOS['Tesla Model 3']; },
    bodyColor: '#1a1a2e', accentColor: '#6366f1',
    specs: { range: '358 mi', hp: '283 hp', accel: '5.8s 0-60', weight: '1,760 kg' },
    components: [
      { name: 'Battery Pack', color: '#6366f1', weight: '480 kg', recyclability: 92, cost: '$12,000', material: 'Lithium-ion NCA', carbonFootprint: '8.2 tCO2e', recovery: 'Hydrometallurgical',
        description: '60 kWh NCA (Nickel-Cobalt-Aluminum) pack with 2170 cylindrical cells from Panasonic. Structural pack integrated into floor.',
        materialBreakdown: [{ mat: 'Nickel', pct: 32 }, { mat: 'Graphite', pct: 22 }, { mat: 'Aluminum', pct: 18 }, { mat: 'Copper', pct: 12 }, { mat: 'Cobalt', pct: 5 }, { mat: 'Lithium', pct: 4 }, { mat: 'Electrolyte', pct: 4 }, { mat: 'Plastics/Separator', pct: 3 }] },
      { name: 'Electric Motor', color: '#ec4899', weight: '32 kg', recyclability: 88, cost: '$2,800', material: 'Copper/Neodymium', carbonFootprint: '1.1 tCO2e', recovery: 'Direct reuse/Rewind',
        description: 'Permanent magnet synchronous reluctance motor (IPM-SynRM). Rear drive unit produces 283 hp / 330 lb-ft. Contains recoverable NdFeB magnets.',
        materialBreakdown: [{ mat: 'Copper windings', pct: 35 }, { mat: 'Silicon steel laminations', pct: 30 }, { mat: 'Neodymium magnets', pct: 8 }, { mat: 'Aluminum housing', pct: 15 }, { mat: 'Bearings/Steel', pct: 7 }, { mat: 'Insulation', pct: 5 }] },
      { name: 'Chassis Frame', color: '#f59e0b', weight: '285 kg', recyclability: 95, cost: '$4,500', material: 'Die-Cast Aluminum', carbonFootprint: '3.8 tCO2e', recovery: 'Smelting/Recast',
        description: 'Single-piece mega casting rear underbody (Giga Press). 6000-series aluminum alloy. Eliminates 70+ parts vs traditional stamping.',
        materialBreakdown: [{ mat: 'Aluminum 6061-T6', pct: 78 }, { mat: 'High-strength steel', pct: 15 }, { mat: 'Adhesive/Sealant', pct: 4 }, { mat: 'Fasteners', pct: 3 }] },
      { name: 'Body Panels', color: '#10b981', weight: '180 kg', recyclability: 85, cost: '$3,200', material: 'Steel/Aluminum', carbonFootprint: '2.1 tCO2e', recovery: 'Shredding/Sorting',
        description: 'Mixed-material body: steel roof, aluminum hood/trunk/doors. Glass roof panel bonded with urethane adhesive.',
        materialBreakdown: [{ mat: 'Steel (BIW)', pct: 45 }, { mat: 'Aluminum panels', pct: 30 }, { mat: 'Glass', pct: 12 }, { mat: 'Paint/Primer', pct: 5 }, { mat: 'Sealant/Adhesive', pct: 5 }, { mat: 'Plastic trim', pct: 3 }] },
      { name: 'Interior Cabin', color: '#8b5cf6', weight: '120 kg', recyclability: 62, cost: '$2,100', material: 'Plastics/Vegan Leather', carbonFootprint: '1.5 tCO2e', recovery: 'Material separation',
        description: 'Minimalist interior with 15.4" touchscreen. Vegan leather seats (polyurethane), recycled plastic trim, wood dash insert.',
        materialBreakdown: [{ mat: 'Polyurethane (seats)', pct: 28 }, { mat: 'ABS/PP plastics', pct: 25 }, { mat: 'Steel frame', pct: 18 }, { mat: 'Glass (screen)', pct: 10 }, { mat: 'Foam padding', pct: 8 }, { mat: 'Wiring/PCB', pct: 6 }, { mat: 'Wood/Fabric', pct: 5 }] },
      { name: 'Power Electronics', color: '#06b6d4', weight: '18 kg', recyclability: 78, cost: '$1,800', material: 'SiC MOSFET/Copper/PCB', carbonFootprint: '0.8 tCO2e', recovery: 'E-waste processing',
        description: 'Silicon Carbide inverter (custom Tesla design), DC-DC converter, and 11.5 kW onboard charger. SiC enables 5-10% efficiency gain.',
        materialBreakdown: [{ mat: 'Copper busbars', pct: 30 }, { mat: 'PCB/FR4', pct: 22 }, { mat: 'SiC semiconductors', pct: 15 }, { mat: 'Aluminum heatsink', pct: 18 }, { mat: 'Solder (Sn-Ag-Cu)', pct: 5 }, { mat: 'Plastic housing', pct: 10 }] },
      { name: 'Thermal System', color: '#f97316', weight: '25 kg', recyclability: 72, cost: '$1,200', material: 'Aluminum/R1234yf', carbonFootprint: '0.6 tCO2e', recovery: 'Refrigerant reclaim',
        description: 'Patented Octovalve heat pump with supermanifold. Single integrated thermal system manages battery, cabin, and motor cooling.',
        materialBreakdown: [{ mat: 'Aluminum tubing', pct: 40 }, { mat: 'R1234yf refrigerant', pct: 8 }, { mat: 'Rubber hoses', pct: 15 }, { mat: 'Copper (heat exchangers)', pct: 20 }, { mat: 'Glycol coolant', pct: 12 }, { mat: 'Sensors/Valves', pct: 5 }] },
      { name: 'Wheels & Tires', color: '#64748b', weight: '85 kg', recyclability: 70, cost: '$2,400', material: 'Rubber/Aluminum', carbonFootprint: '0.9 tCO2e', recovery: 'Devulcanization/Melt',
        description: '18" Photon Aero wheels (cast aluminum) with Michelin Primacy MXM4 all-season tires. Aero covers improve range by ~10 miles.',
        materialBreakdown: [{ mat: 'Natural/synthetic rubber', pct: 35 }, { mat: 'Cast aluminum', pct: 30 }, { mat: 'Carbon black', pct: 15 }, { mat: 'Steel belts/bead', pct: 12 }, { mat: 'Silica', pct: 5 }, { mat: 'Textile cord', pct: 3 }] },
      { name: 'Wiring Harness', color: '#a855f7', weight: '42 kg', recyclability: 68, cost: '$1,500', material: 'Copper/PVC', carbonFootprint: '0.7 tCO2e', recovery: 'Copper stripping',
        description: 'Complete vehicle wiring harness connecting all modules. Tesla uses ~1.5 km of copper wire (reduced from 3 km via central compute architecture).',
        materialBreakdown: [{ mat: 'Copper conductors', pct: 55 }, { mat: 'PVC insulation', pct: 25 }, { mat: 'Connectors (brass)', pct: 10 }, { mat: 'Tape/Sheathing', pct: 7 }, { mat: 'Fuses/Relays', pct: 3 }] },
      { name: 'Suspension & Brakes', color: '#ef4444', weight: '95 kg', recyclability: 91, cost: '$2,200', material: 'Steel/Cast Iron', carbonFootprint: '1.4 tCO2e', recovery: 'Smelting/Remanufacture',
        description: 'Double wishbone front, multi-link rear. Ventilated disc brakes with regenerative braking recovering ~30% energy. Minimal brake pad wear.',
        materialBreakdown: [{ mat: 'Cast iron (rotors)', pct: 35 }, { mat: 'Forged steel (arms)', pct: 30 }, { mat: 'Aluminum (knuckles)', pct: 15 }, { mat: 'Rubber bushings', pct: 8 }, { mat: 'Brake pads (ceramic)', pct: 7 }, { mat: 'Springs/Dampers', pct: 5 }] },
    ]
  },
  'BMW i4': {
    type: 'Electric Gran Coupe', year: '2024', msrp: '$52,200', powertrain: 'Battery Electric (EV) / ICE Variants Available',
    get image() { return CAR_PHOTOS['BMW i4']; }, get thumbnail() { return CAR_PHOTOS['BMW i4']; },
    bodyColor: '#0f2027', accentColor: '#3b82f6',
    specs: { range: '301 mi', hp: '335 hp', accel: '5.5s 0-60', weight: '2,125 kg' },
    components: [
      { name: 'Battery Pack', color: '#6366f1', weight: '550 kg', recyclability: 90, cost: '$14,000', material: 'NCM811 Lithium-ion', carbonFootprint: '9.5 tCO2e', recovery: 'Hydrometallurgical',
        description: '83.9 kWh NCM811 prismatic cells from Samsung SDI. BMW targets 96% raw material recovery via closed-loop recycling with Duesenfeld process.',
        materialBreakdown: [{ mat: 'Nickel', pct: 30 }, { mat: 'Graphite', pct: 20 }, { mat: 'Manganese', pct: 10 }, { mat: 'Aluminum', pct: 15 }, { mat: 'Copper', pct: 10 }, { mat: 'Cobalt', pct: 5 }, { mat: 'Lithium', pct: 5 }, { mat: 'Electrolyte/Separator', pct: 5 }] },
      { name: 'Electric Motor', color: '#ec4899', weight: '36 kg', recyclability: 87, cost: '$3,200', material: 'Copper/Rare Earth', carbonFootprint: '1.3 tCO2e', recovery: 'Direct reuse/Rewind',
        description: 'BMW 5th-generation eDrive IPM motor with current-excited rotor (no permanent magnets in base model). Eliminates rare earth dependency.',
        materialBreakdown: [{ mat: 'Copper windings', pct: 38 }, { mat: 'Silicon steel', pct: 28 }, { mat: 'Aluminum housing', pct: 18 }, { mat: 'NdFeB magnets', pct: 5 }, { mat: 'Bearings', pct: 6 }, { mat: 'Insulation', pct: 5 }] },
      { name: 'Chassis Frame', color: '#f59e0b', weight: '320 kg', recyclability: 94, cost: '$5,200', material: 'CFRP/Aluminum', carbonFootprint: '4.2 tCO2e', recovery: 'Pyrolysis/Smelting',
        description: 'CLAR platform with carbon fiber reinforced plastic (CFRP) roof and B-pillar. Aluminum subframes. CFRP recycling via BMW-SGL joint pyrolysis facility.',
        materialBreakdown: [{ mat: 'Aluminum alloy', pct: 55 }, { mat: 'High-strength steel', pct: 25 }, { mat: 'CFRP composite', pct: 12 }, { mat: 'Adhesive/Rivets', pct: 5 }, { mat: 'Sealant', pct: 3 }] },
      { name: 'Body Panels', color: '#10b981', weight: '210 kg', recyclability: 88, cost: '$4,800', material: 'Steel/Aluminum', carbonFootprint: '2.8 tCO2e', recovery: 'Multi-material sorting',
        description: 'Hot-stamped boron steel A/B pillars (1,500 MPa), aluminum hood and fenders. Multi-material joining via flow-drill screws and structural adhesive.',
        materialBreakdown: [{ mat: 'Hot-stamped steel', pct: 40 }, { mat: 'Aluminum panels', pct: 35 }, { mat: 'Glass', pct: 12 }, { mat: 'Paint system', pct: 6 }, { mat: 'Adhesive', pct: 4 }, { mat: 'Plastic trim', pct: 3 }] },
      { name: 'Interior Cabin', color: '#8b5cf6', weight: '140 kg', recyclability: 58, cost: '$3,500', material: 'Leather/Alcantara', carbonFootprint: '1.8 tCO2e', recovery: 'Material separation',
        description: 'Merino leather seats, open-pore wood trim, iDrive 8 curved display. Complex multi-material assembly reduces recyclability.',
        materialBreakdown: [{ mat: 'Leather (bovine)', pct: 22 }, { mat: 'ABS/PP plastics', pct: 25 }, { mat: 'Steel seat frames', pct: 18 }, { mat: 'Foam (PU)', pct: 12 }, { mat: 'Alcantara (polyester)', pct: 8 }, { mat: 'Glass displays', pct: 8 }, { mat: 'Wood trim', pct: 4 }, { mat: 'Wiring', pct: 3 }] },
      { name: 'Power Electronics', color: '#06b6d4', weight: '22 kg', recyclability: 76, cost: '$2,200', material: 'SiC/Copper/PCB', carbonFootprint: '1.0 tCO2e', recovery: 'E-waste processing',
        description: 'Integrated power module with SiC MOSFETs for higher switching efficiency. Combined inverter-charger unit reduces weight by 25%.',
        materialBreakdown: [{ mat: 'Copper', pct: 32 }, { mat: 'PCB/FR4', pct: 20 }, { mat: 'SiC chips', pct: 12 }, { mat: 'Aluminum heat spreader', pct: 18 }, { mat: 'Plastic housing', pct: 10 }, { mat: 'Solder', pct: 5 }, { mat: 'Capacitors', pct: 3 }] },
      { name: 'Thermal System', color: '#f97316', weight: '28 kg', recyclability: 74, cost: '$1,400', material: 'Aluminum/Glycol', carbonFootprint: '0.7 tCO2e', recovery: 'Drain/Melt',
        description: 'Direct-refrigerant battery cooling with glycol-water secondary loop. Heat pump for cabin with COP of 3.5.',
        materialBreakdown: [{ mat: 'Aluminum', pct: 42 }, { mat: 'Rubber hoses', pct: 15 }, { mat: 'Glycol coolant', pct: 15 }, { mat: 'Copper tubes', pct: 15 }, { mat: 'R1234yf', pct: 8 }, { mat: 'Sensors', pct: 5 }] },
      { name: 'Wheels & Tires', color: '#64748b', weight: '95 kg', recyclability: 72, cost: '$3,000', material: 'Forged Aluminum/Rubber', carbonFootprint: '1.1 tCO2e', recovery: 'Devulcanization/Melt',
        description: '19" Styling 860M aerodynamic wheels. Bridgestone Turanza EV tires with EV-specific compound for lower rolling resistance and higher load capacity.',
        materialBreakdown: [{ mat: 'Forged aluminum', pct: 35 }, { mat: 'Synthetic rubber', pct: 30 }, { mat: 'Carbon black', pct: 12 }, { mat: 'Steel belts', pct: 12 }, { mat: 'Silica', pct: 6 }, { mat: 'Nylon cord', pct: 5 }] },
      { name: 'Wiring Harness', color: '#a855f7', weight: '48 kg', recyclability: 65, cost: '$1,800', material: 'Copper/PVC/CAN bus', carbonFootprint: '0.8 tCO2e', recovery: 'Copper stripping',
        description: '~2.1 km of copper wiring connecting 80+ ECUs. BMW Zone Architecture reduces harness complexity vs conventional topology.',
        materialBreakdown: [{ mat: 'Copper', pct: 50 }, { mat: 'PVC/XLPE insulation', pct: 25 }, { mat: 'Connectors', pct: 12 }, { mat: 'Tape/Sheathing', pct: 8 }, { mat: 'Fuse box', pct: 5 }] },
    ]
  },
  'Toyota Camry Hybrid': {
    type: 'Hybrid Sedan', year: '2024', msrp: '$28,855', powertrain: 'Hybrid Electric (HEV)',
    get image() { return CAR_PHOTOS['Toyota Camry Hybrid']; }, get thumbnail() { return CAR_PHOTOS['Toyota Camry Hybrid']; },
    bodyColor: '#2d3436', accentColor: '#00b894',
    specs: { range: '686 mi', hp: '225 hp', accel: '7.2s 0-60', weight: '1,665 kg' },
    components: [
      { name: 'Battery Pack', color: '#6366f1', weight: '45 kg', recyclability: 85, cost: '$3,500', material: 'Nickel-Metal Hydride', carbonFootprint: '2.1 tCO2e', recovery: 'Pyrometallurgical', description: 'Compact NiMH battery. Toyota achieves 99% nickel recovery.' },
      { name: 'Electric Motor', color: '#ec4899', weight: '15 kg', recyclability: 86, cost: '$1,800', material: 'Copper/Magnets', carbonFootprint: '0.6 tCO2e', recovery: 'Rewind/Reclaim', description: 'Dual motor-generator set in the transaxle.' },
      { name: 'Chassis Frame', color: '#f59e0b', weight: '310 kg', recyclability: 96, cost: '$3,800', material: 'High-Strength Steel', carbonFootprint: '3.2 tCO2e', recovery: 'Smelting/Rolling', description: 'TNGA-K platform. Excellent recyclability.' },
      { name: 'Body Panels', color: '#10b981', weight: '165 kg', recyclability: 92, cost: '$2,800', material: 'Steel/Aluminum', carbonFootprint: '1.9 tCO2e', recovery: 'Shredding/Sorting', description: 'Mostly steel panels. Easy magnetic separation.' },
      { name: 'Interior Cabin', color: '#8b5cf6', weight: '105 kg', recyclability: 55, cost: '$1,900', material: 'Plastics/Fabric', carbonFootprint: '1.2 tCO2e', recovery: 'Material separation', description: 'Eco-friendly fabric and recycled plastics.' },
      { name: 'Power Electronics', color: '#06b6d4', weight: '40 kg', recyclability: 82, cost: '$2,500', material: 'Steel/Aluminum', carbonFootprint: '0.9 tCO2e', recovery: 'Remanufacture', description: 'Planetary gear eCVT integrating motors and engine.' },
      { name: 'Thermal System', color: '#f97316', weight: '22 kg', recyclability: 88, cost: '$800', material: 'Stainless Steel/Platinum', carbonFootprint: '0.5 tCO2e', recovery: 'PGM recovery', description: 'Catalytic converter with platinum group metals.' },
      { name: 'Wheels & Tires', color: '#64748b', weight: '80 kg', recyclability: 70, cost: '$1,600', material: 'Aluminum/Rubber', carbonFootprint: '0.7 tCO2e', recovery: 'Devulcanization/Melt', description: 'Standard alloy wheels with all-season tires.' },
    ]
  },
  'Ford F-150 Lightning': {
    type: 'Electric Pickup', year: '2024', msrp: '$49,995', powertrain: 'Battery Electric (EV) / ICE Variants Available',
    get image() { return CAR_PHOTOS['Ford F-150 Lightning']; }, get thumbnail() { return CAR_PHOTOS['Ford F-150 Lightning']; },
    bodyColor: '#1e3a5f', accentColor: '#0ea5e9',
    specs: { range: '320 mi', hp: '580 hp', accel: '4.0s 0-60', weight: '2,948 kg' },
    components: [
      { name: 'Battery Pack', color: '#6366f1', weight: '816 kg', recyclability: 91, cost: '$18,000', material: 'LFP/NMC', carbonFootprint: '12.5 tCO2e', recovery: 'Hydrometallurgical', description: 'Extended range 131 kWh pack integrated into frame.' },
      { name: 'Electric Motor', color: '#ec4899', weight: '65 kg', recyclability: 88, cost: '$5,200', material: 'Copper/Magnets', carbonFootprint: '2.0 tCO2e', recovery: 'Direct reuse/Rewind', description: 'Front and rear inboard motors with AWD.' },
      { name: 'Chassis Frame', color: '#f59e0b', weight: '520 kg', recyclability: 97, cost: '$6,800', material: 'High-Strength Steel', carbonFootprint: '5.8 tCO2e', recovery: 'Smelting/Rolling', description: 'Fully boxed steel frame with aluminum body.' },
      { name: 'Body Panels', color: '#10b981', weight: '340 kg', recyclability: 90, cost: '$5,500', material: 'Aluminum/Composite', carbonFootprint: '3.5 tCO2e', recovery: 'Shredding/Sorting', description: 'All-aluminum body panels with Mega Power Frunk.' },
      { name: 'Interior Cabin', color: '#8b5cf6', weight: '160 kg', recyclability: 58, cost: '$3,800', material: 'Plastics/Leather', carbonFootprint: '2.0 tCO2e', recovery: 'Material separation', description: 'Work-oriented interior with fold-flat workspace.' },
      { name: 'Power Electronics', color: '#06b6d4', weight: '28 kg', recyclability: 76, cost: '$2,800', material: 'Silicon/Copper', carbonFootprint: '1.2 tCO2e', recovery: 'E-waste processing', description: 'Dual onboard chargers and power management.' },
      { name: 'Thermal System', color: '#f97316', weight: '35 kg', recyclability: 70, cost: '$2,200', material: 'Inverter/Wiring', carbonFootprint: '0.8 tCO2e', recovery: 'Copper recovery', description: '9.6 kW onboard power generation.' },
      { name: 'Wheels & Tires', color: '#64748b', weight: '145 kg', recyclability: 93, cost: '$3,500', material: 'Steel/Aluminum', carbonFootprint: '1.6 tCO2e', recovery: 'Smelting', description: 'Heavy duty suspension tuned for payload.' },
    ]
  },
  'Lamborghini Urus': {
    type: 'Super SUV', year: '2024', msrp: '$229,495', powertrain: 'Internal Combustion Engine (Petrol)',
    get image() { return CAR_PHOTOS['Lamborghini Urus']; }, get thumbnail() { return CAR_PHOTOS['Lamborghini Urus']; },
    bodyColor: '#0a0a0a', accentColor: '#eab308',
    specs: { range: '381 mi', hp: '657 hp', accel: '3.3s 0-60', weight: '2,150 kg' },
    components: [
      { name: 'Twin-Turbo V8', color: '#ef4444', weight: '250 kg', recyclability: 88, cost: '$28,000', material: 'Aluminum/Steel/Titanium', carbonFootprint: '6.5 tCO2e', recovery: 'Remanufacture/Melt', description: '4.0L twin-turbo V8. High-value remanufacturing potential.' },
      { name: 'Electric Motor', color: '#ec4899', weight: '95 kg', recyclability: 84, cost: '$8,500', material: 'Steel/Aluminum/Clutch', carbonFootprint: '2.2 tCO2e', recovery: 'Remanufacture', description: 'ZF 8-speed torque converter auto.' },
      { name: 'Body Panels', color: '#10b981', weight: '220 kg', recyclability: 45, cost: '$35,000', material: 'CFRP/Aluminum', carbonFootprint: '8.0 tCO2e', recovery: 'Pyrolysis/Mechanical', description: 'Carbon fiber panels. Recycling requires pyrolysis.' },
      { name: 'Chassis Frame', color: '#f59e0b', weight: '480 kg', recyclability: 94, cost: '$12,000', material: 'Hot-Stamped Steel/Aluminum', carbonFootprint: '5.5 tCO2e', recovery: 'Smelting', description: 'VW Group MLB Evo platform.' },
      { name: 'Interior Cabin', color: '#8b5cf6', weight: '185 kg', recyclability: 38, cost: '$15,000', material: 'Leather/Alcantara/Carbon', carbonFootprint: '3.2 tCO2e', recovery: 'Manual disassembly', description: 'Full leather and carbon trim. Low recyclability.' },
      { name: 'Power Electronics', color: '#06b6d4', weight: '110 kg', recyclability: 91, cost: '$6,500', material: 'Steel/Aluminum', carbonFootprint: '2.0 tCO2e', recovery: 'Remanufacture/Melt', description: 'Torsen center diff with rear torque vectoring.' },
      { name: 'Thermal System', color: '#f97316', weight: '42 kg', recyclability: 86, cost: '$4,200', material: 'Titanium/Inconel', carbonFootprint: '1.5 tCO2e', recovery: 'PGM + Ti recovery', description: 'Titanium sport exhaust. Valuable metals.' },
      { name: 'Wheels & Tires', color: '#64748b', weight: '120 kg', recyclability: 78, cost: '$12,000', material: 'Carbon Ceramic/Forged Al', carbonFootprint: '2.8 tCO2e', recovery: 'Specialized recycling', description: 'Carbon ceramic brakes and 23" forged wheels.' },
    ]
  },
  'Ferrari 458 Italia': {
    type: 'Supercar', year: '2015', msrp: '$239,340', powertrain: 'Internal Combustion Engine (Petrol)',
    get image() { return CAR_PHOTOS['Ferrari 458 Italia']; }, get thumbnail() { return CAR_PHOTOS['Ferrari 458 Italia']; },
    bodyColor: '#ef4444', accentColor: '#facc15',
    specs: { range: '— mi', hp: '562 hp', accel: '3.3s 0-60', weight: '1,565 kg' },
    components: [
      { name: 'V8 Engine', color: '#ef4444', weight: '210 kg', recyclability: 88, cost: '$35,000', material: 'Aluminum/Steel', carbonFootprint: '5.2 tCO2e', recovery: 'Remanufacture/Melt', description: '4.5L naturally aspirated V8. High-value remanufacturing potential.' },
      { name: 'Transmission', color: '#ec4899', weight: '120 kg', recyclability: 82, cost: '$12,500', material: 'Steel/Aluminum', carbonFootprint: '2.5 tCO2e', recovery: 'Remanufacture', description: '7-speed dual-clutch transmission.' },
      { name: 'Body Panels', color: '#10b981', weight: '180 kg', recyclability: 85, cost: '$25,000', material: 'Aluminum', carbonFootprint: '4.0 tCO2e', recovery: 'Smelting', description: 'Superplastic-formed aluminum body panels.' },
      { name: 'Chassis Frame', color: '#f59e0b', weight: '320 kg', recyclability: 94, cost: '$18,000', material: 'Aluminum', carbonFootprint: '6.5 tCO2e', recovery: 'Smelting', description: 'Extruded aluminum chassis.' },
      { name: 'Interior Cabin', color: '#8b5cf6', weight: '150 kg', recyclability: 45, cost: '$12,000', material: 'Leather/Carbon', carbonFootprint: '2.8 tCO2e', recovery: 'Manual disassembly', description: 'Hand-stitched leather and carbon fiber trim.' },
      { name: 'Power Electronics', color: '#06b6d4', weight: '45 kg', recyclability: 85, cost: '$4,500', material: 'PCB/Copper/Steel', carbonFootprint: '1.2 tCO2e', recovery: 'E-waste processing', description: 'Engine management and vehicle dynamics ECUs.' },
      { name: 'Thermal System', color: '#f97316', weight: '35 kg', recyclability: 80, cost: '$3,200', material: 'Aluminum/Stainless Steel', carbonFootprint: '1.0 tCO2e', recovery: 'PGM recovery', description: 'High-performance cooling and exhaust system.' },
      { name: 'Wheels & Tires', color: '#64748b', weight: '110 kg', recyclability: 75, cost: '$8,000', material: 'Forged Al/Rubber', carbonFootprint: '2.0 tCO2e', recovery: 'Devulcanization/Melt', description: '20" forged alloy wheels with performance tires.' },
    ]
  },
};

// ── High-quality procedural car with physical materials ──

function Wheel({ position, spinning }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current && spinning) ref.current.rotation.x = state.clock.elapsedTime * Math.PI;
  });
  return (
    <group position={position} ref={ref}>
      {/* Tire */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.18, 0.07, 24, 48]} />
        <meshStandardMaterial color="#111111" roughness={0.95} />
      </mesh>
      {/* Rim */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.09, 32]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={1.0} roughness={0.15} clearcoat={0.5} />
      </mesh>
      {/* Spokes */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <mesh key={i} rotation={[0, 0, Math.PI / 2 + (i * Math.PI * 2) / 6]}>
          <boxGeometry args={[0.015, 0.11, 0.22]} />
          <meshPhysicalMaterial color="#e4e4e7" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Brake disc */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

function CarBody({ bodyColor, accentColor, isExploded, selectedPart, onSelectPart }) {
  const groupRef = useRef();
  const explode = isExploded ? 0.4 : 0;
  const op = (partName) => selectedPart && selectedPart !== partName ? 0.15 : 1;

  // Main body profile (sedan shape)
  const bodyShape = useMemo(() => {
    const s = new THREE.Shape();
    // Lower body
    s.moveTo(-1.2, 0); s.lineTo(1.2, 0); s.lineTo(1.25, 0.08);
    // Front slope
    s.quadraticCurveTo(1.15, 0.22, 1.0, 0.25);
    // Hood to windshield
    s.lineTo(0.5, 0.28); s.quadraticCurveTo(0.4, 0.32, 0.35, 0.52);
    // Roof
    s.lineTo(-0.2, 0.55); s.quadraticCurveTo(-0.35, 0.55, -0.45, 0.5);
    // Rear window
    s.lineTo(-0.7, 0.35); s.quadraticCurveTo(-0.85, 0.28, -0.95, 0.25);
    // Rear
    s.lineTo(-1.15, 0.2); s.quadraticCurveTo(-1.25, 0.12, -1.2, 0);
    return s;
  }, []);

  return (
    <group ref={groupRef}>
      {/* ─── Body Shell ─── */}
      <group position={[0, explode * 0.3, 0]} onClick={(e) => { e.stopPropagation(); onSelectPart('Body Panels'); }}>
        <mesh position={[0, 0.12, -0.38]} castShadow>
          <extrudeGeometry args={[bodyShape, { depth: 0.76, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 12 }]} />
          <meshPhysicalMaterial
            color={bodyColor} metalness={1.0} roughness={0.4}
            clearcoat={1.0} clearcoatRoughness={0.02}
            transparent opacity={op('Body Panels')}
            envMapIntensity={1.5}
          />
        </mesh>
        {/* Hood detail line */}
        <mesh position={[0.8, 0.35, 0]} castShadow>
          <boxGeometry args={[0.6, 0.005, 0.7]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1.0} roughness={0.3} clearcoat={1.0} transparent opacity={op('Body Panels')} />
        </mesh>
      </group>

      {/* ─── Windshield & Windows (glass) ─── */}
      <group position={[0, explode * 1.2, 0]} onClick={(e) => { e.stopPropagation(); onSelectPart('Interior Cabin'); }}>
        {/* Windshield */}
        <mesh position={[0.38, 0.5, 0]} rotation={[0, 0, -0.35]} castShadow>
          <boxGeometry args={[0.35, 0.005, 0.6]} />
          <meshPhysicalMaterial color="#aaddff" metalness={0.1} roughness={0} transmission={0.9} thickness={0.5} ior={1.5} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
        {/* Roof glass */}
        <mesh position={[0.05, 0.56, 0]}>
          <boxGeometry args={[0.5, 0.005, 0.55]} />
          <meshPhysicalMaterial color="#88bbee" metalness={0.1} roughness={0} transmission={0.85} thickness={0.3} transparent opacity={op('Interior Cabin') * 0.5} />
        </mesh>
        {/* Rear window */}
        <mesh position={[-0.45, 0.48, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.3, 0.005, 0.55]} />
          <meshPhysicalMaterial color="#aaddff" metalness={0.1} roughness={0} transmission={0.9} thickness={0.5} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
      </group>

      {/* ─── Chassis/Underbody ─── */}
      <group position={[0, -explode * 0.2, 0]} onClick={(e) => { e.stopPropagation(); onSelectPart('Chassis Frame'); }}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[2.5, 0.05, 0.75]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} transparent opacity={op('Chassis Frame')} />
        </mesh>
        {/* Side skirts */}
        <mesh position={[0, 0.08, 0.38]} castShadow>
          <boxGeometry args={[2.0, 0.04, 0.02]} />
          <meshPhysicalMaterial color="#222" metalness={0.9} roughness={0.2} transparent opacity={op('Chassis Frame')} />
        </mesh>
        <mesh position={[0, 0.08, -0.38]} castShadow>
          <boxGeometry args={[2.0, 0.04, 0.02]} />
          <meshPhysicalMaterial color="#222" metalness={0.9} roughness={0.2} transparent opacity={op('Chassis Frame')} />
        </mesh>
      </group>

      {/* ─── Battery Pack ─── */}
      <group position={[0, -explode * 1.0 - 0.02, 0]} onClick={(e) => { e.stopPropagation(); onSelectPart('Battery Pack'); }}>
        <RoundedBox args={[1.8, 0.1, 0.65]} radius={0.02} position={[0, -0.02, 0]} castShadow>
          <meshPhysicalMaterial color="#6366f1" metalness={0.6} roughness={0.25} clearcoat={0.4} transparent opacity={op('Battery Pack')} />
        </RoundedBox>
        {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
          <mesh key={i} position={[x, -0.02, 0]}>
            <boxGeometry args={[0.015, 0.11, 0.66]} />
            <meshStandardMaterial color="#4338ca" transparent opacity={op('Battery Pack') * 0.5} />
          </mesh>
        ))}
      </group>

      {/* ─── Electric Motor ─── */}
      <group position={[-0.9 - explode * 1.2, 0.12 + explode * 0.4, 0]} onClick={(e) => { e.stopPropagation(); onSelectPart('Electric Motor'); }}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.28, 32]} />
          <meshPhysicalMaterial color="#ec4899" metalness={0.8} roughness={0.25} clearcoat={0.6} transparent opacity={op('Electric Motor')} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 32]} />
          <meshStandardMaterial color="#be185d" metalness={0.9} roughness={0.15} transparent opacity={op('Electric Motor')} />
        </mesh>
        {/* Shaft */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 12]} />
          <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} transparent opacity={op('Electric Motor')} />
        </mesh>
      </group>

      {/* ─── Power Electronics ─── */}
      <group position={[0.85 + explode * 1.0, 0.2 + explode * 0.6, 0.2]} onClick={(e) => { e.stopPropagation(); onSelectPart('Power Electronics'); }}>
        <RoundedBox args={[0.22, 0.08, 0.16]} radius={0.01} castShadow>
          <meshPhysicalMaterial color="#06b6d4" metalness={0.6} roughness={0.3} clearcoat={0.3} transparent opacity={op('Power Electronics')} />
        </RoundedBox>
        {/* Heat fins */}
        {[-0.05, 0, 0.05].map((z, i) => (
          <mesh key={i} position={[0, 0.045, z]}>
            <boxGeometry args={[0.2, 0.01, 0.01]} />
            <meshStandardMaterial color="#0891b2" metalness={0.7} transparent opacity={op('Power Electronics')} />
          </mesh>
        ))}
      </group>

      {/* ─── Thermal System (Radiator) ─── */}
      <group position={[1.15 + explode * 0.8, 0.2 + explode * 0.2, 0]} onClick={(e) => { e.stopPropagation(); onSelectPart('Thermal System'); }}>
        <mesh castShadow>
          <boxGeometry args={[0.03, 0.25, 0.5]} />
          <meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.3} transparent opacity={op('Thermal System')} />
        </mesh>
        {[-0.1, -0.05, 0, 0.05, 0.1].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[0.025, 0.006, 0.48]} />
            <meshStandardMaterial color="#ea580c" metalness={0.6} transparent opacity={op('Thermal System')} />
          </mesh>
        ))}
        {/* Hoses */}
        <mesh position={[-0.03, 0.12, 0.22]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.012, 0.012, 0.15, 12]} />
          <meshStandardMaterial color="#333" roughness={0.8} transparent opacity={op('Thermal System')} />
        </mesh>
      </group>

      {/* ─── Wheels ─── */}
      <group onClick={(e) => { e.stopPropagation(); onSelectPart('Wheels & Tires'); }}>
        <Wheel position={[0.75, 0.05, 0.42]} spinning={!isExploded} />
        <Wheel position={[0.75, 0.05, -0.42]} spinning={!isExploded} />
        <Wheel position={[-0.75, 0.05, 0.42]} spinning={!isExploded} />
        <Wheel position={[-0.75, 0.05, -0.42]} spinning={!isExploded} />
      </group>

      {/* ─── Headlights ─── */}
      <mesh position={[1.2, 0.22, 0.25]}><sphereGeometry args={[0.04, 16, 16]} /><meshStandardMaterial color="#fff" emissive="#ffffcc" emissiveIntensity={1.5} /></mesh>
      <mesh position={[1.2, 0.22, -0.25]}><sphereGeometry args={[0.04, 16, 16]} /><meshStandardMaterial color="#fff" emissive="#ffffcc" emissiveIntensity={1.5} /></mesh>
      {/* DRL strip */}
      <mesh position={[1.22, 0.2, 0]}>
        <boxGeometry args={[0.01, 0.015, 0.4]} />
        <meshStandardMaterial color={accentColor || '#fff'} emissive={accentColor || '#fff'} emissiveIntensity={0.8} />
      </mesh>

      {/* ─── Tail lights ─── */}
      <mesh position={[-1.2, 0.22, 0.28]}><boxGeometry args={[0.02, 0.04, 0.08]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.0} /></mesh>
      <mesh position={[-1.2, 0.22, -0.28]}><boxGeometry args={[0.02, 0.04, 0.08]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.0} /></mesh>
      {/* Tail light bar */}
      <mesh position={[-1.22, 0.22, 0]}>
        <boxGeometry args={[0.008, 0.02, 0.5]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff2222" emissiveIntensity={0.5} />
      </mesh>

      {/* ─── Mirrors ─── */}
      <mesh position={[0.35, 0.38, 0.4]} castShadow>
        <boxGeometry args={[0.06, 0.035, 0.03]} />
        <meshPhysicalMaterial color={bodyColor} metalness={1.0} roughness={0.4} clearcoat={1.0} />
      </mesh>
      <mesh position={[0.35, 0.38, -0.4]} castShadow>
        <boxGeometry args={[0.06, 0.035, 0.03]} />
        <meshPhysicalMaterial color={bodyColor} metalness={1.0} roughness={0.4} clearcoat={1.0} />
      </mesh>
    </group>
  );
}

// Animated grid floor
function FloorGrid() {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) ref.current.position.z = -(state.clock.elapsedTime * 0.3) % 1;
  });
  return (
    <group ref={ref}>
      <gridHelper args={[30, 60, '#555577', '#3a3a55']} position={[0, 0, 0]} />
    </group>
  );
}

function CarScene({ carData, isExploded, selectedPart, onSelectPart }) {
  return (
    <Canvas
      camera={{ position: [3.5, 2.0, 3.5], fov: 36 }}
      shadows
      style={{ background: 'transparent' }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
        powerPreference: 'high-performance',
      }}
    >
      <color attach="background" args={['#111122']} />
      <fog attach="fog" args={['#111122', 10, 22]} />

      <Suspense fallback={null}>
        {/* Environment map for realistic metallic reflections */}
        <Environment preset="city" />

        {/* Key light - bright warm from top-right */}
        <spotLight position={[5, 10, 5]} intensity={6} angle={0.35} penumbra={0.5} castShadow shadow-mapSize={2048} color="#fff5e6" />
        {/* Fill light - cool blue from left */}
        <spotLight position={[-6, 8, -4]} intensity={3} angle={0.45} penumbra={0.6} color="#c8d8f0" />
        {/* Rim / back light */}
        <spotLight position={[-3, 4, -6]} intensity={2.5} angle={0.5} penumbra={0.8} color="#eeddff" />
        {/* Under-car accent glow */}
        <pointLight position={[0, 0.1, 0]} intensity={1.5} color={carData.accentColor} distance={4} />
        {/* Front fill */}
        <pointLight position={[3, 1, 2]} intensity={1.5} color="#ffffff" />
        {/* Strong ambient fill */}
        <ambientLight intensity={0.8} />
        <hemisphereLight args={['#b0c8f0', '#443322', 0.7]} />

        <OrbitControls
          enablePan={false}
          enableZoom
          enableRotate
          maxDistance={8}
          minDistance={2}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0.3, 0]}
          autoRotate={!selectedPart && !isExploded}
          autoRotateSpeed={0.5}
        />

        {/* 3D Car */}
        <RealisticCar3D
          bodyColor={carData.bodyColor}
          accentColor={carData.accentColor}
          isExploded={isExploded}
          selectedPart={selectedPart}
          onSelectPart={onSelectPart}
        />

        {/* Ground plane - subtle reflective */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#181828" metalness={0.5} roughness={0.5} />
        </mesh>

        <FloorGrid />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={12} blur={2.5} far={3} />
      </Suspense>
    </Canvas>
  );
}

export default function CarStudio() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCar, setSelectedCar] = useState('Ferrari 458 Italia');
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isExploded, setIsExploded] = useState(false);
  const [dynamicCars, setDynamicCars] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Fetch real images from Wikimedia when car changes
  useEffect(() => {
    if (!selectedCar) return;
    setLoadingImages(true);
    setGalleryImages([]);
    searchCarImages(selectedCar, 8)
      .then(imgs => setGalleryImages(imgs))
      .catch(() => setGalleryImages([]))
      .finally(() => setLoadingImages(false));
  }, [selectedCar]);

  const allCars = { ...CAR_DATABASE, ...dynamicCars };
  const carNames = Object.keys(allCars);
  const filteredCars = carNames.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelectCar = (carName) => { setSelectedCar(carName); setSelectedComponent(null); setIsExploded(false); };

  const handleAgenticSearch = async (query) => {
    if (!query.trim()) return;
    // If already in local DB, just select it
    const localMatch = carNames.find(n => n.toLowerCase().includes(query.toLowerCase()));
    if (localMatch) { handleSelectCar(localMatch); return; }
    // Otherwise, call LLM to fetch data
    setIsSearching(true);
    setSearchStatus('🔍 AI Agent searching for vehicle data...');
    try {
      await streamVehicleSearch(query, (event) => {
        if (event.type === 'status') setSearchStatus(`✨ ${event.text}`);
        if (event.type === 'vehicle' && event.data) {
          const v = event.data;
          // Add generated images if not present
          if (!v.image) v.image = carSvg(v.accentColor || '#10b981');
          if (!v.thumbnail) v.thumbnail = carThumb(v.accentColor || '#10b981');
          const name = v.name || query;
          setDynamicCars(prev => ({ ...prev, [name]: v }));
          setSearchStatus(`✅ Found: ${name}`);
          setTimeout(() => handleSelectCar(name), 300);
        }
        if (event.type === 'error') setSearchStatus(`❌ ${event.text}`);
      });
    } catch (err) {
      setSearchStatus('❌ Search failed — is the backend running?');
    } finally {
      setTimeout(() => { setIsSearching(false); setSearchStatus(''); }, 2000);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const localMatch = filteredCars[0];
    if (localMatch) { handleSelectCar(localMatch); }
    else { handleAgenticSearch(searchQuery); }
  };
  const handleSelectPart = (partName) => {
    const car = allCars[selectedCar];
    if (!car) return;
    const comp = car.components.find(c => c.name === partName || c.name.includes(partName.split(' ')[0]));
    if (comp) setSelectedComponent(comp);
  };
  const resetView = () => { setSelectedComponent(null); setIsExploded(false); };

  const carData = selectedCar ? allCars[selectedCar] : null;
  const totalRecyclability = carData ? Math.round(carData.components.reduce((s, c) => s + c.recyclability, 0) / carData.components.length) : 0;

  return (
    <div className="h-screen bg-[#f5f0e8] text-gray-800 flex flex-col overflow-hidden" style={{ fontFamily: "'Georgia', serif" }}>
      <header className="bg-[#f5f0e8] border-b border-[#d4c5a9] px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md">
            <Recycle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide flex items-center">Vehicle Architecture Studio<InfoIcon tooltip={INFO.studio} /></h1>
            <p className="text-[10px] text-gray-500 italic">Explore recyclability at the component level ✦</p>
          </div>
        </div>
        <nav className="flex items-center gap-5 text-xs text-gray-500">
          {['⊞ Gallery', '☰ Library', '📓 Reports', '⚙ Settings'].map(i => (
            <button key={i} className="hover:text-gray-800 transition-colors">{i}</button>
          ))}
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 bg-[#f5f0e8] border-r border-[#d4c5a9] flex flex-col overflow-hidden shrink-0">
          <div className="p-3 pb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">✦ Vehicles</h2>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search car model..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white/70 border border-[#d4c5a9] rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
            </form>
          </div>
          {isSearching && (
            <div className="mx-3 mb-2 flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span className="text-[10px] text-emerald-700">{searchStatus}</span>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
            {filteredCars.map((carName) => {
              const car = allCars[carName];
              return (
                <div key={carName} onClick={() => handleSelectCar(carName)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${selectedCar === carName ? 'bg-white border border-emerald-200 shadow-sm' : 'hover:bg-white/60'}`}>
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                    <img src={car.thumbnail} alt={carName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = '🚗'; }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{carName}</p>
                    <p className="text-[10px] text-gray-500">{car.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {carData && (
            <div className="border-t border-[#d4c5a9] p-3 overflow-y-auto max-h-[40%]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">✦ Components</h3>
              <div className="space-y-0.5">
                {carData.components.map((comp) => (
                  <div key={comp.name} onClick={() => setSelectedComponent(comp)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-xs transition-all ${selectedComponent?.name === comp.name ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-white/50'}`}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: comp.color }} />
                    <span className="flex-1 truncate">{comp.name}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">{comp.recyclability}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedCar ? (
            <>
              <div className="flex-1 relative">
                <div className="absolute top-0 left-0 right-0 h-52 overflow-hidden z-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/30 to-[#f5f0e8] z-10" />
                  <img src={carData.image} alt={selectedCar} className="w-full h-full object-cover object-center" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="relative z-10 px-6 pt-4">
                  <h2 className="text-3xl font-bold text-white drop-shadow-lg">{selectedCar}</h2>
                  <p className="text-sm text-white/80 italic drop-shadow">{carData.type} • {carData.year} • <span className="font-semibold">{carData.msrp}</span></p>
                  <div className="flex gap-2 mt-2 items-center">
                    {Object.entries(carData.specs).map(([k, v]) => (
                      <span key={k} className="bg-white/20 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full border border-white/20">{v}</span>
                    ))}
                  </div>
                </div>
                <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-sm border border-[#d4c5a9] rounded-xl p-1.5 flex flex-col gap-1">
                  <button onClick={() => setIsExploded(false)} className={`px-3 py-1.5 rounded-lg text-xs ${!isExploded ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Assembled</button>
                  <button onClick={() => setIsExploded(true)} className={`px-3 py-1.5 rounded-lg text-xs ${isExploded ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Exploded</button>
                  <div className="px-2 pt-1"><InfoIcon tooltip={INFO.exploded} /></div>
                </div>
                <div className="absolute top-36 left-0 right-0 bottom-0 z-10">
                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>}>
                    <CarScene carData={carData} isExploded={isExploded} selectedPart={selectedComponent?.name} onSelectPart={handleSelectPart} />
                  </Suspense>
                </div>
                <div className="absolute top-40 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-gray-500 z-20 leading-relaxed shadow-sm">
                  🖱️ Drag to rotate · 🔍 Scroll zoom · 👆 Click part
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-[#d4c5a9] shadow-md">
                  {[
                    { icon: RotateCcw, label: 'Reset', fn: resetView },
                    { icon: Eye, label: isExploded ? 'Assemble' : 'Explode', fn: () => setIsExploded(!isExploded) },
                    { icon: Camera, label: 'Screenshot', fn: () => {} },
                    { icon: Download, label: 'Export', fn: () => {} },
                  ].map(({ icon: I, label, fn }) => (
                    <button key={label} onClick={fn} className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100">
                      <I className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="shrink-0 px-4 pb-3 grid grid-cols-3 gap-3 border-t border-[#d4c5a9] bg-[#f5f0e8] pt-3">
                <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Real Car Photos
                    {loadingImages && <Loader2 className="w-3 h-3 animate-spin text-emerald-500 ml-1" />}
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {/* Show real fetched images */}
                    {galleryImages.length > 0 ? (
                      galleryImages.slice(0, 6).map((img, i) => (
                        <div key={i} onClick={() => setLightboxImg(img)} className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 ring-emerald-400 shrink-0" title={img.title}>
                          <img src={img.thumb} alt={img.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                        </div>
                      ))
                    ) : (
                      /* Fallback to other car thumbnails */
                      carNames.filter(n => n !== selectedCar).slice(0, 3).map(name => (
                        <div key={name} onClick={() => handleSelectCar(name)} className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 ring-emerald-400 shrink-0">
                          <img src={allCars[name].thumbnail} alt={name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">Overall Recyclability<InfoIcon tooltip={INFO.recyclability} /></h4>
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${totalRecyclability}, 100`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{totalRecyclability}%</div>
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      {carData.components.slice(0, 4).map(c => (
                        <div key={c.name} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-[10px] truncate flex-1">{c.name}</span>
                          <span className="text-[10px] font-bold">{c.recyclability}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3 border border-[#d4c5a9]">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center">Compare Vehicles<InfoIcon tooltip={INFO.compare} /></h4>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 flex-1 min-w-0">
                      <span className="text-sm">🚗</span><span className="text-[10px] font-semibold truncate">{selectedCar}</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">vs</div>
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 flex-1 min-w-0">
                      <span className="text-sm">🚗</span><span className="text-[10px] font-semibold truncate">{carNames.find(c => c !== selectedCar)}</span>
                    </div>
                  </div>
                  <button onClick={() => setShowCompareModal(true)} className="mt-2 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium">Open Comparison ›</button>
                </div>
              </div>
              {/* ── Image Lightbox ── */}
              {lightboxImg && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightboxImg(null)}>
                  <div className="relative max-w-4xl max-h-[85vh] p-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setLightboxImg(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-gray-100"><X className="w-4 h-4" /></button>
                    <img src={lightboxImg.url || lightboxImg.thumb} alt={lightboxImg.title} className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" />
                    <p className="text-white/80 text-xs text-center mt-2 italic">{lightboxImg.title}</p>
                    <a href={lightboxImg.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 justify-center mt-1 text-emerald-400 text-[10px] hover:text-emerald-300"><ExternalLink className="w-3 h-3" /> Open full resolution</a>
                  </div>
                </div>
              )}
              {/* ── Compare Modal ── */}
              <AnimatePresence>
                {showCompareModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowCompareModal(false)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col"
                      onClick={e => e.stopPropagation()}>
                      
                      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 p-5 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-500" /> Vehicle Circularity Comparison</h2>
                        <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
                      </div>

                      <div className="p-6 bg-gray-50/50">
                        <div className="grid grid-cols-3 gap-6">
                          {/* Headers */}
                          <div className="space-y-6 pt-20">
                            <div className="h-10 text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">Overall Recyclability</div>
                            <div className="h-10 text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">Carbon Footprint</div>
                            <div className="h-10 text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">Battery Chemistry</div>
                            <div className="h-10 text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">Est. Recovery Value</div>
                            <div className="h-10 text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">Major Components</div>
                          </div>
                          
                          {/* Vehicle 1 */}
                          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-[0_8px_30px_rgb(16,185,129,0.1)] relative overflow-hidden group hover:shadow-[0_8px_40px_rgb(16,185,129,0.15)] transition-shadow">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                            <div className="flex flex-col items-center mb-8 text-center relative z-10">
                              <div className="w-24 h-16 mb-4 flex items-center justify-center">
                                <img src={carData.image || carData.thumbnail} alt={selectedCar} className="max-w-full max-h-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-300" />
                              </div>
                              <h3 className="font-sans font-bold text-gray-900 text-lg tracking-tight">{selectedCar}</h3>
                              <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-1">{carData.type} • {carData.year}</span>
                            </div>
                            
                            <div className="space-y-6 relative z-10">
                              <div className="h-10 flex items-center justify-center bg-gray-50/50 rounded-lg">
                                <span className={`text-xl font-sans font-extrabold tracking-tight ${totalRecyclability > 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{totalRecyclability}%</span>
                              </div>
                              <div className="h-10 flex items-center justify-center bg-gray-50/50 rounded-lg">
                                <span className="text-lg font-sans font-bold text-blue-600 tracking-tight">{carData.components.reduce((s, c) => s + parseFloat(c.carbonFootprint), 0).toFixed(1)} tCO2e</span>
                              </div>
                              <div className="h-10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">{carData.components.find(c => c.name.includes('Battery'))?.material || 'N/A'}</span>
                              </div>
                              <div className="h-10 flex items-center justify-center bg-gray-50/50 rounded-lg">
                                <span className="text-lg font-sans font-bold text-emerald-600 tracking-tight">~ $4,200</span>
                              </div>
                              <div className="h-10 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-500">{carData.components.length} Monitored</span>
                              </div>
                            </div>
                          </div>

                          {/* Vehicle 2 (Compare against first non-selected) */}
                          {(() => {
                            const compareCarName = carNames.find(c => c !== selectedCar);
                            const compareData = CAR_DATABASE[compareCarName] || dynamicCars[compareCarName];
                            const compareRecyclability = Math.round(compareData.components.reduce((acc, comp) => acc + comp.recyclability, 0) / compareData.components.length);
                            
                            return (
                              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow opacity-90 hover:opacity-100">
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gray-300 to-gray-400" />
                                <div className="flex flex-col items-center mb-8 text-center relative z-10">
                                  <div className="w-24 h-16 mb-4 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                    <img src={compareData.image || compareData.thumbnail} alt={compareCarName} className="max-w-full max-h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                                  </div>
                                  <h3 className="font-sans font-bold text-gray-700 text-lg tracking-tight">{compareCarName}</h3>
                                  <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-1">{compareData.type} • {compareData.year}</span>
                                </div>
                                
                                <div className="space-y-6 relative z-10">
                                  <div className="h-10 flex items-center justify-center bg-gray-50/50 rounded-lg">
                                    <span className={`text-xl font-sans font-extrabold tracking-tight ${compareRecyclability > 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{compareRecyclability}%</span>
                                  </div>
                                  <div className="h-10 flex items-center justify-center bg-gray-50/50 rounded-lg">
                                    <span className="text-lg font-sans font-bold text-blue-600 tracking-tight opacity-90">{compareData.components.reduce((s, c) => s + parseFloat(c.carbonFootprint), 0).toFixed(1)} tCO2e</span>
                                  </div>
                                  <div className="h-10 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">{compareData.components.find(c => c.name.includes('Battery'))?.material || 'N/A'}</span>
                                  </div>
                                  <div className="h-10 flex items-center justify-center bg-gray-50/50 rounded-lg">
                                    <span className="text-lg font-sans font-bold text-emerald-600 tracking-tight opacity-90">~ $3,850</span>
                                  </div>
                                  <div className="h-10 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-500">{compareData.components.length} Monitored</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 shadow-[0_8px_30px_rgb(79,70,229,0.2)] flex items-start gap-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Sparkles className="w-32 h-32 text-white" />
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div className="relative z-10 text-white flex-1">
                            <h4 className="text-sm font-bold mb-1.5 tracking-wide">AI Circularity Insight</h4>
                            <p className="text-xs text-indigo-50/90 leading-relaxed max-w-3xl">
                              The <strong className="text-white font-bold">{selectedCar}</strong> demonstrates superior circularity potential compared to the {carNames.find(c => c !== selectedCar)}, 
                              primarily driven by its highly recyclable {carData.components.find(c => c.name.includes('Battery'))?.material || 'battery'} chemistry and easily separable chassis materials. 
                              Optimizing recovery through pyrometallurgical processing could yield an estimated <span className="text-emerald-300 font-bold">$4,200</span> in reclaimed value.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-lg px-6">
                <div className="text-7xl mb-6">🚗</div>
                <h2 className="text-3xl font-bold mb-3">Vehicle Architecture Studio</h2>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">Search or select a vehicle to explore its 3D architecture, component recyclability, carbon footprint, and recovery costs.</p>
                <form onSubmit={handleSearch} className="relative max-w-md mx-auto mb-4">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Search any vehicle (e.g. Rivian R1T, Porsche Taycan)..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-28 py-3 bg-white border border-[#d4c5a9] rounded-2xl focus:outline-none focus:border-emerald-400 shadow-sm text-sm" />
                  <button type="button" onClick={() => handleAgenticSearch(searchQuery)} disabled={isSearching || !searchQuery.trim()}
                    className="absolute right-2 top-1.5 flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all shadow-sm">
                    {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI Search
                  </button>
                </form>
                {isSearching && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span className="text-sm text-emerald-700">{searchStatus}</span>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {carNames.map(name => (
                    <button key={name} onClick={() => handleSelectCar(name)}
                      className="text-xs px-4 py-2 bg-white border border-[#d4c5a9] rounded-full hover:border-emerald-400 hover:bg-emerald-50 transition-all shadow-sm">
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {selectedCar && (
          <aside className="w-72 bg-[#f5f0e8] border-l border-[#d4c5a9] flex flex-col overflow-y-auto shrink-0">
            <div className="p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 flex items-center gap-1 mb-4">
                <span className="text-rose-400">♥</span> Component Details
              </h3>
              {selectedComponent ? (
                <motion.div key={selectedComponent.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedComponent.color + '25' }}>
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: selectedComponent.color }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{selectedComponent.name}</h4>
                      <p className="text-[10px] text-gray-500 italic">{selectedComponent.material}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <DetailRow icon={Weight} label="Weight" value={selectedComponent.weight} info={INFO.weight} />
                    <DetailRow icon={Recycle} label="Recyclability" value={`${selectedComponent.recyclability}%`} highlight info={INFO.recyclability} />
                    <DetailRow icon={DollarSign} label="Component Value" value={selectedComponent.cost} info={INFO.recovery_cost} />
                    <DetailRow icon={Leaf} label="CO₂ Footprint" value={selectedComponent.carbonFootprint} info={INFO.carbon} />
                    <DetailRow icon={Zap} label="Recovery Method" value={selectedComponent.recovery} info={INFO.recovery_method} />
                  </div>
                  {/* Material Breakdown */}
                  {selectedComponent.materialBreakdown && (
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2 flex items-center">Material Breakdown<InfoIcon tooltip={INFO.material_breakdown} /></h5>
                      <div className="space-y-1.5">
                        {selectedComponent.materialBreakdown.map((m, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-gray-600">{m.mat}</span>
                              <span className="font-semibold text-gray-800">{m.pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.pct}%`, backgroundColor: selectedComponent.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-500">Recyclability</span>
                      <span className="font-bold text-emerald-600">{selectedComponent.recyclability}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${selectedComponent.recyclability}%` }}
                        transition={{ duration: 0.6 }} className="h-full rounded-full"
                        style={{ backgroundColor: selectedComponent.recyclability > 80 ? '#10b981' : selectedComponent.recyclability > 60 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5"><span>Low</span><span>Medium</span><span>High</span></div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-8"><p className="text-xs text-gray-400 italic">Click a component in the 3D view<br/>to see its details</p></div>
              )}
            </div>
            {selectedComponent && (
              <div className="px-4 pb-4">
                <div className="bg-white/50 rounded-xl p-3.5 border border-[#d4c5a9]">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">Recovery Notes</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{selectedComponent.description}</p>
                  <p className="text-[10px] text-emerald-700 italic mt-2">✦ Recommended: {selectedComponent.recovery}</p>
                </div>
              </div>
            )}
            <div className="px-4 pb-4 space-y-2.5 mt-auto">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-1">Vehicle Status</h3>
              <StatusCard label="Powertrain Type" status="IDENTIFIED" statusColor="text-indigo-600 bg-indigo-50" date={carData.powertrain || "Unknown"} info={INFO.powertrain} />
              <StatusCard label="EU Battery Passport" status="COMPLIANT" statusColor="text-emerald-600 bg-emerald-50" date="Valid until Dec 2026" info={INFO.eu_passport} />
              <StatusCard label="Recyclability Certificate" status={totalRecyclability > 80 ? 'GRADE A' : 'GRADE B'}
                statusColor={totalRecyclability > 80 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'} date={`${totalRecyclability}% avg`} info={INFO.recycl_cert} />
              <StatusCard label="Carbon Footprint" status="ASSESSED" statusColor="text-blue-600 bg-blue-50"
                date={`${carData.components.reduce((s, c) => s + parseFloat(c.carbonFootprint), 0).toFixed(1)} tCO2e`} info={INFO.carbon_footprint} />
              <StatusCard label="End-of-Life Plan" status="ACTIVE" statusColor="text-emerald-600 bg-emerald-50" date="Recovery mapped" action="View →" onAction={() => navigate('/recovery')} info={INFO.eol_plan} />
            </div>
            <div className="px-4 pb-4">
              <div className="bg-white/50 rounded-xl p-3.5 border border-[#d4c5a9]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2 flex items-center">Circular Economy<InfoIcon tooltip={INFO.circular_economy} /></h3>
                <div className="flex items-center justify-center gap-1.5 text-xl py-1">🏭 <span className="text-gray-300 text-xs">→</span> 🚗 <span className="text-gray-300 text-xs">→</span> ♻️ <span className="text-gray-300 text-xs">→</span> 🔋</div>
                <p className="text-[9px] text-gray-500 text-center">Manufacture → Use → Recycle → Second Life</p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, highlight, info }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><Icon className="w-3.5 h-3.5" /><span>{label}</span>{info && <InfoIcon tooltip={info} />}</div>
      <span className={`text-[11px] font-semibold ${highlight ? 'text-emerald-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

function StatusCard({ label, status, statusColor, date, action, onAction, info }) {
  return (
    <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2.5 border border-[#d4c5a9]">
      <div>
        <p className="text-xs font-semibold text-gray-700 flex items-center">{label}{info && <InfoIcon tooltip={info} />}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusColor}`}>{status}</span>
          <span className="text-[10px] text-gray-400">{date}</span>
        </div>
      </div>
      {action && <button onClick={onAction} className="text-[10px] text-emerald-600 font-medium cursor-pointer hover:underline outline-none">{action}</button>}
    </div>
  );
}
