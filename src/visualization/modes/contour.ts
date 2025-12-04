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
import type { CurvatureGridResult } from '../../physics/types';
import type { VisualizationModeRenderer, ModeRenderResult } from './types';
import { createEmptyResources } from './types';
import { getColorForCurvature } from '../materials';

/**
 * Number of contour levels to display.
 */
const CONTOUR_LEVELS = 10;

/**
 * Contour line width.
 */
const CONTOUR_LINE_WIDTH = 2;

/**
 * Contour grid visualization mode.
 * Renders equipotential lines showing gravitational field strength.
 */
export class ContourModeRenderer implements VisualizationModeRenderer {
  readonly id = 'contour' as const;

  render(result: CurvatureGridResult): ModeRenderResult {
    const resources = createEmptyResources();
    const group = new THREE.Group();
    group.name = 'contour-grid';

    const { samples, resolution, maxDeviation } = result;

    // Get the middle Z slice (same as mesh mode)
    const sliceZ = Math.floor(resolution / 2);
    const sliceStart = sliceZ * resolution * resolution;

    // Create a 2D array of curvature values for the slice
    const curvatureGrid: number[][] = [];
    for (let iy = 0; iy < resolution; iy++) {
      curvatureGrid[iy] = [];
      for (let ix = 0; ix < resolution; ix++) {
        const sampleIdx = sliceStart + iy * resolution + ix;
        curvatureGrid[iy][ix] = samples[sampleIdx].metricDeviation;
      }
    }

    // Get bounds from samples
    const firstSample = samples[sliceStart];
    const lastSample = samples[sliceStart + resolution * resolution - 1];
    const minX = firstSample.position[0];
    const maxX = lastSample.position[0];
    const minY = firstSample.position[1];
    const maxY = lastSample.position[1];

    // Calculate contour levels
    const normFactor = maxDeviation > 1e-10 ? 1 / maxDeviation : 1;
    const levels: number[] = [];
    for (let i = 0; i < CONTOUR_LEVELS; i++) {
      // Levels from -maxDeviation to maxDeviation
      levels.push(-maxDeviation + (2 * maxDeviation * (i + 0.5)) / CONTOUR_LEVELS);
    }

    // Generate contour lines using marching squares algorithm
    levels.forEach((level) => {
      const segments = this.marchingSquares(
        curvatureGrid,
        level,
        resolution,
        minX,
        maxX,
        minY,
        maxY
      );

      if (segments.length === 0) return;

      // Create line geometry
      const points: THREE.Vector3[] = [];
      segments.forEach((seg) => {
        points.push(new THREE.Vector3(seg.x1, seg.y1, 0));
        points.push(new THREE.Vector3(seg.x2, seg.y2, 0));
      });

      if (points.length === 0) return;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      resources.geometries.push(geometry);

      // Color based on level
      const normalizedLevel = (level * normFactor + 1) / 2;
      const color = getColorForCurvature(Math.max(0, Math.min(1, normalizedLevel)));

      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: CONTOUR_LINE_WIDTH,
        transparent: true,
        opacity: 0.8,
      });
      resources.materials.push(material);

      const lines = new THREE.LineSegments(geometry, material);
      group.add(lines);
    });

    // Add a reference plane
    const planeGeometry = new THREE.PlaneGeometry(maxX - minX, maxY - minY);
    resources.geometries.push(planeGeometry);

    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    resources.materials.push(planeMaterial);

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set((maxX + minX) / 2, (maxY + minY) / 2, -0.1);
    group.add(plane);

    return { object: group, resources };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_result: CurvatureGridResult, _existingObject: THREE.Object3D): boolean {
    // Contour mode requires full re-render for updates
    return false;
  }

  /**
   * Simple marching squares implementation for contour extraction.
   */
  private marchingSquares(
    grid: number[][],
    level: number,
    resolution: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const dx = (maxX - minX) / (resolution - 1);
    const dy = (maxY - minY) / (resolution - 1);

    for (let iy = 0; iy < resolution - 1; iy++) {
      for (let ix = 0; ix < resolution - 1; ix++) {
        // Get cell corners
        const v00 = grid[iy][ix];
        const v10 = grid[iy][ix + 1];
        const v01 = grid[iy + 1][ix];
        const v11 = grid[iy + 1][ix + 1];

        // Determine case (4-bit index)
        let caseIndex = 0;
        if (v00 >= level) caseIndex |= 1;
        if (v10 >= level) caseIndex |= 2;
        if (v01 >= level) caseIndex |= 4;
        if (v11 >= level) caseIndex |= 8;

        // Skip empty or full cells
        if (caseIndex === 0 || caseIndex === 15) continue;

        // Cell position
        const x = minX + ix * dx;
        const y = minY + iy * dy;

        // Interpolation helper
        const lerp = (a: number, b: number, va: number, vb: number): number => {
          if (Math.abs(vb - va) < 1e-10) return (a + b) / 2;
          return a + ((level - va) / (vb - va)) * (b - a);
        };

        // Edge midpoints (with interpolation)
        const left = lerp(y, y + dy, v00, v01);
        const right = lerp(y, y + dy, v10, v11);
        const bottom = lerp(x, x + dx, v00, v10);
        const top = lerp(x, x + dx, v01, v11);

        // Generate segments based on case
        switch (caseIndex) {
          case 1:
          case 14:
            segments.push({ x1: x, y1: left, x2: bottom, y2: y });
            break;
          case 2:
          case 13:
            segments.push({ x1: bottom, y1: y, x2: x + dx, y2: right });
            break;
          case 3:
          case 12:
            segments.push({ x1: x, y1: left, x2: x + dx, y2: right });
            break;
          case 4:
          case 11:
            segments.push({ x1: x, y1: left, x2: top, y2: y + dy });
            break;
          case 5:
          case 10: {
            // Saddle point - use average to decide
            const avg = (v00 + v10 + v01 + v11) / 4;
            if (avg >= level) {
              segments.push({ x1: x, y1: left, x2: bottom, y2: y });
              segments.push({ x1: top, y1: y + dy, x2: x + dx, y2: right });
            } else {
              segments.push({ x1: x, y1: left, x2: top, y2: y + dy });
              segments.push({ x1: bottom, y1: y, x2: x + dx, y2: right });
            }
            break;
          }
          case 6:
          case 9:
            segments.push({ x1: bottom, y1: y, x2: top, y2: y + dy });
            break;
          case 7:
          case 8:
            segments.push({ x1: top, y1: y + dy, x2: x + dx, y2: right });
            break;
        }
      }
    }

    return segments;
  }
}

/**
 * Creates a new contour mode renderer instance.
 */
export function createContourModeRenderer(): VisualizationModeRenderer {
  return new ContourModeRenderer();
}
