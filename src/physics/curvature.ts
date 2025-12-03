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

import type {
  MassSource,
  CurvatureSample,
  CurvatureGridConfig,
  CurvatureGridResult,
} from './types';

/**
 * Gravitational constant G in normalized units for visualization.
 * Using simplified units where G = 1 for educational purposes.
 */
export const G_CONSTANT = 1.0;

/**
 * Speed of light c in normalized units.
 * Using simplified units where c = 1 for educational purposes.
 */
export const C_CONSTANT = 1.0;

/**
 * Minimum distance to prevent division by zero or infinity.
 * Used to clamp distances when computing potentials.
 *
 * **Warning**: When sample points fall within this distance of a mass source,
 * curvature values are artificially limited and may not reflect physical reality.
 * This is an intentional safeguard to prevent numerical instability (infinity/NaN).
 */
export const MIN_DISTANCE = 0.001;

/**
 * Maximum metric deviation value to prevent overflow.
 * Values exceeding this are clamped.
 */
export const MAX_METRIC_DEVIATION = 1e6;

/**
 * Validation constraints for grid configuration.
 */
export const GRID_CONSTRAINTS = {
  minResolution: 2,
  maxResolution: 256,
  minBoundSize: 0.001,
  maxBoundSize: 1e6,
  minTimeStep: 0.0001,
  maxTimeStep: 1.0,
} as const;

/**
 * Validation error thrown when grid configuration is invalid.
 */
export class CurvatureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurvatureValidationError';
  }
}

/**
 * Validates a MassSource object.
 * @param mass - The mass source to validate
 * @throws CurvatureValidationError if validation fails
 */
export function validateMassSource(mass: MassSource): void {
  if (!mass.id || typeof mass.id !== 'string') {
    throw new CurvatureValidationError(
      'MassSource must have a valid string id'
    );
  }

  if (!Array.isArray(mass.position) || mass.position.length !== 3) {
    throw new CurvatureValidationError(
      `MassSource "${mass.id}" must have a position array of length 3`
    );
  }

  for (let i = 0; i < 3; i++) {
    if (
      typeof mass.position[i] !== 'number' ||
      !Number.isFinite(mass.position[i])
    ) {
      throw new CurvatureValidationError(
        `MassSource "${mass.id}" position[${i}] must be a finite number`
      );
    }
  }

  if (typeof mass.mass !== 'number' || !Number.isFinite(mass.mass)) {
    throw new CurvatureValidationError(
      `MassSource "${mass.id}" mass must be a finite number`
    );
  }

  if (mass.mass < 0) {
    throw new CurvatureValidationError(
      `MassSource "${mass.id}" mass must be non-negative, got ${mass.mass}`
    );
  }

  if (mass.radius !== undefined) {
    if (
      typeof mass.radius !== 'number' ||
      !Number.isFinite(mass.radius) ||
      mass.radius < 0
    ) {
      throw new CurvatureValidationError(
        `MassSource "${mass.id}" radius must be a non-negative finite number`
      );
    }
  }
}

/**
 * Validates the curvature grid configuration.
 * @param config - The configuration to validate
 * @throws CurvatureValidationError if validation fails
 */
