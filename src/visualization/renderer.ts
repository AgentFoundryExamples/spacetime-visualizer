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

import * as THREE from 'three';
import type { CurvatureGridResult, MassSource } from '../physics/types';
import { getColorForCurvature } from './materials';

/**
 * Maximum recommended grid resolution before performance warning.
 * Higher resolutions may cause frame drops on lower-end devices.
 */
export const MAX_SAFE_RESOLUTION = 64;

/**
 * Height scale factor for curvature visualization.
 * Controls how much vertical displacement is applied based on metric deviation.
 */
export const HEIGHT_SCALE_FACTOR = 2.0;

/**
 * Result of building a curvature mesh from grid data.
 */
export interface CurvatureMeshData {
  /** Position attribute (Float32Array) */
  positions: Float32Array;
  /** Normal attribute (Float32Array) */
  normals: Float32Array;
  /** Color attribute (Float32Array) */
  colors: Float32Array;
  /** Index array for triangles (Uint32Array) */
  indices: Uint32Array;
  /** Grid resolution per axis */
  resolution: number;
}

/**
 * Warns if resolution is above safe threshold.
 * @param resolution - Grid resolution to check
 * @returns Warning message or null if resolution is safe
 */
export function checkResolutionWarning(resolution: number): string | null {
  if (resolution > MAX_SAFE_RESOLUTION) {
    return `High resolution (${resolution}) may cause performance issues. Consider using ${MAX_SAFE_RESOLUTION} or lower for smooth interaction.`;
  }
  return null;
}

/**
 * Clamps resolution to safe bounds to prevent browser freezes.
 * @param resolution - Requested resolution
 * @param maxAllowed - Maximum allowed resolution (default: 128)
 * @returns Clamped resolution value
 */
export function clampResolution(resolution: number, maxAllowed = 128): number {
  return Math.min(Math.max(2, resolution), maxAllowed);
}

/**
 * Builds a heightfield mesh from curvature grid data.
 * Creates a 2D grid in XY plane with Z displacement based on curvature.
 *
 * The mesh uses vertex colors to encode curvature (blue = flat/positive, red = negative/curved).
 *
 * @param result - Curvature grid computation result
 * @param heightScale - Scale factor for Z displacement (default: HEIGHT_SCALE_FACTOR)
 * @returns CurvatureMeshData with positions, normals, colors, and indices
 */
export function buildCurvatureMesh(
  result: CurvatureGridResult,
  heightScale: number = HEIGHT_SCALE_FACTOR
): CurvatureMeshData {
  const { samples, resolution, maxDeviation } = result;

  // We'll render a 2D heightfield in the XY plane at a fixed Z slice (middle of grid)
  // For a 3D grid of resolution R, we have R³ samples ordered as [z][y][x]
  // We take the middle Z slice
  // For resolution 2: sliceZ = 1, sliceStart = 1 * 2 * 2 = 4 (valid indices 4-7)
  let sliceZ = Math.floor(resolution / 2);
  let sliceStart = sliceZ * resolution * resolution;

  // Validate slice bounds for edge cases (minimum resolution is 2)
  const totalSamples = resolution * resolution * resolution;
  if (
    sliceStart >= totalSamples ||
    sliceStart + resolution * resolution > totalSamples
  ) {
    // Fallback to first slice if bounds are invalid
    console.warn(
      `Invalid slice bounds for resolution ${resolution}, falling back to slice 0`
    );
    sliceZ = 0;
    sliceStart = 0;
  }

  // Number of vertices per axis (resolution points create resolution-1 cells)
  const numVertices = resolution * resolution;

  // Create typed arrays
  const positions = new Float32Array(numVertices * 3);
  const normals = new Float32Array(numVertices * 3);
  const colors = new Float32Array(numVertices * 3);

  // Calculate normalization factor for colors and height
  // Use a small epsilon to avoid division by zero
  const normFactor = maxDeviation > 1e-10 ? 1 / maxDeviation : 1;

  // Fill vertex data from the Z-middle slice
  for (let iy = 0; iy < resolution; iy++) {
    for (let ix = 0; ix < resolution; ix++) {
      const sampleIdx = sliceStart + iy * resolution + ix;
      const vertexIdx = iy * resolution + ix;
      const sample = samples[sampleIdx];

      // Position: use original XY, displace Z by curvature (signed value shows direction)
      const baseIdx = vertexIdx * 3;
      positions[baseIdx] = sample.position[0];
      positions[baseIdx + 1] = sample.position[1];
      // Displace based on curvature (negative deviation = downward, positive = upward)
      positions[baseIdx + 2] =
        sample.metricDeviation * heightScale * normFactor;

      // Color: map signed curvature from [-max, max] to [0, 1] for gradient
      // -1 (min curvature) -> 0 (blue), 0 (flat) -> 0.5 (middle), +1 (max) -> 1 (red)
      const normalizedCurvature = (sample.metricDeviation * normFactor + 1) / 2;
      const color = getColorForCurvature(
        Math.max(0, Math.min(1, normalizedCurvature))
      );
      colors[baseIdx] = color.r;
      colors[baseIdx + 1] = color.g;
      colors[baseIdx + 2] = color.b;

      // Initial normals (will be computed from triangles later)
      normals[baseIdx] = 0;
      normals[baseIdx + 1] = 0;
      normals[baseIdx + 2] = 1;
    }
  }

  // Create index buffer for triangles
  // Each cell creates 2 triangles (6 indices)
  const numCells = (resolution - 1) * (resolution - 1);
  const indices = new Uint32Array(numCells * 6);

  let indexPtr = 0;
  for (let iy = 0; iy < resolution - 1; iy++) {
    for (let ix = 0; ix < resolution - 1; ix++) {
      const topLeft = iy * resolution + ix;
      const topRight = topLeft + 1;
      const bottomLeft = (iy + 1) * resolution + ix;
      const bottomRight = bottomLeft + 1;

      // First triangle (top-left, bottom-left, top-right)
      indices[indexPtr++] = topLeft;
      indices[indexPtr++] = bottomLeft;
      indices[indexPtr++] = topRight;

      // Second triangle (top-right, bottom-left, bottom-right)
      indices[indexPtr++] = topRight;
      indices[indexPtr++] = bottomLeft;
      indices[indexPtr++] = bottomRight;
    }
  }

  // Compute normals from triangles
  computeNormals(positions, indices, normals);

  return {
    positions,
    normals,
    colors,
    indices,
    resolution,
  };
}

