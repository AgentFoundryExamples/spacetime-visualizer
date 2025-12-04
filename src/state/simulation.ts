// Copyright 2025 John Brosnihan
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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

import { create } from 'zustand';
import type {
  MassSource,
  CurvatureGridConfig,
  CurvatureGridResult,
} from '../physics/types';
import { CurvatureValidationError } from '../physics/curvature';
import type { ScenarioPreset } from '../physics/scenarios';
import {
  getScenarioConfig,
  DEFAULT_BOUNDS,
  DEFAULT_TIME_STEP,
  DEFAULT_RESOLUTION,
} from '../physics/scenarios';
import { updateMassPositions, ORBITAL_CONSTRAINTS } from '../physics/orbit';
import type { VisualizationMode } from '../content/strings';
import {
  getPhysicsComputer,
  terminatePhysicsComputer,
} from '../workers';
import type { WaveParameters } from '../visualization/modes';
import {
  DEFAULT_WAVE_PARAMETERS,
  clampWaveAmplitude,
  clampWaveFrequency,
} from '../visualization/modes';

/**
 * A single position sample in a trail.
 */
export interface TrailPoint {
  /** Position at this sample [x, y, z] */
  position: [number, number, number];
  /** Simulation time when this sample was taken */
  timestamp: number;
}

/**
 * Trail history for a single mass.
 */
export interface MassTrail {
  /** ID of the mass this trail belongs to */
  massId: string;
  /** Trail position history (newest last) */
  points: TrailPoint[];
}

/**
 * Configuration for trail visualization.
 */
export interface TrailConfig {
  /** Whether trail visualization is enabled */
  enabled: boolean;
  /** Maximum number of trail points to keep per mass */
  maxPoints: number;
  /** Minimum time between trail samples (seconds) */
  sampleInterval: number;
}

/**
 * Default trail configuration.
 */
export const DEFAULT_TRAIL_CONFIG: TrailConfig = {
  enabled: false,
  maxPoints: 100,
  sampleInterval: 0.05,
};

/**
 * Minimum trail sample interval (seconds) to avoid overdraw at high speeds.
 */
export const MIN_TRAIL_SAMPLE_INTERVAL = 0.01;

/**
 * Maximum trail sample interval (seconds).
 */
export const MAX_TRAIL_SAMPLE_INTERVAL = 1.0;

/**
 * Minimum number of trail points.
 */
export const MIN_TRAIL_POINTS = 10;

/**
 * Maximum number of trail points to prevent memory issues.
 */
export const MAX_TRAIL_POINTS = 500;

/**
 * Simulation state and actions.
 */
export interface SimulationState {
  /** Current grid configuration */
  config: CurvatureGridConfig;

  /** Current curvature computation result */
  result: CurvatureGridResult | null;

  /** Current scenario preset (null for custom) */
  currentPreset: ScenarioPreset | null;

  /** Current visualization mode */
  visualizationMode: VisualizationMode;

  /** Seed for deterministic scenario generation */
  seed: number;

  /** Whether the simulation is currently computing */
  isComputing: boolean;

  /** Last validation error message (null if valid) */
  error: string | null;

  /** Whether orbital motion is enabled */
  orbitsEnabled: boolean;

  /** Current simulation time for orbital motion */
  simulationTime: number;

  /** Time scale multiplier for orbital motion (0 = paused, 1 = normal speed) */
  timeScale: number;

  /** Whether physics computation is using a Web Worker */
  isUsingWorker: boolean;

  /** Warning message about worker status (null if no warning) */
  workerWarning: string | null;

  /** Wave parameters for gravitational wave mode */
  waveParams: WaveParameters;

  /** Trail configuration */
  trailConfig: TrailConfig;

  /** Trail history for each mass */
  trails: MassTrail[];

  /** Last time a trail sample was taken */
  lastTrailSampleTime: number;

  /** Load a preset scenario */
  loadScenario: (preset: ScenarioPreset, seed?: number) => void;

  /** Load a custom configuration */
  loadCustomConfig: (config: CurvatureGridConfig) => void;

