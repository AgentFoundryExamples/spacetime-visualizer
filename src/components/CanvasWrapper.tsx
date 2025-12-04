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
import type { VisualizationMode } from '../content/strings';
import {
  createAxesHelper,
  createGridHelper,
} from '../visualization';
import {
  getModeRenderer,
  disposeResources,
  type DisposableResources,
} from '../visualization/modes';

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
 * Inner scene component that handles Three.js rendering with mode support.
 */
function SpacetimeVisualization({
  isPaused,
  mode,
}: {
  isPaused: boolean;
  mode: VisualizationMode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentObjectRef = useRef<THREE.Object3D | null>(null);
  const resourcesRef = useRef<DisposableResources | null>(null);
  const currentModeRef = useRef<VisualizationMode>(mode);

  // Get simulation result from store
  const result = useSimulationStore((state) => state.result);

  // Get the renderer for the current mode
  const renderer = useMemo(() => getModeRenderer(mode), [mode]);

  // Build/update visualization when result or mode changes
  useEffect(() => {
    if (!result || !groupRef.current) return;

    const modeChanged = currentModeRef.current !== mode;
    currentModeRef.current = mode;

    // If mode changed or no current object, do a full render
    if (modeChanged || !currentObjectRef.current) {
      // Dispose old resources
      if (resourcesRef.current) {
        disposeResources(resourcesRef.current);
      }
      if (currentObjectRef.current && groupRef.current) {
        groupRef.current.remove(currentObjectRef.current);
      }

      // Render new visualization
      const { object, resources } = renderer.render(result);
      currentObjectRef.current = object;
      resourcesRef.current = resources;
      groupRef.current.add(object);
    } else {
      // Try to update existing visualization
      const updateSuccessful = renderer.update(result, currentObjectRef.current);
      if (!updateSuccessful) {
        // Update failed, need full re-render
        if (resourcesRef.current) {
          disposeResources(resourcesRef.current);
        }
        if (currentObjectRef.current && groupRef.current) {
          groupRef.current.remove(currentObjectRef.current);
        }

        const { object, resources } = renderer.render(result);
        currentObjectRef.current = object;
        resourcesRef.current = resources;
        groupRef.current.add(object);
      }
    }
  }, [result, mode, renderer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resourcesRef.current) {
        disposeResources(resourcesRef.current);
      }
    };
  }, []);

  // Simple animation (gentle oscillation when not paused)
  useFrame(() => {
    if (!isPaused && groupRef.current) {
      // Subtle breathing animation
      const time = performance.now() * 0.001;
      groupRef.current.position.z = Math.sin(time) * 0.1;
    }
  });

  if (!result) {
    return null;
  }

  return <group ref={groupRef} />;
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
 * Maximum number of context loss recovery attempts before giving up.
 */
const MAX_CONTEXT_RESTORE_ATTEMPTS = 3;

/**
 * Base delay for context restoration (ms). Uses exponential backoff.
 */
const CONTEXT_RESTORE_BASE_DELAY_MS = 1000;

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
  const [restoreAttempts, setRestoreAttempts] = useState(0);

  // Get visualization mode from store
  const visualizationMode = useSimulationStore((state) => state.visualizationMode);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
    setRestoreAttempts((prev) => {
      const attempts = prev + 1;
      if (attempts > MAX_CONTEXT_RESTORE_ATTEMPTS) {
        console.error(
          `WebGL context lost ${attempts} times. Not attempting further restoration.`
        );
        return attempts;
      }
      // Exponential backoff: 1s, 2s, 4s
      const delay = CONTEXT_RESTORE_BASE_DELAY_MS * Math.pow(2, attempts - 1);
      setTimeout(() => {
        setKey((k) => k + 1);
        setContextLost(false);
      }, delay);
      return attempts;
    });
  }, []);

  if (contextLost) {
    const maxAttemptsExceeded = restoreAttempts > MAX_CONTEXT_RESTORE_ATTEMPTS;
    return (
      <div
        className="canvas-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>
          {maxAttemptsExceeded
            ? 'WebGL context could not be restored. Please refresh the page.'
            : `Restoring WebGL context... (attempt ${restoreAttempts}/${MAX_CONTEXT_RESTORE_ATTEMPTS})`}
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
        preserveDrawingBuffer: false,
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
      <SpacetimeVisualization isPaused={isPaused} mode={visualizationMode} />
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
