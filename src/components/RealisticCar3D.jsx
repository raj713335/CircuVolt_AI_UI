import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// ── Premium Wheel ──
function Wheel({ position, spinning }) {
  const ref = useRef();
  useFrame((s) => { if (ref.current && spinning) ref.current.rotation.x = s.clock.elapsedTime * 2.5; });
  return (
    <group position={position} ref={ref}>
      {/* Tire */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.22, 0.085, 32, 64]} />
        <meshStandardMaterial color="#222222" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Rim face */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.155, 0.155, 0.1, 48]} />
        <meshStandardMaterial color="#d0d0d0" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Spoke design */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <mesh key={i} rotation={[0, 0, Math.PI / 2 + (i * Math.PI * 2) / 10]}>
          <boxGeometry args={[0.01, 0.12, 0.26]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.08} />
        </mesh>
      ))}
      {/* Hub cap */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 24]} />
        <meshStandardMaterial color="#999" metalness={0.95} roughness={0.15} />
      </mesh>
      {/* Brake disc */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.025, 32]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Red brake caliper */}
      <mesh position={[0, -0.08, 0.05]}>
        <boxGeometry args={[0.04, 0.06, 0.03]} />
        <meshStandardMaterial color="#ee2233" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ── Animated part group ──
function CarPart({ children, partName, offset = [0,0,0], disassembled, selectedPart, onSelect }) {
  const groupRef = useRef();
  const spread = disassembled ? 1 : 0;

  useFrame(() => {
    if (!groupRef.current) return;
    const tx = offset[0] * spread, ty = offset[1] * spread, tz = offset[2] * spread;
    groupRef.current.position.x += (tx - groupRef.current.position.x) * 0.06;
    groupRef.current.position.y += (ty - groupRef.current.position.y) * 0.06;
    groupRef.current.position.z += (tz - groupRef.current.position.z) * 0.06;
  });

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onSelect(partName); }}>
      {children}
    </group>
  );
}