/**
 * Computes vertex normals from triangle geometry.
 * Uses area-weighted averaging of face normals.
 */
function computeNormals(
  positions: Float32Array,
  indices: Uint32Array,
  normals: Float32Array
): void {
  // Reset normals
  normals.fill(0);

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();

  // Accumulate face normals to vertices
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    v0.set(positions[i0], positions[i0 + 1], positions[i0 + 2]);
    v1.set(positions[i1], positions[i1 + 1], positions[i1 + 2]);
    v2.set(positions[i2], positions[i2 + 1], positions[i2 + 2]);

    edge1.subVectors(v1, v0);
    edge2.subVectors(v2, v0);
    faceNormal.crossVectors(edge1, edge2);

    // Add face normal to each vertex (area-weighted because cross product magnitude = 2x area)
    normals[i0] += faceNormal.x;
    normals[i0 + 1] += faceNormal.y;
    normals[i0 + 2] += faceNormal.z;

    normals[i1] += faceNormal.x;
    normals[i1 + 1] += faceNormal.y;
    normals[i1 + 2] += faceNormal.z;

    normals[i2] += faceNormal.x;
    normals[i2 + 1] += faceNormal.y;
    normals[i2 + 2] += faceNormal.z;
  }

  // Normalize all vertex normals
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(
      normals[i] * normals[i] +
        normals[i + 1] * normals[i + 1] +
        normals[i + 2] * normals[i + 2]
    );
    if (len > 0) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    } else {
      // Default to up if degenerate
      normals[i] = 0;
      normals[i + 1] = 0;
      normals[i + 2] = 1;
    }
  }
}

/**
 * Creates a Three.js BufferGeometry from CurvatureMeshData.
 * @param meshData - Mesh data from buildCurvatureMesh
 * @returns THREE.BufferGeometry ready for rendering
 */
export function createBufferGeometry(
  meshData: CurvatureMeshData
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(meshData.positions, 3)
  );
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(meshData.normals, 3)
  );
  geometry.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Updates an existing BufferGeometry with new mesh data.
 * More efficient than creating a new geometry for animations.
 * @param geometry - Existing geometry to update
 * @param meshData - New mesh data
 */
export function updateBufferGeometry(
  geometry: THREE.BufferGeometry,
  meshData: CurvatureMeshData
): void {
  const positionAttr = geometry.getAttribute(
    'position'
  ) as THREE.BufferAttribute;
  const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

  positionAttr.set(meshData.positions);
  positionAttr.needsUpdate = true;

  normalAttr.set(meshData.normals);
  normalAttr.needsUpdate = true;

  colorAttr.set(meshData.colors);
  colorAttr.needsUpdate = true;

  geometry.computeBoundingSphere();
}

/**
 * Creates spheres representing mass sources for visualization.
 * @param masses - Array of mass sources
 * @param heightScale - Height scale factor for positioning
 * @param normFactor - Normalization factor for height calculation
 * @returns Array of sphere data with position and radius
 */
