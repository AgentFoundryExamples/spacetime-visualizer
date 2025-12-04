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

import type { MassSource, CurvatureGridConfig } from './types';

/**
 * Preset scenario identifiers.
 */
export type ScenarioPreset =
  | 'single-mass'
  | 'binary-orbit'
  | 'gravitational-wave'
  | 'triple-system'
  | 'cluster'
  | 'gravitational-lensing'
  | 'extreme-mass-ratio'
  | 'hierarchical-triple'
  | 'black-hole-inspiral';

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
    description:
      'A single massive object at the center, demonstrating spherically symmetric curvature.',
    massCount: 1,
  },
  {
    id: 'binary-orbit',
    name: 'Binary System',
    description:
      'Two masses in orbital configuration, showing gravitational interaction.',
    massCount: 2,
  },
  {
    id: 'gravitational-wave',
    name: 'Gravitational Wave',
    description:
      'Animated ripple pattern simulating gravitational wave propagation.',
    massCount: 4,
  },
  {
    id: 'triple-system',
    name: 'Triple System',
    description:
      'Three-body configuration demonstrating complex gravitational superposition.',
    massCount: 3,
  },
  {
    id: 'cluster',
    name: 'Mass Cluster',
    description:
      'A cluster of multiple masses showing aggregate curvature effects.',
    massCount: 5,
  },
  {
    id: 'gravitational-lensing',
    name: 'Gravitational Lensing',
    description:
      'A massive central object with test particles, demonstrating light deflection curvature.',
    massCount: 1,
  },
  {
    id: 'extreme-mass-ratio',
    name: 'Extreme Mass Ratio',
    description:
      'A binary with vastly different masses, simulating star-planet or EMRI systems.',
    massCount: 2,
  },
  {
    id: 'hierarchical-triple',
    name: 'Hierarchical Triple',
    description:
      'A close binary orbiting a more massive third body, demonstrating multi-scale dynamics.',
    massCount: 3,
  },
  {
    id: 'black-hole-inspiral',
    name: 'Black Hole Inspiral',
    description:
      'Two equal masses in close orbit, simulating pre-merger gravitational wave sources.',
    massCount: 2,
  },
];

/**
 * Simple deterministic pseudo-random number generator.
 * Uses a linear congruential generator (LCG) for reproducibility.
 *
 * **Note**: This generator is deterministic within a single JavaScript environment.
 * Cross-platform reproducibility is not guaranteed due to potential differences
 * in floating-point handling across JavaScript engines. For scenarios requiring
 * exact cross-platform reproducibility, consider using a fixed-point implementation.
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
    state = (a * state + c) | 0; // Multiplication overflows and wraps, | 0 keeps it 32-bit
    return (state >>> 0) / m; // Use unsigned right shift for division
  };
}

/**
 * Default grid bounds for visualization.
 * Centered at origin with extent of 10 units per axis.
 */
export const DEFAULT_BOUNDS: [number, number, number, number, number, number] =
  [-5, -5, -5, 5, 5, 5];

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
 * @param seed - Random seed for API consistency (used for mass variation)
 * @returns CurvatureGridConfig for a single centered mass
 */
