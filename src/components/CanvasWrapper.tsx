/**
 * Copyright 2025 John Brosnihan
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';
import { useSimulationStore } from '../state/simulation';
import {
  buildCurvatureMesh,
  createBufferGeometry,
  createCurvatureMaterial,
  createAxesHelper,
  createGridHelper,
} from '../visualization';

/**
 * Props for CanvasWrapper component.
 */
export interface CanvasWrapperProps {
  /** Whether auto-rotate is enabled */
  autoRotate?: boolean;
  /** Whether animation is paused */
  isPaused?: boolean;
  /** Callback to set the reset camera function */
  onResetCameraRef?: (resetFn: () => void) => void;
}

/**
 * Default camera position.
 */
const DEFAULT_CAMERA_POSITION: [number, number, number] = [10, 10, 10];

/**
 * Inner scene component that handles Three.js rendering.
 */
function SpacetimeMesh({ isPaused }: { isPaused: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Get simulation result from store
  const result = useSimulationStore((state) => state.result);

  // Create material (memoized)
  const material = useMemo(() => createCurvatureMaterial(), []);

  // Build geometry from curvature data
  useEffect(() => {
    if (!result || !meshRef.current) return;

    const meshData = buildCurvatureMesh(result);
    const newGeometry = createBufferGeometry(meshData);

    // Dispose old geometry
    if (geometryRef.current) {
      geometryRef.current.dispose();
    }

    geometryRef.current = newGeometry;
    meshRef.current.geometry = newGeometry;
  }, [result]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      material.dispose();
    };
  }, [material]);

  // Simple animation (gentle oscillation when not paused)
  useFrame(() => {
    if (!isPaused && meshRef.current) {
      // Subtle breathing animation
      const time = performance.now() * 0.001;
      meshRef.current.position.z = Math.sin(time) * 0.1;
    }
  });

  if (!result) {
    return null;
  }

  return (
    <mesh ref={meshRef} material={material}>
      <bufferGeometry />
    </mesh>
  );
}

/**
 * Mass spheres visualization component.
 */
function MassSpheres() {
  const masses = useSimulationStore((state) => state.config.masses);

  return (
    <>
      {masses.map((mass) => (
        <mesh key={mass.id} position={mass.position}>
          <sphereGeometry args={[mass.radius ?? 0.3, 16, 16]} />
          <meshStandardMaterial
            color={mass.color ?? '#ffcc00'}
            emissive={mass.color ?? '#ffcc00'}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * Scene helpers (axes and grid).
 */
function SceneHelpers() {
  const axesHelper = useMemo(() => createAxesHelper(6), []);
  const gridHelper = useMemo(() => createGridHelper(12, 12), []);

  return (
    <>
      <primitive object={axesHelper} />
      <primitive object={gridHelper} />
    </>
  );
}

/**
 * Camera controller with reset capability.
 */
function CameraController({
  autoRotate,
  onResetCameraRef,
}: {
  autoRotate: boolean;
  onResetCameraRef?: (resetFn: () => void) => void;
}) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const { camera } = useThree();

  const resetCamera = useCallback(() => {
    if (camera) {
      camera.position.set(...DEFAULT_CAMERA_POSITION);
      camera.lookAt(0, 0, 0);
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera]);

  // Provide reset function to parent
  useEffect(() => {
    onResetCameraRef?.(resetCamera);
  }, [onResetCameraRef, resetCamera]);

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={50}
      makeDefault
    />
  );
}

/**
 * WebGL context loss handler component.
 */
function ContextLossHandler({ onContextLost }: { onContextLost: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost. Attempting to restore...');
      onContextLost();
    };

    const handleContextRestored = () => {
      console.info('WebGL context restored.');
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, onContextLost]);

  return null;
}

/**
 * Main canvas wrapper component for Three.js visualization.
 * Handles WebGL context, camera controls, and responsive resizing.
 */
export function CanvasWrapper({
  autoRotate = false,
  isPaused = false,
  onResetCameraRef,
}: CanvasWrapperProps) {
  const [contextLost, setContextLost] = useState(false);
  const [key, setKey] = useState(0);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
    // Attempt to restore by remounting the canvas
    setTimeout(() => {
      setKey((k) => k + 1);
      setContextLost(false);
    }, 1000);
  }, []);

  if (contextLost) {
    return (
      <div
        className="canvas-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>
          Restoring WebGL context...
        </p>
      </div>
    );
  }

  return (
    <Canvas
      key={key}
      className="three-canvas"
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      camera={{ position: DEFAULT_CAMERA_POSITION, fov: 60 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#1a1a2e');
      }}
    >
      <ContextLossHandler onContextLost={handleContextLost} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-5, 5, 10]} intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.3} />

      {/* Scene content */}
      <SpacetimeMesh isPaused={isPaused} />
      <MassSpheres />
      <SceneHelpers />

      {/* Camera controls */}
      <CameraController
        autoRotate={autoRotate}
        onResetCameraRef={onResetCameraRef}
      />
    </Canvas>
  );
}
