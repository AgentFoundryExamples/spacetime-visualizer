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
 * Orbital mechanics module for computing Keplerian orbital motion.
 * Provides functions for calculating orbital positions and velocities
 * with support for elliptical orbits in 3D space.
 */

import { G_CONSTANT } from './curvature';
import type { MassSource } from './types';

/**
 * Orbital parameters for a body in a Keplerian orbit.
 */
export interface OrbitalParameters {
  /** Semi-major axis (orbital size) in simulation units */
  semiMajorAxis: number;
  /** Eccentricity (orbital shape, 0 = circular, <1 = ellipse) */
  eccentricity: number;
  /** Inclination in radians (tilt from XY plane) */
  inclination: number;
  /** Longitude of ascending node in radians (rotation in XY plane) */
  longitudeOfAscendingNode: number;
  /** Argument of periapsis in radians (rotation within orbital plane) */
  argumentOfPeriapsis: number;
  /** True anomaly at t=0 in radians (initial position on orbit) */
  initialTrueAnomaly: number;
}

/**
 * Constraints for orbital parameters.
 */
export const ORBITAL_CONSTRAINTS = {
  minSemiMajorAxis: 0.5,
  maxSemiMajorAxis: 10,
  minEccentricity: 0,
  maxEccentricity: 0.95,
  minInclination: -Math.PI / 2,
  maxInclination: Math.PI / 2,
  minCentralMass: 10,
  maxCentralMass: 1000,
  minTimeStep: 0.001,
  maxTimeStep: 0.1,
} as const;

/**
 * Maximum number of iterations for Kepler equation solver.
 */
const MAX_KEPLER_ITERATIONS = 30;

/**
 * Convergence tolerance for Kepler equation solver.
 */
const KEPLER_TOLERANCE = 1e-10;

/**
 * Fallback step size when Newton-Raphson derivative is near zero.
 */
const KEPLER_BISECTION_STEP = 0.1;

/**
 * Validation error for orbital parameters.
 */
export class OrbitalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrbitalValidationError';
  }
}

/**
 * Validates orbital parameters.
 * @param params - The orbital parameters to validate
 * @throws OrbitalValidationError if validation fails
 */
export function validateOrbitalParameters(params: OrbitalParameters): void {
  if (
    typeof params.semiMajorAxis !== 'number' ||
    !Number.isFinite(params.semiMajorAxis)
  ) {
    throw new OrbitalValidationError(
      'Semi-major axis must be a finite number'
    );
  }
  if (params.semiMajorAxis <= 0) {
    throw new OrbitalValidationError('Semi-major axis must be positive');
  }

  if (
    typeof params.eccentricity !== 'number' ||
    !Number.isFinite(params.eccentricity)
  ) {
    throw new OrbitalValidationError('Eccentricity must be a finite number');
  }
  if (params.eccentricity < 0 || params.eccentricity >= 1) {
    throw new OrbitalValidationError(
      `Eccentricity must be in range [0, 1), got ${params.eccentricity}`
    );
  }

  if (
    typeof params.inclination !== 'number' ||
    !Number.isFinite(params.inclination)
  ) {
    throw new OrbitalValidationError('Inclination must be a finite number');
  }

  if (
    typeof params.longitudeOfAscendingNode !== 'number' ||
    !Number.isFinite(params.longitudeOfAscendingNode)
  ) {
    throw new OrbitalValidationError(
      'Longitude of ascending node must be a finite number'
    );
  }

  if (
    typeof params.argumentOfPeriapsis !== 'number' ||
    !Number.isFinite(params.argumentOfPeriapsis)
  ) {
    throw new OrbitalValidationError(
      'Argument of periapsis must be a finite number'
    );
  }

  if (
    typeof params.initialTrueAnomaly !== 'number' ||
    !Number.isFinite(params.initialTrueAnomaly)
  ) {
    throw new OrbitalValidationError(
      'Initial true anomaly must be a finite number'
    );
  }
}

/**
 * Clamps a value to the specified range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamps orbital parameters to valid ranges.
 * @param params - The parameters to clamp
 * @returns Clamped parameters
 */