export function generateSingleMassScenario(
  seed: number = 42
): CurvatureGridConfig {
  // Use seed for minor mass variation to maintain API consistency
  const random = createSeededRandom(seed);
  const massVariation = 0.9 + random() * 0.2; // 0.9 to 1.1 multiplier

  const masses: MassSource[] = [
    {
      id: 'center-mass',
      position: [0, 0, 0],
      mass: 100 * massVariation,
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
  const secondaryMass = baseMass * massRatio;
  const totalMass = baseMass + secondaryMass;

  // Compute semi-major axes for binary orbit around center of mass
  const a1 = (separation * secondaryMass) / totalMass;
  const a2 = (separation * baseMass) / totalMass;

  const masses: MassSource[] = [
    {
      id: 'mass-1',
      position: [-separation / 2, 0, 0],
      mass: baseMass,
      radius: 0.4,
      color: '#ff6b6b',
      orbit: {
        semiMajorAxis: a1,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: Math.PI,
      },
    },
    {
      id: 'mass-2',
      position: [separation / 2, 0, 0],
      mass: secondaryMass,
      radius: 0.35,
      color: '#4ecdc4',
      orbit: {
        semiMajorAxis: a2,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: 0,
      },
    },
  ];

  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses,
    orbitsEnabled: false,
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
export function generateClusterScenario(
  seed: number = 42
): CurvatureGridConfig {
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
 * Generates a gravitational wave toy scenario configuration.
 * Places masses in a quadrupole pattern to approximate wave effects.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a gravitational wave scenario
 */
export function generateGravitationalWaveScenario(
  seed: number = 42
): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  // Create a quadrupole pattern with oscillating masses
  const baseRadius = 2.5;
  const baseMass = 50;
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf'];

  const masses: MassSource[] = [];

  // Four masses at cardinal positions to create quadrupole pattern
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + random() * 0.1;
    const radiusVariation = 0.9 + random() * 0.2;

    masses.push({
      id: `wave-mass-${i + 1}`,
      position: [
        baseRadius * radiusVariation * Math.cos(angle),
        baseRadius * radiusVariation * Math.sin(angle),
        0,
      ],
      mass: baseMass * (0.8 + random() * 0.4),
      radius: 0.3,
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
 * Generates a gravitational lensing scenario configuration.
 * Places a single massive object optimized for demonstrating curvature depth.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a gravitational lensing scenario
 */
export function generateGravitationalLensingScenario(
  seed: number = 42
): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  // Large central mass with slight variation
  const massVariation = 0.95 + random() * 0.1;
  const baseMass = 200 * massVariation;

  const masses: MassSource[] = [
    {
      id: 'lens-mass',
      position: [0, 0, 0],
      mass: baseMass,
      radius: 0.8,
      color: '#9b59b6', // Purple for the massive lens
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
 * Generates an extreme mass ratio scenario configuration.
 * Places two masses with vastly different scales (e.g., 100:1 ratio).
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for an extreme mass ratio scenario
 */
export function generateExtremeMassRatioScenario(
  seed: number = 42
): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  // Mass ratio constants for EMRI-like systems
  // Secondary mass is 1-1.5% of primary mass (~67:1 to ~100:1 ratio)
  const MIN_MASS_RATIO = 0.01; // 1% of primary
  const MASS_RATIO_VARIATION = 0.005; // Additional 0-0.5%

  // Large central mass (like a star or massive black hole)
  const primaryMass = 150;
  // Small orbiting mass (like a planet or stellar remnant)
  const secondaryMass = primaryMass * (MIN_MASS_RATIO + random() * MASS_RATIO_VARIATION);

  // Orbital radius for the secondary
  const orbitRadius = 2.5 + random() * 0.5;

  const masses: MassSource[] = [
    {
      id: 'primary-mass',
      position: [0, 0, 0],
      mass: primaryMass,
      radius: 0.6,
      color: '#f39c12', // Orange for the primary
    },
    {
      id: 'secondary-mass',
      position: [orbitRadius, 0, 0],
      mass: secondaryMass,
      radius: 0.15,
      color: '#3498db', // Blue for the secondary
      orbit: {
        semiMajorAxis: orbitRadius,
        eccentricity: 0.1 + random() * 0.1, // Slightly eccentric orbit
        inclination: random() * 0.2 - 0.1, // Small inclination
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: random() * Math.PI * 2,
        initialTrueAnomaly: random() * Math.PI * 2,
      },
    },
  ];

  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses,
    orbitsEnabled: true,
  };
}

/**
 * Generates a hierarchical triple scenario configuration.
 * A close binary orbiting around a more massive third body.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a hierarchical triple scenario
 */
export function generateHierarchicalTripleScenario(
  seed: number = 42
): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  // Outer massive body
  const tertiaryMass = 120;
  // Inner binary masses (roughly equal)
  const primaryMass = 40 * (0.9 + random() * 0.2);
  const secondaryMass = 40 * (0.9 + random() * 0.2);

  // Outer orbit radius (binary center of mass around tertiary)
  const outerRadius = 3.0;
  // Inner binary separation
  const innerSeparation = 0.8 + random() * 0.3;

  // Inner binary positions relative to their center of mass
  const totalInnerMass = primaryMass + secondaryMass;
  const innerOffset1 = (innerSeparation * secondaryMass) / totalInnerMass;
  const innerOffset2 = (innerSeparation * primaryMass) / totalInnerMass;

  // Initial angle for the binary center of mass around tertiary
  const outerAngle = random() * Math.PI * 2;

  // Binary center of mass position
  const binaryCMx = outerRadius * Math.cos(outerAngle);
  const binaryCMy = outerRadius * Math.sin(outerAngle);

  // Inner binary angle
  const innerAngle = random() * Math.PI * 2;

  const masses: MassSource[] = [
    {
      id: 'tertiary-mass',
      position: [0, 0, 0],
      mass: tertiaryMass,
      radius: 0.5,
      color: '#e74c3c', // Red for the massive tertiary
    },
    {
      id: 'primary-mass',
      position: [
        binaryCMx + innerOffset1 * Math.cos(innerAngle),
        binaryCMy + innerOffset1 * Math.sin(innerAngle),
        0,
      ],
      mass: primaryMass,
      radius: 0.35,
      color: '#2ecc71', // Green for primary
    },
    {
      id: 'secondary-mass',
      position: [
        binaryCMx - innerOffset2 * Math.cos(innerAngle),
        binaryCMy - innerOffset2 * Math.sin(innerAngle),
        0,
      ],
      mass: secondaryMass,
      radius: 0.35,
      color: '#3498db', // Blue for secondary
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
 * Generates a black hole inspiral scenario configuration.
 * Two equal masses in close orbit, simulating pre-merger dynamics.
 *
 * @param seed - Random seed for deterministic generation
 * @returns CurvatureGridConfig for a black hole inspiral scenario
 */
export function generateBlackHoleInspiralScenario(
  seed: number = 42
): CurvatureGridConfig {
  const random = createSeededRandom(seed);

  // Two roughly equal masses (like merging black holes)
  const baseMass = 80;
  const massRatio = 0.9 + random() * 0.2; // Close to equal

  const mass1 = baseMass;
  const mass2 = baseMass * massRatio;
  const totalMass = mass1 + mass2;

  // Close separation for inspiral phase
  const separation = 1.2 + random() * 0.3;

  // Compute orbital semi-major axes for center of mass frame
  // a1 is distance from COM to mass1, a2 is distance from COM to mass2
  const a1 = (separation * mass2) / totalMass;
  const a2 = (separation * mass1) / totalMass;

  // Initial phase angle
  const initialPhase = random() * Math.PI * 2;

  const masses: MassSource[] = [
    {
      id: 'bh-1',
      position: [
        -a1 * Math.cos(initialPhase),
        -a1 * Math.sin(initialPhase),
        0,
      ],
      mass: mass1,
      radius: 0.4,
      color: '#2c3e50', // Dark for black hole 1
      orbit: {
        semiMajorAxis: a1,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: Math.PI + initialPhase,
      },
    },
    {
      id: 'bh-2',
      position: [
        a2 * Math.cos(initialPhase),
        a2 * Math.sin(initialPhase),
        0,
      ],
      mass: mass2,
      radius: 0.4 * Math.cbrt(massRatio), // Proportional radius
      color: '#34495e', // Slightly lighter dark for black hole 2
      orbit: {
        semiMajorAxis: a2,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: initialPhase,
      },
    },
  ];

  return {
    resolution: DEFAULT_RESOLUTION,
    bounds: DEFAULT_BOUNDS,
    timeStep: DEFAULT_TIME_STEP,
    masses,
    orbitsEnabled: true,
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
    case 'gravitational-wave':
      return generateGravitationalWaveScenario(seed);
    case 'triple-system':
      return generateTripleScenario(seed);
    case 'cluster':
      return generateClusterScenario(seed);
    case 'gravitational-lensing':
      return generateGravitationalLensingScenario(seed);
    case 'extreme-mass-ratio':
      return generateExtremeMassRatioScenario(seed);
    case 'hierarchical-triple':
      return generateHierarchicalTripleScenario(seed);
    case 'black-hole-inspiral':
      return generateBlackHoleInspiralScenario(seed);
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
