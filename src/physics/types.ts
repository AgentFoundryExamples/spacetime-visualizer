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

/**
 * Represents a point-mass source that curves spacetime.
 * Used for computing gravitational potential and tidal forces.
 */
export interface MassSource {
  /** Unique identifier for the mass source */
  id: string;
  /** Position in 3D space [x, y, z] */
  position: [number, number, number];
  /** Mass of the source (non-negative) */
  mass: number;
  /** Optional radius for visualization (defaults to proportional to mass) */
  radius?: number;
  /** Optional color for visualization (CSS color string) */
  color?: string;
}

/**
 * Represents a curvature sample at a point on the visualization grid.
 * Contains computed values for spacetime curvature at that location.
 */
export interface CurvatureSample {
  /** Position in 3D space [x, y, z] */
  position: [number, number, number];
  /** Metric deviation from flat spacetime (Φ/c²), normalized for rendering */
  metricDeviation: number;
  /** Tidal tensor eigenvalue approximation [x, y, z] representing principal tidal forces */
  tidalTensor: [number, number, number];
}

/**
 * Configuration for computing curvature on a 3D grid.
 */
export interface CurvatureGridConfig {
  /** Grid resolution (number of cells per axis) */
  resolution: number;
  /** Spatial bounds of the grid [minX, minY, minZ, maxX, maxY, maxZ] */
  bounds: [number, number, number, number, number, number];
  /** Time step for dynamic simulations (seconds) */
  timeStep: number;
  /** Array of mass sources to compute curvature from */
  masses: MassSource[];
}

/**
 * Result of curvature grid computation.
 */
export interface CurvatureGridResult {
  /** Array of curvature samples covering the grid */
  samples: CurvatureSample[];
  /** Grid resolution used for computation */
  resolution: number;
  /** Bounds used for computation */
  bounds: [number, number, number, number, number, number];
  /** Maximum metric deviation across all samples (for normalization) */
  maxDeviation: number;
}
