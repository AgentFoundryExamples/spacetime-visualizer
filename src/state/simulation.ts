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
import {
  computeCurvatureGrid,
  CurvatureValidationError,
} from '../physics/curvature';
import type { ScenarioPreset } from '../physics/scenarios';
import {
  getScenarioConfig,
  DEFAULT_BOUNDS,
  DEFAULT_TIME_STEP,
  DEFAULT_RESOLUTION,
} from '../physics/scenarios';

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

  /** Seed for deterministic scenario generation */
  seed: number;

  /** Whether the simulation is currently computing */
  isComputing: boolean;

  /** Last validation error message (null if valid) */
  error: string | null;

  /** Load a preset scenario */
  loadScenario: (preset: ScenarioPreset, seed?: number) => void;

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
  seed: 42,
  isComputing: false,
  error: null,

  loadScenario: (preset: ScenarioPreset, seed?: number) => {
    const newSeed = seed ?? get().seed;
    const config = getScenarioConfig(preset, newSeed);

    set({
      config,
      currentPreset: preset,
      seed: newSeed,
      error: null,
    });

    // Auto-compute after loading
    get().compute();
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

    try {
      const result = computeCurvatureGrid(config);
      set({ result, isComputing: false, error: null });
    } catch (err) {
      const message =
        err instanceof CurvatureValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error during computation';
      set({ result: null, isComputing: false, error: message });
    }
  },

  reset: () => {
    set({
      config: getInitialConfig(),
      result: null,
      currentPreset: null,
      seed: 42,
      isComputing: false,
      error: null,
    });
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