// ── Main component ──
export default function RealisticCar3D({ bodyColor, accentColor = '#6366f1', isExploded, selectedPart, onSelectPart }) {
  const op = (name) => selectedPart && selectedPart !== name ? 0.15 : 1;
  // Use accentColor as visible paint - bodyColor is often too dark
  const paintColor = accentColor || '#3b82f6';

  const bodyProfile = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.35, 0.02);
    s.lineTo(1.35, 0.02);
    s.quadraticCurveTo(1.42, 0.06, 1.4, 0.14);
    s.lineTo(1.3, 0.22);
    s.quadraticCurveTo(1.18, 0.3, 1.05, 0.32);
    s.lineTo(0.55, 0.35);
    s.quadraticCurveTo(0.45, 0.4, 0.38, 0.58);
    s.lineTo(-0.18, 0.62);
    s.quadraticCurveTo(-0.32, 0.62, -0.44, 0.56);
    s.lineTo(-0.72, 0.38);
    s.quadraticCurveTo(-0.9, 0.3, -1.02, 0.28);
    s.lineTo(-1.28, 0.22);
    s.quadraticCurveTo(-1.4, 0.14, -1.35, 0.02);
    return s;
  }, []);

  return (
    <group>
      {/* ═══════ BODY PANELS ═══════ */}
      <CarPart partName="Body Panels" offset={[0, 0.6, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        {/* Main body shell */}
        <mesh position={[0, 0.1, -0.42]} castShadow>
          <extrudeGeometry args={[bodyProfile, { depth: 0.84, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 12 }]} />
          <meshStandardMaterial color={paintColor} metalness={0.6} roughness={0.25} transparent opacity={op('Body Panels')} envMapIntensity={1.5} />
        </mesh>
        {/* Hood panel */}
        <mesh position={[0.88, 0.43, 0]} castShadow>
          <boxGeometry args={[0.55, 0.006, 0.72]} />
          <meshStandardMaterial color={paintColor} metalness={0.65} roughness={0.2} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Front bumper lower */}
        <mesh position={[1.34, 0.08, 0]} castShadow>
          <boxGeometry args={[0.08, 0.1, 0.76]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Rear bumper lower */}
        <mesh position={[-1.34, 0.08, 0]} castShadow>
          <boxGeometry args={[0.08, 0.1, 0.76]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Front grille / intake */}
        <mesh position={[1.4, 0.16, 0]}>
          <boxGeometry args={[0.02, 0.1, 0.48]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Chrome trim along sides */}
        <mesh position={[0, 0.28, 0.44]}>
          <boxGeometry args={[2.2, 0.008, 0.008]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.05} transparent opacity={op('Body Panels')} />
        </mesh>
        <mesh position={[0, 0.28, -0.44]}>
          <boxGeometry args={[2.2, 0.008, 0.008]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.05} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Wheel arch surrounds */}
        {[[0.82, 0.47], [0.82, -0.47], [-0.82, 0.47], [-0.82, -0.47]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.1, z]} castShadow>
            <boxGeometry args={[0.42, 0.14, 0.03]} />
            <meshStandardMaterial color={paintColor} metalness={0.6} roughness={0.25} transparent opacity={op('Body Panels')} />
          </mesh>
        ))}
      </CarPart>

      {/* ═══════ INTERIOR / GLASS ═══════ */}
      <CarPart partName="Interior Cabin" offset={[0, 1.5, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        {/* Windshield */}
        <mesh position={[0.4, 0.55, 0]} rotation={[0, 0, -0.38]} castShadow>
          <boxGeometry args={[0.38, 0.005, 0.64]} />
          <meshPhysicalMaterial color="#aaddff" metalness={0.05} roughness={0.05} transmission={0.85} thickness={0.5} ior={1.5} transparent opacity={op('Interior Cabin') * 0.65} />
        </mesh>
        {/* Roof panel (glass) */}
        <mesh position={[0.06, 0.64, 0]}>
          <boxGeometry args={[0.52, 0.005, 0.58]} />
          <meshPhysicalMaterial color="#99ccee" metalness={0.05} roughness={0.05} transmission={0.8} thickness={0.3} transparent opacity={op('Interior Cabin') * 0.5} />
        </mesh>
        {/* Rear window */}
        <mesh position={[-0.44, 0.52, 0]} rotation={[0, 0, 0.32]}>
          <boxGeometry args={[0.3, 0.005, 0.58]} />
          <meshPhysicalMaterial color="#aaddff" metalness={0.05} roughness={0.05} transmission={0.85} thickness={0.5} transparent opacity={op('Interior Cabin') * 0.65} />
        </mesh>
        {/* Side windows */}
        <mesh position={[0.1, 0.48, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.65, 0.005, 0.18]} />
          <meshPhysicalMaterial color="#bbddff" metalness={0.05} roughness={0.05} transmission={0.85} transparent opacity={op('Interior Cabin') * 0.4} />
        </mesh>
        <mesh position={[0.1, 0.48, -0.37]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.65, 0.005, 0.18]} />
          <meshPhysicalMaterial color="#bbddff" metalness={0.05} roughness={0.05} transmission={0.85} transparent opacity={op('Interior Cabin') * 0.4} />
        </mesh>
        {/* A-pillars */}
        <mesh position={[0.28, 0.53, 0.35]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.32, 0.03, 0.02]} />
          <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} transparent opacity={op('Interior Cabin')} />
        </mesh>
        <mesh position={[0.28, 0.53, -0.35]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.32, 0.03, 0.02]} />
          <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} transparent opacity={op('Interior Cabin')} />
        </mesh>
        {/* Dashboard */}
        <mesh position={[0.45, 0.32, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.52]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.85} transparent opacity={op('Interior Cabin') * 0.7} />
        </mesh>
        {/* Screen glow */}
        <mesh position={[0.42, 0.37, 0]}>
          <boxGeometry args={[0.005, 0.06, 0.16]} />
          <meshStandardMaterial color="#66aaff" emissive="#4488ff" emissiveIntensity={0.8} transparent opacity={op('Interior Cabin') * 0.8} />
        </mesh>
        {/* Seats */}
        <mesh position={[0.12, 0.25, 0.16]}>
          <boxGeometry args={[0.16, 0.22, 0.14]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.9} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
        <mesh position={[0.12, 0.25, -0.16]}>
          <boxGeometry args={[0.16, 0.22, 0.14]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.9} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
        {/* Steering wheel */}
        <mesh position={[0.35, 0.35, 0.18]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.04, 0.006, 12, 24]} />
          <meshStandardMaterial color="#222" roughness={0.7} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
      </CarPart>

      {/* ═══════ CHASSIS FRAME ═══════ */}
      <CarPart partName="Chassis Frame" offset={[0, -0.4, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[2.8, 0.055, 0.8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.75} roughness={0.35} transparent opacity={op('Chassis Frame')} />
        </mesh>
        {/* Side rails */}
        <mesh position={[0, 0.07, 0.39]} castShadow>
          <boxGeometry args={[2.5, 0.05, 0.022]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.25} transparent opacity={op('Chassis Frame')} />
        </mesh>
        <mesh position={[0, 0.07, -0.39]} castShadow>
          <boxGeometry args={[2.5, 0.05, 0.022]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.25} transparent opacity={op('Chassis Frame')} />
        </mesh>
        {/* Cross-members */}
        {[-0.9, -0.4, 0.1, 0.6].map((x, i) => (
          <mesh key={i} position={[x, 0.045, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.76]} />
            <meshStandardMaterial color="#555" metalness={0.7} roughness={0.35} transparent opacity={op('Chassis Frame')} />
          </mesh>
        ))}
      </CarPart>

      {/* ═══════ BATTERY PACK ═══════ */}
      <CarPart partName="Battery Pack" offset={[0, -1.3, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <RoundedBox args={[2.0, 0.13, 0.7]} radius={0.025} position={[0, -0.03, 0]} castShadow>
          <meshStandardMaterial color="#6366f1" metalness={0.5} roughness={0.3} transparent opacity={op('Battery Pack')} emissive="#4338ca" emissiveIntensity={0.15} />
        </RoundedBox>
        {/* Cell dividers */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
          <mesh key={i} position={[x, -0.03, 0]}>
            <boxGeometry args={[0.015, 0.14, 0.71]} />
            <meshStandardMaterial color="#818cf8" transparent opacity={op('Battery Pack') * 0.6} />
          </mesh>
        ))}
        {/* Cell modules */}
        {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
          <mesh key={`c${i}`} position={[x, -0.025, 0]}>
            <boxGeometry args={[0.3, 0.09, 0.58]} />
            <meshStandardMaterial color="#7c7cf8" transparent opacity={op('Battery Pack') * 0.35} emissive="#6366f1" emissiveIntensity={0.1} />
          </mesh>
        ))}
        {/* Orange HV connectors */}
        <mesh position={[0.95, -0.02, 0.25]}>
          <boxGeometry args={[0.06, 0.04, 0.04]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} transparent opacity={op('Battery Pack')} />
        </mesh>
        <mesh position={[0.95, -0.02, -0.25]}>
          <boxGeometry args={[0.06, 0.04, 0.04]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} transparent opacity={op('Battery Pack')} />
        </mesh>
      </CarPart>

      {/* ═══════ ELECTRIC MOTOR ═══════ */}
      <CarPart partName="Electric Motor" offset={[-1.8, 0.6, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[-0.95, 0.13, 0]}>
          {/* Motor housing */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.17, 0.19, 0.34, 48]} />
            <meshStandardMaterial color="#ec4899" metalness={0.7} roughness={0.25} transparent opacity={op('Electric Motor')} emissive="#ec4899" emissiveIntensity={0.1} />
          </mesh>
          {/* End cap */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 48]} />
            <meshStandardMaterial color="#db2777" metalness={0.8} roughness={0.2} transparent opacity={op('Electric Motor')} />
          </mesh>
          {/* Drive shaft */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.55, 16]} />
            <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.15} transparent opacity={op('Electric Motor')} />
          </mesh>
          {/* Cooling fins */}
          {[-0.14, -0.07, 0, 0.07, 0.14].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.195, 0.195, 0.006, 48]} />
              <meshStandardMaterial color="#f472b6" metalness={0.6} transparent opacity={op('Electric Motor') * 0.6} />
            </mesh>
          ))}
          {/* Copper winding hint */}
          <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.08, 0.015, 8, 24]} />
            <meshStandardMaterial color="#b87333" metalness={0.8} roughness={0.3} transparent opacity={op('Electric Motor') * 0.7} />
          </mesh>
        </group>
      </CarPart>

      {/* ═══════ POWER ELECTRONICS ═══════ */}
      <CarPart partName="Power Electronics" offset={[1.5, 0.9, 0.5]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0.9, 0.2, 0.22]}>
          <RoundedBox args={[0.28, 0.11, 0.2]} radius={0.015} castShadow>
            <meshStandardMaterial color="#06b6d4" metalness={0.55} roughness={0.3} transparent opacity={op('Power Electronics')} emissive="#06b6d4" emissiveIntensity={0.12} />
          </RoundedBox>
          {/* Heat sink fins */}
          {[-0.07, -0.035, 0, 0.035, 0.07].map((z, i) => (
            <mesh key={i} position={[0, 0.06, z]}>
              <boxGeometry args={[0.26, 0.015, 0.015]} />
              <meshStandardMaterial color="#22d3ee" metalness={0.7} transparent opacity={op('Power Electronics')} />
            </mesh>
          ))}
          {/* HV connector */}
          <mesh position={[-0.15, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.07, 8]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={op('Power Electronics')} />
          </mesh>
          {/* Status LED */}
          <mesh position={[0.12, 0.058, 0.08]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshStandardMaterial color="#22ff44" emissive="#22ff44" emissiveIntensity={2} transparent opacity={op('Power Electronics')} />
          </mesh>
        </group>
      </CarPart>

      {/* ═══════ THERMAL SYSTEM ═══════ */}
      <CarPart partName="Thermal System" offset={[1.8, 0.3, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[1.22, 0.2, 0]}>
          {/* Radiator core */}
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.3, 0.56]} />
            <meshStandardMaterial color="#f97316" metalness={0.45} roughness={0.35} transparent opacity={op('Thermal System')} emissive="#f97316" emissiveIntensity={0.1} />
          </mesh>
          {/* Fins */}
          {[-0.12, -0.06, 0, 0.06, 0.12].map((y, i) => (
            <mesh key={i} position={[0, y, 0]}>
              <boxGeometry args={[0.035, 0.008, 0.54]} />
              <meshStandardMaterial color="#fb923c" metalness={0.55} transparent opacity={op('Thermal System')} />
            </mesh>
          ))}
          {/* Coolant hoses */}
          <mesh position={[-0.04, 0.13, 0.25]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.016, 0.016, 0.2, 12]} />
            <meshStandardMaterial color="#444" roughness={0.8} transparent opacity={op('Thermal System')} />
          </mesh>
          <mesh position={[-0.04, -0.13, 0.25]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.016, 0.016, 0.2, 12]} />
            <meshStandardMaterial color="#444" roughness={0.8} transparent opacity={op('Thermal System')} />
          </mesh>
          {/* Fan */}
          <mesh position={[-0.03, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.01, 24]} />
            <meshStandardMaterial color="#555" metalness={0.5} roughness={0.5} transparent opacity={op('Thermal System') * 0.4} />
          </mesh>
        </group>
      </CarPart>

      {/* ═══════ SUSPENSION & BRAKES ═══════ */}
      <CarPart partName="Suspension & Brakes" offset={[0, -0.7, 1.3]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        {/* Subframes */}
        <mesh position={[0.8, 0.02, 0]} castShadow>
          <boxGeometry args={[0.55, 0.035, 0.72]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} transparent opacity={op('Suspension & Brakes')} />
        </mesh>
        <mesh position={[-0.8, 0.02, 0]} castShadow>
          <boxGeometry args={[0.55, 0.035, 0.72]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} transparent opacity={op('Suspension & Brakes')} />
        </mesh>
        {/* Coil springs */}
        {[[0.82, 0.4], [0.82, -0.4], [-0.82, 0.4], [-0.82, -0.4]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.1, z]}>
            <cylinderGeometry args={[0.025, 0.025, 0.15, 12]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.4} transparent opacity={op('Suspension & Brakes')} emissive="#ef4444" emissiveIntensity={0.1} />
          </mesh>
        ))}
        {/* Control arms */}
        {[[0.82, 0.4], [0.82, -0.4], [-0.82, 0.4], [-0.82, -0.4]].map(([x, z], i) => (
          <mesh key={`a${i}`} position={[x, 0.04, z * 0.75]} rotation={[0, 0.25 * Math.sign(z), 0]}>
            <boxGeometry args={[0.28, 0.02, 0.025]} />
            <meshStandardMaterial color="#777" metalness={0.8} roughness={0.3} transparent opacity={op('Suspension & Brakes')} />
          </mesh>
        ))}
      </CarPart>

      {/* ═══════ WHEELS & TIRES ═══════ */}
      <CarPart partName="Wheels & Tires" offset={[0, 0, 1.6]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <Wheel position={[0.84, 0.04, 0.49]} spinning={!isExploded} />
        <Wheel position={[0.84, 0.04, -0.49]} spinning={!isExploded} />
        <Wheel position={[-0.84, 0.04, 0.49]} spinning={!isExploded} />
        <Wheel position={[-0.84, 0.04, -0.49]} spinning={!isExploded} />
      </CarPart>

      {/* ═══════ WIRING HARNESS ═══════ */}
      <CarPart partName="Wiring Harness" offset={[0, 0.9, -1.3]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        {[0.28, 0.14, 0, -0.14, -0.28].map((z, i) => (
          <mesh key={i} position={[0, 0.07, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.007, 0.007, 2.4, 6]} />
            <meshStandardMaterial color={['#a855f7', '#f97316', '#22d3ee', '#a855f7', '#ef4444'][i]} emissive={['#a855f7', '#f97316', '#22d3ee', '#a855f7', '#ef4444'][i]} emissiveIntensity={0.3} transparent opacity={op('Wiring Harness')} />
          </mesh>
        ))}
        {/* Connectors */}
        {[-1.0, -0.5, 0, 0.5, 1.0].map((x, i) => (
          <mesh key={`cn${i}`} position={[x, 0.07, 0]}>
            <boxGeometry args={[0.03, 0.025, 0.08]} />
            <meshStandardMaterial color="#333" roughness={0.6} transparent opacity={op('Wiring Harness') * 0.7} />
          </mesh>
        ))}
      </CarPart>

      {/* ═══════ LIGHTS (always visible) ═══════ */}
      {/* Headlights */}
      <mesh position={[1.38, 0.24, 0.3]}><sphereGeometry args={[0.05, 24, 24]} /><meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={3} /></mesh>
      <mesh position={[1.38, 0.24, -0.3]}><sphereGeometry args={[0.05, 24, 24]} /><meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={3} /></mesh>
      {/* Headlight housing */}
      <mesh position={[1.37, 0.24, 0.3]}><boxGeometry args={[0.03, 0.06, 0.12]} /><meshStandardMaterial color="#ddd" metalness={0.8} roughness={0.1} /></mesh>
      <mesh position={[1.37, 0.24, -0.3]}><boxGeometry args={[0.03, 0.06, 0.12]} /><meshStandardMaterial color="#ddd" metalness={0.8} roughness={0.1} /></mesh>
      {/* DRL strip */}
      <mesh position={[1.4, 0.2, 0]}><boxGeometry args={[0.008, 0.015, 0.5]} /><meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} /></mesh>
      {/* Taillights */}
      <mesh position={[-1.36, 0.24, 0.3]}><boxGeometry args={[0.02, 0.05, 0.12]} /><meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2} /></mesh>
      <mesh position={[-1.36, 0.24, -0.3]}><boxGeometry args={[0.02, 0.05, 0.12]} /><meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2} /></mesh>
      {/* Taillight bar */}
      <mesh position={[-1.38, 0.24, 0]}><boxGeometry args={[0.006, 0.02, 0.55]} /><meshStandardMaterial color="#ff3333" emissive="#ff2222" emissiveIntensity={0.8} /></mesh>
      {/* Mirrors */}
      <mesh position={[0.36, 0.44, 0.46]} castShadow><boxGeometry args={[0.07, 0.04, 0.035]} /><meshStandardMaterial color={paintColor} metalness={0.6} roughness={0.25} /></mesh>
      <mesh position={[0.36, 0.44, -0.46]} castShadow><boxGeometry args={[0.07, 0.04, 0.035]} /><meshStandardMaterial color={paintColor} metalness={0.6} roughness={0.25} /></mesh>
      {/* Antenna */}
      <mesh position={[-0.3, 0.66, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 6]} />
        <meshStandardMaterial color="#333" roughness={0.5} />
      </mesh>
    </group>
  );
}