export function createMassSpheres(masses: MassSource[]): Array<{
  position: [number, number, number];
  radius: number;
  color: string;
}> {
  return masses.map((mass) => ({
    position: mass.position,
    radius: mass.radius ?? Math.max(0.2, Math.cbrt(mass.mass) * 0.05),
    color: mass.color ?? '#ffcc00',
  }));
}

/**
 * Creates axis helpers for scene orientation.
 * @param size - Length of axes
 */
export function createAxesHelper(size: number = 5): THREE.AxesHelper {
  return new THREE.AxesHelper(size);
}

/**
 * Creates a grid helper for spatial reference.
 * @param size - Size of grid
 * @param divisions - Number of divisions
 */
export function createGridHelper(
  size: number = 10,
  divisions: number = 10
): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, 0x444466, 0x333344);
  grid.rotation.x = Math.PI / 2; // Rotate to XY plane
  return grid;
}

/**
 * Trail render data for a single mass.
 */
export interface TrailRenderData {
  /** Mass ID this trail belongs to */
  massId: string;
  /** Positions array for line geometry (Float32Array) */
  positions: Float32Array;
  /** Colors array with fading opacity (Float32Array) */
  colors: Float32Array;
  /** Number of valid points in the trail */
  pointCount: number;
  /** Base color for the trail */
  color: string;
}

/**
 * Builds trail render data from trail history.
 * Creates line geometry data with fading colors (older = more transparent).
 *
 * Note: This function allocates new TypedArrays. For animation updates where
 * point counts remain stable, use updateTrailLine() instead to reuse buffers
 * and reduce garbage collection pressure.
 *
 * @param trail - Trail history for a mass
 * @param baseColor - Base color for the trail (CSS color string)
 * @returns Trail render data for creating line geometry
 */
export function buildTrailRenderData(
  trail: { massId: string; points: Array<{ position: [number, number, number]; timestamp: number }> },
  baseColor: string = '#ffffff'
): TrailRenderData {
  const pointCount = trail.points.length;

  // Need at least 2 points to draw a line
  if (pointCount < 2) {
    return {
      massId: trail.massId,
      positions: new Float32Array(0),
      colors: new Float32Array(0),
      pointCount: 0,
      color: baseColor,
    };
  }

  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 4); // RGBA for vertex colors with opacity

  // Parse base color
  const color = new THREE.Color(baseColor);

  for (let i = 0; i < pointCount; i++) {
    const point = trail.points[i];
    const idx = i * 3;

    // Position
    positions[idx] = point.position[0];
    positions[idx + 1] = point.position[1];
    positions[idx + 2] = point.position[2];

    // Color with fading opacity (0 = oldest, 1 = newest)
    const alpha = (i + 1) / pointCount;
    const colorIdx = i * 4;
    colors[colorIdx] = color.r;
    colors[colorIdx + 1] = color.g;
    colors[colorIdx + 2] = color.b;
    colors[colorIdx + 3] = alpha;
  }

  return {
    massId: trail.massId,
    positions,
    colors,
    pointCount,
    color: baseColor,
  };
}

/**
 * Creates a Three.js Line object from trail render data.
 * Uses LineBasicMaterial with vertex colors for fading effect.
 *
 * @param trailData - Trail render data from buildTrailRenderData
 * @returns Object containing the line and disposable resources
 */
export function createTrailLine(
  trailData: TrailRenderData
): { line: THREE.Line; geometry: THREE.BufferGeometry; material: THREE.LineBasicMaterial } | null {
  if (trailData.pointCount < 2) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(trailData.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(trailData.colors, 4));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    linewidth: 1, // Note: linewidth > 1 only works on some platforms
  });

  const line = new THREE.Line(geometry, material);
  line.name = `trail-${trailData.massId}`;

  return { line, geometry, material };
}

/**
 * Updates an existing trail line geometry with new data.
 * More efficient than creating a new line for animations.
 *
 * @param line - Existing line object to update
 * @param trailData - New trail render data
 * @returns true if update was successful, false if full re-creation needed
 */
export function updateTrailLine(
  line: THREE.Line,
  trailData: TrailRenderData
): boolean {
  if (trailData.pointCount < 2) {
    return false;
  }

  const geometry = line.geometry as THREE.BufferGeometry;
  const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

  // Check if buffer sizes match
  if (positionAttr.count !== trailData.pointCount) {
    return false; // Need to recreate geometry
  }

  // Update existing buffers
  positionAttr.set(trailData.positions);
  positionAttr.needsUpdate = true;

  colorAttr.set(trailData.colors);
  colorAttr.needsUpdate = true;

  return true;
}