export function validateGridConfig(config: CurvatureGridConfig): void {
  // Validate resolution
  if (!Number.isInteger(config.resolution)) {
    throw new CurvatureValidationError('Grid resolution must be an integer');
  }

  if (
    config.resolution < GRID_CONSTRAINTS.minResolution ||
    config.resolution > GRID_CONSTRAINTS.maxResolution
  ) {
    throw new CurvatureValidationError(
      `Grid resolution must be between ${GRID_CONSTRAINTS.minResolution} and ${GRID_CONSTRAINTS.maxResolution}, got ${config.resolution}`
    );
  }

  // Validate bounds
  if (!Array.isArray(config.bounds) || config.bounds.length !== 6) {
    throw new CurvatureValidationError(
      'Bounds must be an array of 6 numbers [minX, minY, minZ, maxX, maxY, maxZ]'
    );
  }

  for (let i = 0; i < 6; i++) {
    if (
      typeof config.bounds[i] !== 'number' ||
      !Number.isFinite(config.bounds[i])
    ) {
      throw new CurvatureValidationError(
        `Bounds[${i}] must be a finite number`
      );
    }
  }

  const [minX, minY, minZ, maxX, maxY, maxZ] = config.bounds;

  if (maxX <= minX) {
    throw new CurvatureValidationError(
      `Bounds maxX (${maxX}) must be greater than minX (${minX})`
    );
  }
  if (maxY <= minY) {
    throw new CurvatureValidationError(
      `Bounds maxY (${maxY}) must be greater than minY (${minY})`
    );
  }
  if (maxZ <= minZ) {
    throw new CurvatureValidationError(
      `Bounds maxZ (${maxZ}) must be greater than minZ (${minZ})`
    );
  }

  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;

  if (
    sizeX < GRID_CONSTRAINTS.minBoundSize ||
    sizeY < GRID_CONSTRAINTS.minBoundSize ||
    sizeZ < GRID_CONSTRAINTS.minBoundSize
  ) {
    throw new CurvatureValidationError(
      `Grid dimensions must be at least ${GRID_CONSTRAINTS.minBoundSize}`
    );
  }

  if (
    sizeX > GRID_CONSTRAINTS.maxBoundSize ||
    sizeY > GRID_CONSTRAINTS.maxBoundSize ||
    sizeZ > GRID_CONSTRAINTS.maxBoundSize
  ) {
    throw new CurvatureValidationError(
      `Grid dimensions must not exceed ${GRID_CONSTRAINTS.maxBoundSize}`
    );
  }

  // Validate time step
  if (
    typeof config.timeStep !== 'number' ||
    !Number.isFinite(config.timeStep)
  ) {
    throw new CurvatureValidationError('Time step must be a finite number');
  }

  if (
    config.timeStep < GRID_CONSTRAINTS.minTimeStep ||
    config.timeStep > GRID_CONSTRAINTS.maxTimeStep
  ) {
    throw new CurvatureValidationError(
      `Time step must be between ${GRID_CONSTRAINTS.minTimeStep} and ${GRID_CONSTRAINTS.maxTimeStep}, got ${config.timeStep}`
    );
  }

  // Validate masses array
  if (!Array.isArray(config.masses)) {
    throw new CurvatureValidationError('Masses must be an array');
  }

  for (const mass of config.masses) {
    validateMassSource(mass);
  }
}

/**
 * Computes the Euclidean distance between two 3D points.
 */
function distance3D(
  p1: [number, number, number],
  p2: [number, number, number]
): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Computes the Newtonian gravitational potential at a point due to all masses.
 * Uses the weak-field approximation where Φ = -GM/r for each mass.
 * The total potential is the sum of contributions from all masses.
 *
 * @param point - The position to compute potential at
 * @param masses - Array of mass sources
 * @returns The gravitational potential (negative for attractive gravity)
 */
export function computePotential(
  point: [number, number, number],
  masses: MassSource[]
): number {
  let potential = 0;

  for (const mass of masses) {
    if (mass.mass === 0) continue;

    const r = Math.max(distance3D(point, mass.position), MIN_DISTANCE);
    // Φ = -GM/r (Newtonian potential)
    potential -= (G_CONSTANT * mass.mass) / r;
  }

  return potential;
}

/**
 * Computes the tidal tensor approximation at a point.
 * Uses second derivatives of the potential to estimate tidal forces.
 * The tidal tensor describes how geodesics converge or diverge.
 *
 * In the weak-field limit, the tidal tensor components are:
 * T_ij ≈ ∂²Φ/∂x_i∂x_j
 *
 * For a single mass: T = GM/r³ * (3r̂⊗r̂ - I)
 *
 * @param point - The position to compute tidal tensor at
 * @param masses - Array of mass sources
 * @returns The diagonal components of the tidal tensor [Txx, Tyy, Tzz]
 */
