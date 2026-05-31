import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// ── Animated part group ──
function CarPart({ children, partName, offset = [0,0,0], disassembled, selectedPart, onSelect }) {
  const groupRef = useRef();
  const spread = disassembled ? 1 : 0;

  useFrame(() => {
    if (!groupRef.current) return;
    const tx = offset[0] * spread, ty = offset[1] * spread, tz = offset[2] * spread;
    groupRef.current.position.x += (tx - groupRef.current.position.x) * 0.08;
    groupRef.current.position.y += (ty - groupRef.current.position.y) * 0.08;
    groupRef.current.position.z += (tz - groupRef.current.position.z) * 0.08;
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
  const paintColor = bodyColor || '#cc1111';

  // Load the Ferrari model
  const { nodes, materials } = useGLTF('/models/ferrari.glb');

  // Clone materials so we can modify colors dynamically
  const paintMaterial = useMemo(() => {
    const mat = materials.Body_Color.clone();
    mat.color = new THREE.Color(paintColor);
    mat.envMapIntensity = 2.0;
    mat.transparent = true;
    return mat;
  }, [paintColor, materials.Body_Color]);

  const glassMaterial = useMemo(() => {
    const mat = materials.Glass_Gray.clone();
    mat.transparent = true;
    mat.opacity = 0.8;
    return mat;
  }, [materials.Glass_Gray]);

  // Apply opacity to all materials based on selection
  useEffect(() => {
    paintMaterial.opacity = op('Body Panels');
    glassMaterial.opacity = op('Interior Cabin') * 0.8;
  }, [selectedPart, paintMaterial, glassMaterial]);

  // The Ferrari model is quite large, let's scale it down slightly to fit our scene nicely
  const SCALE = 0.55;

  return (
    <group scale={SCALE}>
      {/* ═══════ BODY PANELS ═══════ */}
      <CarPart partName="Body Panels" offset={[0, 0.8, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0, 0.676, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
          <mesh geometry={nodes.body.geometry} material={paintMaterial} position={[-0.005, 0, 0.022]} castShadow receiveShadow />
          <mesh geometry={nodes.yellow_trim.geometry} material={materials.Ferrari_Yellow} position={[-1.397, -0.003, 0.047]} />
          <mesh geometry={nodes.chrome.geometry} material={materials.metal_chrome} position={[0.033, 0, 0.007]} />
          <mesh geometry={nodes.plastic_gray.geometry} material={materials.plastic_gray} position={[0.108, -0.001, -0.029]} />
          <mesh geometry={nodes.grills.geometry} material={materials.Tires} position={[0.048, -0.007, -0.033]} />
          <mesh geometry={nodes.carbon_fibre.geometry} material={materials.Carbon_Fiber} position={[-0.438, -0.346, 0.118]} />
          <mesh geometry={nodes.carbon_fibre_trim.geometry} material={materials.Carbon_Fiber} position={[-0.177, -0.002, -0.04]} />
          <mesh geometry={nodes.lights.geometry} material={materials.Projector_Glass} position={[-1.845, -0.002, -0.067]} />
          <mesh geometry={nodes.leds.geometry} material={materials.Turn_Signal_LED} position={[-1.265, -0.001, 0.022]} />
          <mesh geometry={nodes.lights_red.geometry} material={materials.Taillight_Glass} position={[0.913, -0.004, -0.006]} />
          <mesh geometry={nodes.wipers.geometry} material={materials.Tires} position={[-1.089, 0.006, 0.11]} />
          <mesh geometry={nodes.blue.geometry} material={materials._0098_DodgerBlue} position={[-0.35, -0.435, 0.068]} />
        </group>
      </CarPart>

      {/* ═══════ INTERIOR CABIN ═══════ */}
      <CarPart partName="Interior Cabin" offset={[0, 1.8, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0, 0.676, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
          <mesh geometry={nodes.glass.geometry} material={glassMaterial} position={[0.001, -0.002, 0.194]} />
          <mesh geometry={nodes.leather.geometry} material={materials.Leather} position={[-0.348, -0.002, -0.031]} />
          <mesh geometry={nodes.trim.geometry} material={materials.Leather_red} position={[-0.379, -0.004, -0.016]} />
          <mesh geometry={nodes.carpet.geometry} material={materials.Carpet} position={[-0.281, -0.004, -0.235]} />
          <mesh geometry={nodes.interior_dark.geometry} material={materials.Interior_light} position={[0.003, 0, 0.011]} />
          <mesh geometry={nodes.interior_light.geometry} material={materials.Interior_dark} position={[0.005, -0.004, -0.004]} />
        </group>
        <group position={[-0.346, 0.799, -0.346]} rotation={[-1.92, 0, 0]}>
          <mesh geometry={nodes.steering_carbon.geometry} material={materials.Carbon_Fiber} position={[0, 0.016, 0.006]} rotation={[Math.PI / 9, 0, 0]} />
          <mesh geometry={nodes.steering_centre.geometry} material={materials.Ferrari_Yellow} />
          <mesh geometry={nodes.steering_column.geometry} material={materials.Interior_dark} position={[0, 0.068, -0.015]} rotation={[Math.PI / 9, 0, 0]} />
          <mesh geometry={nodes.steering_leather.geometry} material={materials.Leather} position={[0, 0.015, 0.007]} rotation={[Math.PI / 9, 0, 0]} />
          <mesh geometry={nodes.steering_metal.geometry} material={materials.metal_gray} position={[0.086, 0.021, -0.066]} rotation={[Math.PI / 9, 0, 0]} />
          <mesh geometry={nodes.steering_red_lights.geometry} material={materials.Taillight_Glass} position={[0.006, 0.02, -0.072]} rotation={[Math.PI / 9, 0, 0]} />
          <mesh geometry={nodes.steering_trim.geometry} material={materials.Leather_red} position={[0, 0.016, -0.075]} rotation={[Math.PI / 9, 0, 0]} />
        </group>
      </CarPart>

      {/* ═══════ WHEELS & TIRES ═══════ */}
      <CarPart partName="Wheels & Tires" offset={[0, 0, 1.8]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0.824, 0.358, 1.496]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.wheel.geometry} material={materials.metal_gray} position={[0, 0, -0.001]} />
          <mesh geometry={nodes.tire.geometry} material={materials.Tires} position={[-0.005, 0, 0]} />
          <mesh geometry={nodes.rim_rr.geometry} material={materials.metal_gray} position={[0.125, 0, -0.001]} />
          <mesh geometry={nodes.centre.geometry} material={materials.Ferrari_Yellow} position={[0.113, 0, -0.001]} />
          <mesh geometry={nodes.nuts.geometry} material={materials.Interior_dark} position={[0.103, 0, 0.006]} />
        </group>
        <group position={[-0.821, 0.358, 1.495]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.tire_1.geometry} material={materials.Tires} position={[0.006, 0, 0]} />
          <mesh geometry={nodes.centre_1.geometry} material={materials.Ferrari_Yellow} position={[-0.113, 0, -0.001]} />
          <mesh geometry={nodes.wheel_1.geometry} material={materials.metal_gray} position={[0, 0, -0.001]} />
          <mesh geometry={nodes.rim_rl.geometry} material={materials.metal_gray} position={[-0.125, 0, -0.001]} />
          <mesh geometry={nodes.nuts_1.geometry} material={materials.Interior_dark} position={[-0.103, 0, 0.006]} />
        </group>
        <group position={[-0.843, 0.358, -1.155]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.rim_fl.geometry} material={materials.metal_gray} position={[-0.114, 0, -0.001]} />
          <mesh geometry={nodes.centre_2.geometry} material={materials.Ferrari_Yellow} position={[-0.102, 0, -0.001]} />
          <mesh geometry={nodes.nuts_2.geometry} material={materials.Interior_dark} position={[-0.094, 0, 0.006]} />
          <mesh geometry={nodes.wheel_2.geometry} material={materials.metal_gray} position={[0, 0, -0.001]} />
          <mesh geometry={nodes.tire_2.geometry} material={materials.Tires} position={[0.005, 0, 0]} />
        </group>
        <group position={[0.829, 0.361, -1.154]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.centre_3.geometry} material={materials.Ferrari_Yellow} position={[0.102, 0, -0.001]} />
          <mesh geometry={nodes.wheel_3.geometry} material={materials.metal_gray} position={[0, 0, -0.001]} />
          <mesh geometry={nodes.rim_fr.geometry} material={materials.metal_gray} position={[0.114, 0, -0.001]} />
          <mesh geometry={nodes.tire_3.geometry} material={materials.Tires} position={[-0.005, 0, 0]} />
          <mesh geometry={nodes.nuts_3.geometry} material={materials.Interior_dark} position={[0.094, 0, 0.006]} />
        </group>
      </CarPart>

      {/* ═══════ SUSPENSION & BRAKES ═══════ */}
      <CarPart partName="Suspension & Brakes" offset={[0, -0.4, 1.4]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0.824, 0.358, 1.496]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.brake.geometry} material={materials.metal_gray} position={[0.009, 0.001, -0.001]} />
        </group>
        <group position={[-0.821, 0.358, 1.495]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.brake_1.geometry} material={materials.metal_gray} position={[-0.018, -0.001, -0.001]} />
        </group>
        <group position={[-0.843, 0.358, -1.155]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.brake_2.geometry} material={materials.metal_gray} position={[-0.002, -0.001, -0.001]} />
        </group>
        <group position={[0.829, 0.361, -1.154]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={nodes.brake_3.geometry} material={materials.metal_gray} position={[0.001, 0, -0.001]} />
        </group>
        {/* Rear subframe procedurally generated since model lacks it */}
        <mesh position={[0, 0.3, 1.4]} castShadow>
          <boxGeometry args={[1.2, 0.06, 0.4]} />
          <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} transparent opacity={op('Suspension & Brakes')} />
        </mesh>
        {/* Front subframe */}
        <mesh position={[0, 0.3, -1.15]} castShadow>
          <boxGeometry args={[1.2, 0.06, 0.4]} />
          <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} transparent opacity={op('Suspension & Brakes')} />
        </mesh>
      </CarPart>

      {/* ═══════ PROCEDURAL EV COMPONENTS (Inside the shell) ═══════ */}

      {/* CHASSIS FRAME */}
      <CarPart partName="Chassis Frame" offset={[0, -0.6, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <mesh position={[0, 0.25, 0.1]} castShadow>
          <boxGeometry args={[1.4, 0.05, 3.2]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.4} transparent opacity={op('Chassis Frame')} />
        </mesh>
      </CarPart>

      {/* BATTERY PACK */}
      <CarPart partName="Battery Pack" offset={[0, -1.2, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <RoundedBox args={[1.3, 0.15, 2.4]} radius={0.03} position={[0, 0.18, 0.1]} castShadow>
          <meshStandardMaterial color="#6366f1" metalness={0.5} roughness={0.3} transparent opacity={op('Battery Pack')} />
        </RoundedBox>
        {/* Cells */}
        {[-0.8, -0.2, 0.4, 1.0].map((z, i) => (
          <mesh key={z} position={[0, 0.18, z]}>
            <boxGeometry args={[1.1, 0.1, 0.4]} />
            <meshStandardMaterial color="#7c7cf8" transparent opacity={op('Battery Pack') * 0.5} />
          </mesh>
        ))}
        {/* HV lines */}
        <mesh position={[0.7, 0.18, 1.3]}>
          <boxGeometry args={[0.08, 0.05, 0.1]} />
          <meshStandardMaterial color="#f97316" transparent opacity={op('Battery Pack')} />
        </mesh>
      </CarPart>

      {/* ELECTRIC MOTOR */}
      <CarPart partName="Electric Motor" offset={[-2.0, 0.5, 0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0, 0.35, 1.4]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.6, 32]} />
            <meshStandardMaterial color="#ec4899" metalness={0.6} roughness={0.3} transparent opacity={op('Electric Motor')} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 16]} />
            <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.1} transparent opacity={op('Electric Motor')} />
          </mesh>
        </group>
      </CarPart>

      {/* POWER ELECTRONICS */}
      <CarPart partName="Power Electronics" offset={[2.0, 0.8, 0.5]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0, 0.5, 1.2]}>
          <RoundedBox args={[0.6, 0.2, 0.4]} radius={0.02} castShadow>
            <meshStandardMaterial color="#06b6d4" metalness={0.6} roughness={0.2} transparent opacity={op('Power Electronics')} />
          </RoundedBox>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.5, 0.02, 0.3]} />
            <meshStandardMaterial color="#22d3ee" transparent opacity={op('Power Electronics')} />
          </mesh>
        </group>
      </CarPart>

      {/* THERMAL SYSTEM */}
      <CarPart partName="Thermal System" offset={[2.0, 0.3, -1.0]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        <group position={[0, 0.4, -1.5]}>
          <mesh castShadow>
            <boxGeometry args={[1.0, 0.4, 0.1]} />
            <meshStandardMaterial color="#f97316" metalness={0.4} roughness={0.4} transparent opacity={op('Thermal System')} />
          </mesh>
          <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 24]} />
            <meshStandardMaterial color="#333" transparent opacity={op('Thermal System')} />
          </mesh>
          <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 24]} />
            <meshStandardMaterial color="#333" transparent opacity={op('Thermal System')} />
          </mesh>
        </group>
      </CarPart>

      {/* WIRING HARNESS */}
      <CarPart partName="Wiring Harness" offset={[0, 1.2, -1.5]} disassembled={isExploded} selectedPart={selectedPart} onSelect={onSelectPart}>
        {[0.1, 0.05, 0, -0.05, -0.1].map((x, i) => (
          <mesh key={i} position={[x, 0.3, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 3.0, 8]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color={['#a855f7', '#f97316', '#22d3ee', '#a855f7', '#ef4444'][i]} transparent opacity={op('Wiring Harness')} />
          </mesh>
        ))}
      </CarPart>

    </group>
  );
}
// Preload the model
useGLTF.preload('/models/ferrari.glb');