export function clampOrbitalParameters(
  params: OrbitalParameters
): OrbitalParameters {
  return {
    semiMajorAxis: clamp(
      params.semiMajorAxis,
      ORBITAL_CONSTRAINTS.minSemiMajorAxis,
      ORBITAL_CONSTRAINTS.maxSemiMajorAxis
    ),
    eccentricity: clamp(
      params.eccentricity,
      ORBITAL_CONSTRAINTS.minEccentricity,
      ORBITAL_CONSTRAINTS.maxEccentricity
    ),
    inclination: clamp(
      params.inclination,
      ORBITAL_CONSTRAINTS.minInclination,
      ORBITAL_CONSTRAINTS.maxInclination
    ),
    longitudeOfAscendingNode: params.longitudeOfAscendingNode,
    argumentOfPeriapsis: params.argumentOfPeriapsis,
    initialTrueAnomaly: params.initialTrueAnomaly,
  };
}

/**
 * Computes the orbital period using Kepler's third law.
 * T = 2π * sqrt(a³ / (G * M))
 *
 * @param semiMajorAxis - Semi-major axis of the orbit
 * @param centralMass - Mass of the central body
 * @returns Orbital period in time units
 */
export function computeOrbitalPeriod(
  semiMajorAxis: number,
  centralMass: number
): number {
  if (centralMass <= 0 || semiMajorAxis <= 0) {
    return Infinity;
  }
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / (G_CONSTANT * centralMass));
}

/**
 * Computes the mean anomaly at a given time.
 * M = M0 + n * t, where n = 2π / T is the mean motion
 *
 * @param time - Current simulation time
 * @param period - Orbital period
 * @param initialMeanAnomaly - Mean anomaly at t=0
 * @returns Mean anomaly in radians
 */
export function computeMeanAnomaly(
  time: number,
  period: number,
  initialMeanAnomaly: number
): number {
  if (!Number.isFinite(period) || period <= 0) {
    return initialMeanAnomaly;
  }
  const meanMotion = (2 * Math.PI) / period;
  return (initialMeanAnomaly + meanMotion * time) % (2 * Math.PI);
}

/**
 * Converts true anomaly to mean anomaly.
 * Used for computing initial mean anomaly from initial true anomaly.
 *
 * @param trueAnomaly - True anomaly in radians
 * @param eccentricity - Orbital eccentricity
 * @returns Mean anomaly in radians
 */
export function trueToMeanAnomaly(
  trueAnomaly: number,
  eccentricity: number
): number {
  // First convert to eccentric anomaly
  const E = Math.atan2(
    Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(trueAnomaly),
    eccentricity + Math.cos(trueAnomaly)
  );
  // Then to mean anomaly: M = E - e*sin(E)
  return E - eccentricity * Math.sin(E);
}

/**
 * Solves Kepler's equation to find eccentric anomaly from mean anomaly.
 * Uses Newton-Raphson iteration: M = E - e*sin(E)
 *
 * For high eccentricity orbits (e > 0.8), convergence may be slower.
 * If solver doesn't converge, returns best estimate with a warning logged.
 *
 * @param meanAnomaly - Mean anomaly in radians
 * @param eccentricity - Orbital eccentricity (0 to <1)
 * @returns Eccentric anomaly in radians
 */
export function solveKeplerEquation(
  meanAnomaly: number,
  eccentricity: number
): number {
  // For circular orbits, E = M
  if (eccentricity === 0) {
    return meanAnomaly;
  }

  // Initial guess using improved starting point for better convergence.
  // For high eccentricity orbits, M + e*sin(M) provides a closer initial
  // approximation than just M or π, reducing iterations needed to converge.
  let E = meanAnomaly;
  if (eccentricity > 0.8) {
    E = meanAnomaly + eccentricity * Math.sin(meanAnomaly);
  }

  let converged = false;

  // Newton-Raphson iteration
  for (let i = 0; i < MAX_KEPLER_ITERATIONS; i++) {
    const f = E - eccentricity * Math.sin(E) - meanAnomaly;
    const fPrime = 1 - eccentricity * Math.cos(E);

    // Check for near-zero derivative (shouldn't happen for e < 1)
    if (Math.abs(fPrime) < 1e-15) {
      // Fallback: use bisection-like step instead of Newton step
      E += Math.sign(f) * KEPLER_BISECTION_STEP;
      continue;
    }

    const dE = f / fPrime;
    E -= dE;

    if (Math.abs(dE) < KEPLER_TOLERANCE) {
      converged = true;
      break;
    }
  }

  // Validate convergence - if not converged, the result may be inaccurate
  // This can happen for eccentricities very close to 1
  if (!converged && import.meta.env.DEV) {
    console.warn(
      `Kepler equation solver did not converge for e=${eccentricity}, M=${meanAnomaly}. Using best estimate.`
    );
  }

  return E;
}

