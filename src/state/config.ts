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

/**
 * Simulation configuration parameters
 */
export interface SimulationConfig {
  /** Grid resolution for the spacetime visualization (cells per axis) */
  gridResolution: number;
  /** Animation timestep in seconds */
  animationTimestep: number;
}

/**
 * Store state including simulation configuration and actions
 */
export interface ConfigState extends SimulationConfig {
  /** Update grid resolution */
  setGridResolution: (resolution: number) => void;
  /** Update animation timestep */
  setAnimationTimestep: (timestep: number) => void;
  /** Reset to default configuration */
  resetToDefaults: () => void;
}

/** Default grid resolution in cells per axis */
export const DEFAULT_GRID_RESOLUTION = 32;

/** Default animation timestep in seconds */
export const DEFAULT_ANIMATION_TIMESTEP = 0.016; // ~60fps

/**
 * Parses an integer from environment variable with fallback to default
 */
function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parses a float from environment variable with fallback to default
 */
function parseEnvFloat(
  value: string | undefined,
  defaultValue: number
): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get initial configuration from environment variables with safe defaults
 */
export function getInitialConfig(): SimulationConfig {
  return {
    gridResolution: parseEnvInt(
      import.meta.env.VITE_GRID_RESOLUTION,
      DEFAULT_GRID_RESOLUTION
    ),
    animationTimestep: parseEnvFloat(
      import.meta.env.VITE_ANIMATION_TIMESTEP,
      DEFAULT_ANIMATION_TIMESTEP
    ),
  };
}

/**
 * Global configuration store using Zustand
 * Manages simulation parameters with .env override support
 */
export const useConfigStore = create<ConfigState>((set) => {
  const initial = getInitialConfig();

  return {
    ...initial,

    setGridResolution: (resolution: number) =>
      set({ gridResolution: resolution }),

    setAnimationTimestep: (timestep: number) =>
      set({ animationTimestep: timestep }),

    resetToDefaults: () =>
      set({
        gridResolution: DEFAULT_GRID_RESOLUTION,
        animationTimestep: DEFAULT_ANIMATION_TIMESTEP,
      }),
  };
});