  /** Set visualization mode */
  setVisualizationMode: (mode: VisualizationMode) => void;

  /** Update masses in the current configuration */
  setMasses: (masses: MassSource[]) => void;

  /** Add a mass source */
  addMass: (mass: MassSource) => void;

  /** Remove a mass source by id */
  removeMass: (id: string) => void;

  /** Update a specific mass source */
  updateMass: (id: string, updates: Partial<Omit<MassSource, 'id'>>) => void;

  /** Update grid resolution */
  setResolution: (resolution: number) => void;

  /** Update grid bounds */
  setBounds: (bounds: [number, number, number, number, number, number]) => void;

  /** Update time step */
  setTimeStep: (timeStep: number) => void;

  /** Recompute curvature with current configuration */
  compute: () => void;

  /** Reset to initial state */
  reset: () => void;

  /** Enable or disable orbital motion */
  setOrbitsEnabled: (enabled: boolean) => void;

  /** Set time scale for orbital motion (0 = paused, 1 = normal speed) */
  setTimeScale: (scale: number) => void;

  /** Update simulation time and advance orbits */
  advanceSimulationTime: (deltaTime: number) => void;

  /** Reset simulation time to zero */
  resetSimulationTime: () => void;

  /** Set wave parameters */
  setWaveParams: (params: Partial<WaveParameters>) => void;

  /** Set trail configuration */
  setTrailConfig: (config: Partial<TrailConfig>) => void;

  /** Clear all trail data */
  clearTrails: () => void;
}

/**
 * Creates the initial configuration state.
 */
function getInitialConfig(): CurvatureGridConfig {
  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses: [],
  };
}

/**
 * Global simulation state store using Zustand.
 * Manages physics configuration and curvature computation.
 */