/**
 * Converts eccentric anomaly to true anomaly.
 *
 * @param eccentricAnomaly - Eccentric anomaly in radians
 * @param eccentricity - Orbital eccentricity
 * @returns True anomaly in radians
 */
export function eccentricToTrueAnomaly(
  eccentricAnomaly: number,
  eccentricity: number
): number {
  // For circular orbits, true anomaly equals eccentric anomaly
  if (eccentricity === 0) {
    return eccentricAnomaly;
  }

  // ν = 2 * atan2(sqrt(1+e) * sin(E/2), sqrt(1-e) * cos(E/2))
  const sqrtOnePlusE = Math.sqrt(1 + eccentricity);
  const sqrtOneMinusE = Math.sqrt(1 - eccentricity);
  return (
    2 *
    Math.atan2(
      sqrtOnePlusE * Math.sin(eccentricAnomaly / 2),
      sqrtOneMinusE * Math.cos(eccentricAnomaly / 2)
    )
  );
}

/**
 * Computes the orbital position in 3D space at a given time.
 *
 * @param params - Orbital parameters
 * @param time - Current simulation time
 * @param centralMass - Mass of the central body
 * @param centerPosition - Position of the central body [x, y, z]
 * @returns Position [x, y, z] in simulation coordinates
 */
export function computeOrbitalPosition(
  params: OrbitalParameters,
  time: number,
  centralMass: number,
  centerPosition: [number, number, number] = [0, 0, 0]
): [number, number, number] {
  const { semiMajorAxis, eccentricity, inclination, longitudeOfAscendingNode, argumentOfPeriapsis, initialTrueAnomaly } = params;

  // Compute orbital period
  const period = computeOrbitalPeriod(semiMajorAxis, centralMass);

  // Get initial mean anomaly from initial true anomaly
  const initialMeanAnomaly = trueToMeanAnomaly(initialTrueAnomaly, eccentricity);

  // Compute current mean anomaly
  const meanAnomaly = computeMeanAnomaly(time, period, initialMeanAnomaly);

  // Solve for eccentric anomaly
  const eccentricAnomaly = solveKeplerEquation(meanAnomaly, eccentricity);

  // Convert to true anomaly
  const trueAnomaly = eccentricToTrueAnomaly(eccentricAnomaly, eccentricity);

  // Compute radial distance
  const r =
    (semiMajorAxis * (1 - eccentricity * eccentricity)) /
    (1 + eccentricity * Math.cos(trueAnomaly));

  // Position in orbital plane (perifocal frame)
  const xOrbital = r * Math.cos(trueAnomaly);
  const yOrbital = r * Math.sin(trueAnomaly);

  // Rotation matrices to transform from orbital plane to 3D space
  const cosOmega = Math.cos(longitudeOfAscendingNode);
  const sinOmega = Math.sin(longitudeOfAscendingNode);
  const cosi = Math.cos(inclination);
  const sini = Math.sin(inclination);
  const cosw = Math.cos(argumentOfPeriapsis);
  const sinw = Math.sin(argumentOfPeriapsis);

  // Transform to 3D coordinates (combined rotation matrix)
  const x =
    (cosOmega * cosw - sinOmega * sinw * cosi) * xOrbital +
    (-cosOmega * sinw - sinOmega * cosw * cosi) * yOrbital;
  const y =
    (sinOmega * cosw + cosOmega * sinw * cosi) * xOrbital +
    (-sinOmega * sinw + cosOmega * cosw * cosi) * yOrbital;
  const z = sinw * sini * xOrbital + cosw * sini * yOrbital;

  return [
    centerPosition[0] + x,
    centerPosition[1] + y,
    centerPosition[2] + z,
  ];
}