export function computeTidalTensor(
  point: [number, number, number],
  masses: MassSource[]
): [number, number, number] {
  let txx = 0;
  let tyy = 0;
  let tzz = 0;

  for (const mass of masses) {
    if (mass.mass === 0) continue;

    const dx = point[0] - mass.position[0];
    const dy = point[1] - mass.position[1];
    const dz = point[2] - mass.position[2];

    const r2 = dx * dx + dy * dy + dz * dz;
    const r = Math.max(Math.sqrt(r2), MIN_DISTANCE);
    const r3 = r * r * r;

    // Tidal tensor components: T_ii = GM * (3*x_i² - r²) / r^5
    // Optimized: factor out r^2 to avoid computing r^5 directly
    const gmOverR3 = (G_CONSTANT * mass.mass) / r3;
    const rSquared = r * r;

    txx += ((3 * dx * dx) / rSquared - 1) * gmOverR3;
    tyy += ((3 * dy * dy) / rSquared - 1) * gmOverR3;
    tzz += ((3 * dz * dz) / rSquared - 1) * gmOverR3;
  }

  // Clamp values to prevent overflow
  const clamp = (v: number) =>
    Math.max(-MAX_METRIC_DEVIATION, Math.min(MAX_METRIC_DEVIATION, v));

  return [clamp(txx), clamp(tyy), clamp(tzz)];
}

/**
 * Computes the metric deviation from flat spacetime.
 * In the weak-field approximation: g_00 ≈ -(1 + 2Φ/c²)
 * The metric deviation is 2Φ/c².
 *
 * @param potential - The gravitational potential
 * @returns The metric deviation value
 */
export function computeMetricDeviation(potential: number): number {
  // In our normalized units, c = 1
  const deviation = (2 * potential) / (C_CONSTANT * C_CONSTANT);
  return Math.max(
    -MAX_METRIC_DEVIATION,
    Math.min(MAX_METRIC_DEVIATION, deviation)
  );
}

/**
 * Computes the spacetime curvature across a 3D grid.
 * Uses weak-field approximation based on Newtonian potential.
 *
 * The algorithm:
 * 1. Validates all input parameters
 * 2. Iterates over each voxel in the grid
 * 3. Computes gravitational potential at each point (sum over all masses)
 * 4. Computes tidal tensor components from potential gradients
 * 5. Normalizes output for visualization
 *
 * The computation is deterministic: identical inputs always produce identical outputs.
 *
 * **Performance Note**: This function performs synchronous, blocking computation.
 * For resolutions above 64, computation may take noticeable time (100ms+).
 * Expected performance for common resolutions:
 * - Resolution 16: ~1ms
 * - Resolution 32: ~10ms
 * - Resolution 64: ~50-100ms
 * - Resolution 128+: 500ms+ (may cause UI lag if not deferred)
 *
 * @param config - Configuration specifying grid, masses, and parameters
 * @returns CurvatureGridResult with samples for each grid point
 * @throws CurvatureValidationError if configuration is invalid
 */
export function computeCurvatureGrid(
  config: CurvatureGridConfig
): CurvatureGridResult {
  // Validate configuration
  validateGridConfig(config);

  const { resolution, bounds, masses } = config;
  const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;

  // Compute step sizes
  const stepX = (maxX - minX) / resolution;
  const stepY = (maxY - minY) / resolution;
  const stepZ = (maxZ - minZ) / resolution;

  const samples: CurvatureSample[] = [];
  let maxDeviation = 0;

  // Iterate over grid in deterministic order (z, y, x)
  for (let iz = 0; iz < resolution; iz++) {
    const z = minZ + (iz + 0.5) * stepZ;
    for (let iy = 0; iy < resolution; iy++) {
      const y = minY + (iy + 0.5) * stepY;
      for (let ix = 0; ix < resolution; ix++) {
        const x = minX + (ix + 0.5) * stepX;

        const position: [number, number, number] = [x, y, z];
        const potential = computePotential(position, masses);
        const metricDeviation = computeMetricDeviation(potential);
        const tidalTensor = computeTidalTensor(position, masses);

        samples.push({
          position,
          metricDeviation,
          tidalTensor,
        });

        // Track maximum deviation for normalization
        maxDeviation = Math.max(maxDeviation, Math.abs(metricDeviation));
      }
    }
  }

  return {
    samples,
    resolution,
    bounds,
    maxDeviation,
  };
}
