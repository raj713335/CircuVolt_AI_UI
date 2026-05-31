import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// ── Wheel with brake caliper detail ──
function Wheel({ position, spinning, scale = 1 }) {
  const ref = useRef();
  useFrame((s) => { if (ref.current && spinning) ref.current.rotation.x = s.clock.elapsedTime * 2; });
  return (
    <group position={position} ref={ref} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.22, 0.09, 32, 64]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.92} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.12, 48]} />
        <meshPhysicalMaterial color="#c0c0c0" metalness={1} roughness={0.12} clearcoat={0.8} />
      </mesh>
      {[0,1,2,3,4,5,6,7].map(i => (
        <mesh key={i} rotation={[0, 0, Math.PI/2 + (i*Math.PI*2)/8]}>
          <boxGeometry args={[0.012, 0.13, 0.28]} />
          <meshPhysicalMaterial color="#e0e0e0" metalness={0.95} roughness={0.15} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 32]} />
        <meshStandardMaterial color="#444" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.14, 16]} />
        <meshPhysicalMaterial color="#888" metalness={1} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ── Disassemblable sub-part wrapper ──
function CarPart({ children, partName, offset = [0,0,0], disassembled, selectedPart, onSelect }) {
  const groupRef = useRef();
  const targetPos = useRef([0, 0, 0]);
  
  const isSelected = selectedPart === partName;
  const dimmed = selectedPart && !isSelected;
  const spread = disassembled ? 1 : 0;
  
  useFrame(() => {
    if (!groupRef.current) return;
    const tx = offset[0] * spread;
    const ty = offset[1] * spread;
    const tz = offset[2] * spread;
    groupRef.current.position.x += (tx - groupRef.current.position.x) * 0.08;
    groupRef.current.position.y += (ty - groupRef.current.position.y) * 0.08;
    groupRef.current.position.z += (tz - groupRef.current.position.z) * 0.08;
  });

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onSelect(partName); }}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        if (child.type === 'mesh' || child.type?.name === 'mesh') {
          return React.cloneElement(child);
        }
        return child;
      })}
    </group>
  );
}