/**
 * Creates default orbital parameters for a simple circular orbit.
 *
 * @param radius - Orbital radius (semi-major axis)
 * @param initialPhase - Initial phase angle (true anomaly) in radians
 * @returns Default orbital parameters
 */
export function createDefaultOrbitalParameters(
  radius: number = 2,
  initialPhase: number = 0
): OrbitalParameters {
  return {
    semiMajorAxis: clamp(
      radius,
      ORBITAL_CONSTRAINTS.minSemiMajorAxis,
      ORBITAL_CONSTRAINTS.maxSemiMajorAxis
    ),
    eccentricity: 0,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    initialTrueAnomaly: initialPhase,
  };
}

/**
 * Creates orbital parameters for binary orbit scenario.
 * Two masses orbit their common center of mass.
 *
 * @param separation - Distance between the two masses
 * @param massRatio - Ratio of secondary to primary mass (0 < ratio <= 1)
 * @param eccentricity - Orbital eccentricity
 * @returns Tuple of orbital parameters for [primary, secondary]
 */
export function createBinaryOrbitalParameters(
  separation: number = 3,
  massRatio: number = 1,
  eccentricity: number = 0
): [OrbitalParameters, OrbitalParameters] {
  // For binary orbits, both masses orbit the center of mass
  // a1 / a2 = m2 / m1
  const clampedRatio = clamp(massRatio, 0.1, 1);
  const totalMassRatio = 1 + clampedRatio;
  
  // Semi-major axes for each body (relative to center of mass)
  const a1 = (separation * clampedRatio) / totalMassRatio;
  const a2 = separation / totalMassRatio;

  const clampedEcc = clamp(
    eccentricity,
    ORBITAL_CONSTRAINTS.minEccentricity,
    ORBITAL_CONSTRAINTS.maxEccentricity
  );

  // Masses orbit 180 degrees out of phase
  const params1: OrbitalParameters = {
    semiMajorAxis: a1,
    eccentricity: clampedEcc,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    initialTrueAnomaly: 0,
  };

  const params2: OrbitalParameters = {
    semiMajorAxis: a2,
    eccentricity: clampedEcc,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    initialTrueAnomaly: Math.PI, // Opposite side of orbit
  };

  return [params1, params2];
}

/**
 * Updates mass positions based on their orbital parameters.
 * Modifies the masses array in place with new positions.
 *
 * @param masses - Array of mass sources (modified in place)
 * @param time - Current simulation time
 * @returns New array with updated positions
 */
export function updateMassPositions(
  masses: readonly MassSource[],
  time: number
): MassSource[] {
  // Create a map of masses by ID for looking up central masses
  const massById = new Map<string, MassSource>();
  masses.forEach((m) => massById.set(m.id, m));

  return masses.map((mass) => {
    // Skip if no orbit defined
    if (!mass.orbit) {
      return mass;
    }

    // Find central mass (if specified)
    let centralMass: number;
    let centerPosition: [number, number, number] = [0, 0, 0];

    if (mass.orbitsCentralMassId) {
      const centralBody = massById.get(mass.orbitsCentralMassId);
      if (centralBody) {
        centralMass = centralBody.mass;
        centerPosition = centralBody.position;
      } else {
        // Fallback if central mass not found
        centralMass = 100;
      }
    } else {
      // For systems orbiting a common barycenter (no central mass ID),
      // the period depends on the total mass of the system.
      const totalMass = masses.reduce((sum, m) => sum + m.mass, 0);
      centralMass = totalMass > 0 ? totalMass : 100;
    }

    // Compute new position
    const newPosition = computeOrbitalPosition(
      mass.orbit,
      time,
      centralMass,
      centerPosition
    );

    return {
      ...mass,
      position: newPosition,
    };
  });
}