export const useSimulationStore = create<SimulationState>((set, get) => ({
  config: getInitialConfig(),
  result: null,
  currentPreset: null,
  visualizationMode: 'mesh',
  seed: 42,
  isComputing: false,
  error: null,
  orbitsEnabled: false,
  simulationTime: 0,
  timeScale: 1,
  isUsingWorker: false,
  workerWarning: null,
  waveParams: { ...DEFAULT_WAVE_PARAMETERS },
  trailConfig: { ...DEFAULT_TRAIL_CONFIG },
  trails: [],
  lastTrailSampleTime: 0,

  loadScenario: (preset: ScenarioPreset, seed?: number) => {
    const newSeed = seed ?? get().seed;
    const config = getScenarioConfig(preset, newSeed);

    set({
      config,
      currentPreset: preset,
      seed: newSeed,
      error: null,
      simulationTime: 0, // Reset simulation time when loading a new scenario
      trails: [], // Clear trails when loading a new scenario
      lastTrailSampleTime: 0,
    });

    // Auto-compute after loading
    get().compute();
  },

  loadCustomConfig: (config: CurvatureGridConfig) => {
    set({
      config: { ...config },
      currentPreset: null,
      error: null,
      simulationTime: 0,
      trails: [], // Clear trails when loading custom config
      lastTrailSampleTime: 0,
    });

    // Auto-compute after loading
    get().compute();
  },

  setVisualizationMode: (mode: VisualizationMode) => {
    set({ visualizationMode: mode });
  },

  setMasses: (masses: MassSource[]) => {
    set((state) => ({
      config: { ...state.config, masses },
      currentPreset: null, // Custom configuration
      error: null,
    }));
  },

  addMass: (mass: MassSource) => {
    set((state) => ({
      config: {
        ...state.config,
        masses: [...state.config.masses, mass],
      },
      currentPreset: null,
      error: null,
    }));
  },

  removeMass: (id: string) => {
    set((state) => ({
      config: {
        ...state.config,
        masses: state.config.masses.filter((m) => m.id !== id),
      },
      currentPreset: null,
      error: null,
    }));
  },

  updateMass: (id: string, updates: Partial<Omit<MassSource, 'id'>>) => {
    set((state) => ({
      config: {
        ...state.config,
        masses: state.config.masses.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      },
      currentPreset: null,
      error: null,
    }));
  },

  setResolution: (resolution: number) => {
    set((state) => ({
      config: { ...state.config, resolution },
      error: null,
    }));
  },

  setBounds: (bounds: [number, number, number, number, number, number]) => {
    set((state) => ({
      config: { ...state.config, bounds },
      error: null,
    }));
  },

  setTimeStep: (timeStep: number) => {
    set((state) => ({
      config: { ...state.config, timeStep },
      error: null,
    }));
  },

  compute: () => {
    const { config } = get();

    set({ isComputing: true, error: null });

    // Use Web Worker for computation when available
    getPhysicsComputer({
      onWarning: (message) => {
        set({ workerWarning: message });
      },
      onError: (error) => {
        set({ error: error.message, isComputing: false });
      },
    })
      .then((computer) => {
        // Update worker status
        set({ isUsingWorker: computer.isWorkerBased });
        return computer.compute(config);
      })
      .then((result) => {
        set({ result, isComputing: false, error: null });
      })
      .catch((err) => {
        const message =
          err instanceof CurvatureValidationError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unknown error during computation';
        set({ result: null, isComputing: false, error: message });
      });
  },

  reset: () => {
    // Terminate the physics worker on reset
    terminatePhysicsComputer();
    set({
      config: getInitialConfig(),
      result: null,
      currentPreset: null,
      visualizationMode: 'mesh',
      seed: 42,
      isComputing: false,
      error: null,
      orbitsEnabled: false,
      simulationTime: 0,
      timeScale: 1,
      isUsingWorker: false,
      workerWarning: null,
      waveParams: { ...DEFAULT_WAVE_PARAMETERS },
      trailConfig: { ...DEFAULT_TRAIL_CONFIG },
      trails: [],
      lastTrailSampleTime: 0,
    });
  },

  setOrbitsEnabled: (enabled: boolean) => {
    set((state) => ({
      orbitsEnabled: enabled,
      // When enabling orbits, ensure timeScale is non-zero to start animation
      timeScale: enabled ? (state.timeScale === 0 ? 1 : state.timeScale) : state.timeScale,
      config: {
        ...state.config,
        orbitsEnabled: enabled,
      },
    }));
  },

  setTimeScale: (scale: number) => {
    // Clamp timeScale between 0 and 10 to prevent numerical instability
    // and unrealistic simulation speeds that could break the physics model
    set({ timeScale: Math.max(0, Math.min(10, scale)) });
  },

  advanceSimulationTime: (deltaTime: number) => {
    // Note: Zustand's get() provides atomic state reads, and set() performs
    // atomic updates. The guard checks and subsequent set() are safe because
    // if state changes between get() and set(), the next animation frame
    // will correctly read the updated state.
    const { config, orbitsEnabled, simulationTime, timeScale, isComputing, trailConfig, trails, lastTrailSampleTime } = get();

    // Don't advance if orbits are disabled, timeScale is zero, or already computing
    if (!orbitsEnabled || timeScale === 0 || isComputing) {
      return;
    }

    // Apply time scale to delta time
    const scaledDelta = deltaTime * timeScale;

    // Clamp delta time to prevent numerical instability
    const clampedDelta = Math.min(
      Math.max(scaledDelta, ORBITAL_CONSTRAINTS.minTimeStep),
      ORBITAL_CONSTRAINTS.maxTimeStep
    );

    const newTime = simulationTime + clampedDelta;

    // Update mass positions based on orbital parameters
    const updatedMasses = updateMassPositions(config.masses, newTime);

    // Sample trails if enabled and enough time has passed
    let newTrails = trails;
    let newLastSampleTime = lastTrailSampleTime;
    if (trailConfig.enabled && newTime - lastTrailSampleTime >= trailConfig.sampleInterval) {
      newTrails = sampleTrails(trails, updatedMasses, newTime, trailConfig.maxPoints);
      newLastSampleTime = newTime;
    }

    set({
      simulationTime: newTime,
      config: {
        ...config,
        masses: updatedMasses,
      },
      trails: newTrails,
      lastTrailSampleTime: newLastSampleTime,
    });

    // Trigger curvature recomputation
    get().compute();
  },

  resetSimulationTime: () => {
    const { config, currentPreset, seed } = get();

    // To ensure a true reset, reload the original scenario config
    // before recalculating positions at t=0.
    const initialConfig = currentPreset
      ? getScenarioConfig(currentPreset, seed)
      : config;

    // Reset positions to t=0 using the pristine config
    const updatedMasses = updateMassPositions(initialConfig.masses, 0);

    set({
      simulationTime: 0,
      config: {
        ...initialConfig,
        masses: updatedMasses,
      },
      trails: [], // Clear trails when resetting simulation time
      lastTrailSampleTime: 0,
    });

    // Trigger curvature recomputation
    get().compute();
  },

  setWaveParams: (params: Partial<WaveParameters>) => {
    set((state) => {
      const newParams = { ...state.waveParams };
      if (params.amplitude !== undefined) {
        newParams.amplitude = clampWaveAmplitude(params.amplitude);
      }
      if (params.frequency !== undefined) {
        newParams.frequency = clampWaveFrequency(params.frequency);
      }
      if (params.enabled !== undefined) {
        newParams.enabled = params.enabled;
      }
      return { waveParams: newParams };
    });
  },

  setTrailConfig: (config: Partial<TrailConfig>) => {
    set((state) => {
      const newConfig = { ...state.trailConfig };
      if (config.enabled !== undefined) {
        newConfig.enabled = config.enabled;
      }
      if (config.maxPoints !== undefined) {
        newConfig.maxPoints = Math.max(
          MIN_TRAIL_POINTS,
          Math.min(MAX_TRAIL_POINTS, config.maxPoints)
        );
      }
      if (config.sampleInterval !== undefined) {
        newConfig.sampleInterval = Math.max(
          MIN_TRAIL_SAMPLE_INTERVAL,
          Math.min(MAX_TRAIL_SAMPLE_INTERVAL, config.sampleInterval)
        );
      }
      return { trailConfig: newConfig };
    });
  },

  clearTrails: () => {
    set({
      trails: [],
      lastTrailSampleTime: 0,
    });
  },
}));