// ── Main Realistic Car Body ──
export default function RealisticCar3D({ bodyColor = '#1a1a2e', accentColor = '#6366f1', isExploded, selectedPart, onSelectPart }) {
  const op = (name) => selectedPart && selectedPart !== name ? 0.12 : 1;

  const bodyProfile = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.35, 0.02); s.lineTo(1.35, 0.02);
    s.quadraticCurveTo(1.4, 0.06, 1.38, 0.12);
    s.lineTo(1.3, 0.2);
    s.quadraticCurveTo(1.2, 0.28, 1.05, 0.3);
    s.lineTo(0.55, 0.33);
    s.quadraticCurveTo(0.45, 0.38, 0.4, 0.56);
    s.lineTo(-0.15, 0.6);
    s.quadraticCurveTo(-0.3, 0.6, -0.42, 0.55);
    s.lineTo(-0.72, 0.38);
    s.quadraticCurveTo(-0.88, 0.3, -1.0, 0.28);
    s.lineTo(-1.25, 0.22);
    s.quadraticCurveTo(-1.38, 0.14, -1.35, 0.02);
    return s;
  }, []);

  return (
    <group>
      {/* ─── BODY PANELS ─── */}
      <CarPart partName="Body Panels" offset={[0, 0.5, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <mesh position={[0, 0.1, -0.42]} castShadow>
          <extrudeGeometry args={[bodyProfile, { depth: 0.84, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 16 }]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={2} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Hood crease */}
        <mesh position={[0.85, 0.4, 0]} castShadow>
          <boxGeometry args={[0.65, 0.004, 0.76]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.3} clearcoat={1} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Front bumper */}
        <mesh position={[1.32, 0.1, 0]} castShadow>
          <boxGeometry args={[0.08, 0.12, 0.78]} />
          <meshPhysicalMaterial color="#111" metalness={0.5} roughness={0.6} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Rear bumper */}
        <mesh position={[-1.32, 0.1, 0]} castShadow>
          <boxGeometry args={[0.08, 0.12, 0.78]} />
          <meshPhysicalMaterial color="#111" metalness={0.5} roughness={0.6} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Front grille */}
        <mesh position={[1.38, 0.18, 0]}>
          <boxGeometry args={[0.02, 0.1, 0.5]} />
          <meshPhysicalMaterial color="#222" metalness={0.8} roughness={0.2} transparent opacity={op('Body Panels')} />
        </mesh>
        {/* Fender flares */}
        <mesh position={[0.78, 0.08, 0.44]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.04]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} transparent opacity={op('Body Panels')} />
        </mesh>
        <mesh position={[0.78, 0.08, -0.44]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.04]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} transparent opacity={op('Body Panels')} />
        </mesh>
        <mesh position={[-0.78, 0.08, 0.44]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.04]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} transparent opacity={op('Body Panels')} />
        </mesh>
        <mesh position={[-0.78, 0.08, -0.44]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.04]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} transparent opacity={op('Body Panels')} />
        </mesh>
      </CarPart>

      {/* ─── INTERIOR CABIN (Glass) ─── */}
      <CarPart partName="Interior Cabin" offset={[0, 1.4, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <mesh position={[0.42, 0.55, 0]} rotation={[0, 0, -0.38]} castShadow>
          <boxGeometry args={[0.38, 0.006, 0.66]} />
          <meshPhysicalMaterial color="#88ccff" metalness={0.1} roughness={0} transmission={0.92} thickness={0.5} ior={1.52} transparent opacity={op('Interior Cabin') * 0.55} />
        </mesh>
        <mesh position={[0.08, 0.62, 0]}>
          <boxGeometry args={[0.55, 0.006, 0.62]} />
          <meshPhysicalMaterial color="#88bbee" metalness={0.1} roughness={0} transmission={0.88} thickness={0.3} transparent opacity={op('Interior Cabin') * 0.45} />
        </mesh>
        <mesh position={[-0.42, 0.52, 0]} rotation={[0, 0, 0.32]}>
          <boxGeometry args={[0.32, 0.006, 0.62]} />
          <meshPhysicalMaterial color="#88ccff" metalness={0.1} roughness={0} transmission={0.92} thickness={0.5} transparent opacity={op('Interior Cabin') * 0.55} />
        </mesh>
        {/* A-pillar */}
        <mesh position={[0.28, 0.52, 0.34]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.3, 0.025, 0.025]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} transparent opacity={op('Interior Cabin')} />
        </mesh>
        <mesh position={[0.28, 0.52, -0.34]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.3, 0.025, 0.025]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} transparent opacity={op('Interior Cabin')} />
        </mesh>
        {/* Seats inside */}
        <mesh position={[0.15, 0.28, 0.15]}>
          <boxGeometry args={[0.18, 0.2, 0.15]} />
          <meshStandardMaterial color="#333" roughness={0.9} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
        <mesh position={[0.15, 0.28, -0.15]}>
          <boxGeometry args={[0.18, 0.2, 0.15]} />
          <meshStandardMaterial color="#333" roughness={0.9} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
        {/* Dashboard */}
        <mesh position={[0.45, 0.32, 0]}>
          <boxGeometry args={[0.1, 0.08, 0.5]} />
          <meshStandardMaterial color="#222" roughness={0.8} transparent opacity={op('Interior Cabin') * 0.6} />
        </mesh>
        {/* Screen */}
        <mesh position={[0.42, 0.37, 0]}>
          <boxGeometry args={[0.005, 0.06, 0.15]} />
          <meshStandardMaterial color="#111" emissive="#4488ff" emissiveIntensity={0.3} transparent opacity={op('Interior Cabin') * 0.7} />
        </mesh>
      </CarPart>

      {/* ─── CHASSIS FRAME ─── */}
      <CarPart partName="Chassis Frame" offset={[0, -0.3, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[2.75, 0.055, 0.82]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.25} transparent opacity={op('Chassis Frame')} />
        </mesh>
        {/* Rails */}
        <mesh position={[0, 0.06, 0.38]} castShadow>
          <boxGeometry args={[2.4, 0.05, 0.025]} />
          <meshPhysicalMaterial color="#282828" metalness={0.9} roughness={0.2} transparent opacity={op('Chassis Frame')} />
        </mesh>
        <mesh position={[0, 0.06, -0.38]} castShadow>
          <boxGeometry args={[2.4, 0.05, 0.025]} />
          <meshPhysicalMaterial color="#282828" metalness={0.9} roughness={0.2} transparent opacity={op('Chassis Frame')} />
        </mesh>
        {/* Crossmembers */}
        {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
          <mesh key={i} position={[x, 0.04, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.78]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} transparent opacity={op('Chassis Frame')} />
          </mesh>
        ))}
      </CarPart>

      {/* ─── BATTERY PACK ─── */}
      <CarPart partName="Battery Pack" offset={[0, -1.2, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <RoundedBox args={[2.0, 0.12, 0.72]} radius={0.025} position={[0, -0.03, 0]} castShadow>
          <meshPhysicalMaterial color="#6366f1" metalness={0.65} roughness={0.22} clearcoat={0.5} transparent opacity={op('Battery Pack')} />
        </RoundedBox>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
          <mesh key={i} position={[x, -0.03, 0]}>
            <boxGeometry args={[0.012, 0.13, 0.73]} />
            <meshStandardMaterial color="#4338ca" transparent opacity={op('Battery Pack') * 0.4} />
          </mesh>
        ))}
        {/* Battery cells visible */}
        {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
          <mesh key={`c${i}`} position={[x, -0.025, 0]}>
            <boxGeometry args={[0.32, 0.08, 0.6]} />
            <meshStandardMaterial color="#5558e8" transparent opacity={op('Battery Pack') * 0.3} />
          </mesh>
        ))}
        {/* Cooling lines */}
        <mesh position={[0, -0.09, 0.3]}>
          <cylinderGeometry args={[0.008, 0.008, 1.8, 8]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f97316" transparent opacity={op('Battery Pack') * 0.6} />
        </mesh>
      </CarPart>

      {/* ─── ELECTRIC MOTOR ─── */}
      <CarPart partName="Electric Motor" offset={[-1.5, 0.5, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[-0.95, 0.12, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.17, 0.19, 0.32, 48]} />
            <meshPhysicalMaterial color="#ec4899" metalness={0.85} roughness={0.2} clearcoat={0.7} transparent opacity={op('Electric Motor')} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 48]} />
            <meshStandardMaterial color="#be185d" metalness={0.9} roughness={0.15} transparent opacity={op('Electric Motor')} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 16]} />
            <meshStandardMaterial color="#777" metalness={0.95} roughness={0.15} transparent opacity={op('Electric Motor')} />
          </mesh>
          {/* Cooling fins */}
          {[-0.12, -0.06, 0, 0.06, 0.12].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.195, 0.195, 0.008, 48]} />
              <meshStandardMaterial color="#d946a8" metalness={0.7} transparent opacity={op('Electric Motor') * 0.5} />
            </mesh>
          ))}
        </group>
      </CarPart>

      {/* ─── POWER ELECTRONICS ─── */}
      <CarPart partName="Power Electronics" offset={[1.3, 0.8, 0.4]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0.9, 0.2, 0.22]}>
          <RoundedBox args={[0.26, 0.1, 0.18]} radius={0.012} castShadow>
            <meshPhysicalMaterial color="#06b6d4" metalness={0.65} roughness={0.28} clearcoat={0.4} transparent opacity={op('Power Electronics')} />
          </RoundedBox>
          {[-0.06, 0, 0.06].map((z, i) => (
            <mesh key={i} position={[0, 0.055, z]}>
              <boxGeometry args={[0.24, 0.012, 0.012]} />
              <meshStandardMaterial color="#0891b2" metalness={0.75} transparent opacity={op('Power Electronics')} />
            </mesh>
          ))}
          {/* Connectors */}
          <mesh position={[-0.14, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
            <meshStandardMaterial color="#f59e0b" transparent opacity={op('Power Electronics')} />
          </mesh>
        </group>
      </CarPart>

      {/* ─── THERMAL SYSTEM ─── */}
      <CarPart partName="Thermal System" offset={[1.5, 0.3, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[1.2, 0.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.035, 0.28, 0.55]} />
            <meshStandardMaterial color="#f97316" metalness={0.55} roughness={0.28} transparent opacity={op('Thermal System')} />
          </mesh>
          {[-0.12, -0.06, 0, 0.06, 0.12].map((y, i) => (
            <mesh key={i} position={[0, y, 0]}>
              <boxGeometry args={[0.03, 0.008, 0.53]} />
              <meshStandardMaterial color="#ea580c" metalness={0.65} transparent opacity={op('Thermal System')} />
            </mesh>
          ))}
          <mesh position={[-0.04, 0.12, 0.24]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.014, 0.014, 0.18, 12]} />
            <meshStandardMaterial color="#333" roughness={0.85} transparent opacity={op('Thermal System')} />
          </mesh>
          <mesh position={[-0.04, -0.12, 0.24]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.014, 0.014, 0.18, 12]} />
            <meshStandardMaterial color="#333" roughness={0.85} transparent opacity={op('Thermal System')} />
          </mesh>
        </group>
      </CarPart>

      {/* ─── SUSPENSION & BRAKES ─── */}
      <CarPart partName="Suspension & Brakes" offset={[0, -0.6, 1.2]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        {/* Front subframe */}
        <mesh position={[0.8, 0.02, 0]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.7]} />
          <meshStandardMaterial color="#333" metalness={0.9} roughness={0.25} transparent opacity={op('Suspension & Brakes')} />
        </mesh>
        {/* Rear subframe */}
        <mesh position={[-0.8, 0.02, 0]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.7]} />
          <meshStandardMaterial color="#333" metalness={0.9} roughness={0.25} transparent opacity={op('Suspension & Brakes')} />
        </mesh>
        {/* Control arms */}
        {[[0.8, 0.42], [0.8, -0.42], [-0.8, 0.42], [-0.8, -0.42]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.04, z * 0.8]} rotation={[0, 0.3 * Math.sign(z), 0]}>
            <boxGeometry args={[0.25, 0.02, 0.025]} />
            <meshStandardMaterial color="#555" metalness={0.85} roughness={0.3} transparent opacity={op('Suspension & Brakes')} />
          </mesh>
        ))}
      </CarPart>

      {/* ─── WHEELS & TIRES ─── */}
      <CarPart partName="Wheels & Tires" offset={[0, 0, 1.5]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <Wheel position={[0.82, 0.04, 0.48]} spinning={!isExploded} />
        <Wheel position={[0.82, 0.04, -0.48]} spinning={!isExploded} />
        <Wheel position={[-0.82, 0.04, 0.48]} spinning={!isExploded} />
        <Wheel position={[-0.82, 0.04, -0.48]} spinning={!isExploded} />
      </CarPart>

      {/* ─── WIRING HARNESS ─── */}
      <CarPart partName="Wiring Harness" offset={[0, 0.8, -1.2]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        {[0.3, 0.15, 0, -0.15, -0.3].map((z, i) => (
          <mesh key={i} position={[0, 0.07, z]}>
            <cylinderGeometry args={[0.006, 0.006, 2.2, 6]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color={['#a855f7', '#7c3aed', '#6d28d9', '#a855f7', '#7c3aed'][i]} transparent opacity={op('Wiring Harness')} />
          </mesh>
        ))}
      </CarPart>

      {/* ─── LIGHTS (always visible) ─── */}
      <mesh position={[1.35, 0.24, 0.28]}><sphereGeometry args={[0.045, 24, 24]} /><meshStandardMaterial color="#fff" emissive="#ffffcc" emissiveIntensity={2} /></mesh>
      <mesh position={[1.35, 0.24, -0.28]}><sphereGeometry args={[0.045, 24, 24]} /><meshStandardMaterial color="#fff" emissive="#ffffcc" emissiveIntensity={2} /></mesh>
      {/* DRL */}
      <mesh position={[1.38, 0.22, 0]}><boxGeometry args={[0.01, 0.018, 0.45]} /><meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1} /></mesh>
      {/* Taillights */}
      <mesh position={[-1.33, 0.24, 0.3]}><boxGeometry args={[0.02, 0.045, 0.1]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.2} /></mesh>
      <mesh position={[-1.33, 0.24, -0.3]}><boxGeometry args={[0.02, 0.045, 0.1]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.2} /></mesh>
      <mesh position={[-1.35, 0.24, 0]}><boxGeometry args={[0.008, 0.022, 0.55]} /><meshStandardMaterial color="#ff2222" emissive="#ff2222" emissiveIntensity={0.6} /></mesh>
      {/* Mirrors */}
      <mesh position={[0.38, 0.42, 0.44]} castShadow><boxGeometry args={[0.065, 0.04, 0.035]} /><meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} /></mesh>
      <mesh position={[0.38, 0.42, -0.44]} castShadow><boxGeometry args={[0.065, 0.04, 0.035]} /><meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.35} clearcoat={1} /></mesh>
    </group>
  );
}
