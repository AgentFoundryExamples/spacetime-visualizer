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

import type { MassSource, CurvatureGridConfig } from './types';

/**
 * Preset scenario identifiers.
 */
export type ScenarioPreset =
  | 'single-mass'
  | 'binary-orbit'
  | 'triple-system'
  | 'cluster';

/**
 * Description of a scenario preset.
 */
export interface ScenarioDescription {
  id: ScenarioPreset;
  name: string;
  description: string;
  massCount: number;
}

/**
 * Available scenario presets with descriptions.
 */
export const SCENARIO_PRESETS: ScenarioDescription[] = [
  {
    id: 'single-mass',
    name: 'Single Mass',
    description: 'A single massive object at the center, demonstrating spherically symmetric curvature.',
    massCount: 1,
  },
  {
    id: 'binary-orbit',
    name: 'Binary System',
    description: 'Two masses in orbital configuration, showing gravitational interaction.',
    massCount: 2,
  },
  {
    id: 'triple-system',
    name: 'Triple System',
    description: 'Three-body configuration demonstrating complex gravitational superposition.',
    massCount: 3,
  },
  {
    id: 'cluster',
    name: 'Mass Cluster',
    description: 'A cluster of multiple masses showing aggregate curvature effects.',
    massCount: 5,
  },
];

/**
 * Simple deterministic pseudo-random number generator.
 * Uses a linear congruential generator (LCG) for reproducibility.
 *
 * @param seed - Initial seed value
 * @returns Function that returns next random number in [0, 1)
 */
export function createSeededRandom(seed: number): () => number {
  // LCG parameters (Numerical Recipes values)
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;

  let state = seed >>> 0; // Ensure unsigned 32-bit

  return () => {
    state = (a * state + c) % m;
    return state / m;
  };
}

/**
 * Default grid bounds for visualization.
 * Centered at origin with unit cube extent.
 */
export const DEFAULT_BOUNDS: [number, number, number, number, number, number] = [
  -5, -5, -5, 5, 5, 5,
];

/**
 * Default time step for simulations (seconds).
 */
export const DEFAULT_TIME_STEP = 0.016; // ~60fps

/**
 * Default grid resolution.
 */
export const DEFAULT_RESOLUTION = 16;

/**
 * Generates a single-mass scenario configuration.
 * Places one mass at the center of the grid.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a single centered mass
 */
export function generateSingleMassScenario(seed: number = 42): CurvatureGridConfig {
  // Single mass doesn't need randomness, but we accept seed for API consistency
  void seed;

  const masses: MassSource[] = [
    {
      id: 'center-mass',
      position: [0, 0, 0],
      mass: 100,
      radius: 0.5,
      color: '#ffcc00',
    },
  ];

  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses,
  };
}

/**
 * Generates a binary system scenario configuration.
 * Places two masses on opposite sides of the center.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a binary system
 */
export function generateBinaryScenario(seed: number = 42): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  // Randomize separation and mass ratio slightly
  const separation = 2 + random() * 2; // 2-4 units apart
  const massRatio = 0.5 + random() * 0.5; // 0.5-1.0

  const baseMass = 80;
  const masses: MassSource[] = [
    {
      id: 'mass-1',
      position: [-separation / 2, 0, 0],
      mass: baseMass,
      radius: 0.4,
      color: '#ff6b6b',
    },
    {
      id: 'mass-2',
      position: [separation / 2, 0, 0],
      mass: baseMass * massRatio,
      radius: 0.35,
      color: '#4ecdc4',
    },
  ];

  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses,
  };
}

/**
 * Generates a triple system scenario configuration.
 * Places three masses in a triangular configuration.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a triple system
 */
export function generateTripleScenario(seed: number = 42): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  const radius = 2 + random() * 1.5; // 2-3.5 units from center
  const baseMass = 60;

  // Place masses at vertices of equilateral triangle in XY plane
  const masses: MassSource[] = [];
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];

  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 + random() * 0.2;
    const massVariation = 0.8 + random() * 0.4;

    masses.push({
      id: `mass-${i + 1}`,
      position: [
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        (random() - 0.5) * 0.5, // Small z variation
      ],
      mass: baseMass * massVariation,
      radius: 0.3 + random() * 0.1,
      color: colors[i],
    });
  }

  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses,
  };
}

/**
 * Generates a cluster scenario configuration.
 * Places multiple masses in a cluster formation.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a mass cluster
 */
export function generateClusterScenario(seed: number = 42): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  const clusterRadius = 3;
  const baseMass = 30;
  const numMasses = 5;

  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#dda0dd'];
  const masses: MassSource[] = [];

  for (let i = 0; i < numMasses; i++) {
    // Random position within cluster sphere
    const theta = random() * 2 * Math.PI;
    const phi = Math.acos(2 * random() - 1);
    const r = clusterRadius * Math.cbrt(random()); // Uniform in volume

    masses.push({
      id: `mass-${i + 1}`,
      position: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      mass: baseMass * (0.5 + random()),
      radius: 0.25 + random() * 0.15,
      color: colors[i % colors.length],
    });
  }

  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses,
  };
}

/**
 * Gets a scenario configuration by preset name.
 *
 * @param preset - The scenario preset identifier
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for the requested scenario
 */
export function getScenarioConfig(
  preset: ScenarioPreset,
  seed: number = 42
): CurvatureGridConfig {
  switch (preset) {
    case 'single-mass':
      return generateSingleMassScenario(seed);
    case 'binary-orbit':
      return generateBinaryScenario(seed);
    case 'triple-system':
      return generateTripleScenario(seed);
    case 'cluster':
      return generateClusterScenario(seed);
    default: {
      // Exhaustive check
      const _exhaustive: never = preset;
      throw new Error(`Unknown scenario preset: ${_exhaustive}`);
    }
  }
}

/**
 * Creates a custom scenario configuration with the given masses.
 *
 * @param masses - Array of mass sources
 * @param options - Optional configuration overrides
 * @returns CurvatureGridConfig for the custom scenario
 */
export function createCustomScenario(
  masses: MassSource[],
  options: Partial<Omit<CurvatureGridConfig, 'masses'>> = {}
): CurvatureGridConfig {
  return {
    resolution: options.resolution ?? DEFAULT_RESOLUTION,
    bounds: options.bounds ?? DEFAULT_BOUNDS,
    timeStep: options.timeStep ?? DEFAULT_TIME_STEP,
    masses,
  };
}
