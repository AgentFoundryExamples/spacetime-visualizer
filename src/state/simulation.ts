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

  loadScenario: (preset: ScenarioPreset, seed?: number) => {
    const newSeed = seed ?? get().seed;
    const config = getScenarioConfig(preset, newSeed);

    set({
      config,
      currentPreset: preset,
      seed: newSeed,
      error: null,
      simulationTime: 0, // Reset simulation time when loading a new scenario
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
    const { config, orbitsEnabled, simulationTime, timeScale, isComputing } = get();

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

    set({
      simulationTime: newTime,
      config: {
        ...config,
        masses: updatedMasses,
      },
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
    });

    // Trigger curvature recomputation
    get().compute();
  },
}));

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