/**
 * Samples current mass positions and adds them to trail history.
 * Uses in-place modification when possible to reduce allocations.
 * Prunes old points if buffer exceeds maxPoints.
 */
function sampleTrails(
  currentTrails: MassTrail[],
  masses: MassSource[],
  timestamp: number,
  maxPoints: number
): MassTrail[] {
  // Only sample masses that have orbital parameters (moving masses)
  const orbitalMasses = masses.filter((m) => m.orbit !== undefined);

  // Build a Map for O(1) trail lookups
  const trailMap = new Map<string, MassTrail>();
  for (const trail of currentTrails) {
    trailMap.set(trail.massId, trail);
  }

  return orbitalMasses.map((mass) => {
    // Find existing trail for this mass using O(1) lookup
    const existingTrail = trailMap.get(mass.id);
    const existingPoints = existingTrail?.points ?? [];

    // Create new point
    const newPoint: TrailPoint = {
      position: [...mass.position] as [number, number, number],
      timestamp,
    };

    // Optimize array operations based on current size
    let newPoints: TrailPoint[];
    if (existingPoints.length >= maxPoints) {
      // At max capacity: shift out oldest and push new (avoid creating intermediate array)
      newPoints = existingPoints.slice(1);
      newPoints.push(newPoint);
    } else {
      // Under capacity: just append
      newPoints = [...existingPoints, newPoint];
    }

    return {
      massId: mass.id,
      points: newPoints,
    };
  });
}

// Re-export types for UI convenience
export type {
  MassSource,
  CurvatureSample,
  CurvatureGridConfig,
  CurvatureGridResult,
} from '../physics/types';
export type { ScenarioPreset, ScenarioDescription } from '../physics/scenarios';
export { SCENARIO_PRESETS } from '../physics/scenarios';
export { CurvatureValidationError } from '../physics/curvature';
export type { VisualizationMode } from '../content/strings';
export { isWorkerSupported, isUsingWorker } from '../workers';
export type { WaveParameters } from '../visualization/modes';
