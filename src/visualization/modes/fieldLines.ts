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
 * Number of field lines to generate.
 */
const NUM_FIELD_LINES = 32;

/**
 * Number of segments per field line.
 */
const SEGMENTS_PER_LINE = 20;

/**
 * Step size for field line integration.
 */
const INTEGRATION_STEP = 0.3;

/**
 * Field lines visualization mode.
 * Renders particles/lines showing gravitational field direction.
 */
export class FieldLinesModeRenderer implements VisualizationModeRenderer {
  readonly id = 'fieldLines' as const;

  render(result: CurvatureGridResult): ModeRenderResult {
    const resources = createEmptyResources();
    const group = new THREE.Group();
    group.name = 'field-lines';

    const { samples, resolution, maxDeviation, bounds } = result;

    // Get the middle Z slice
    const sliceZ = Math.floor(resolution / 2);
    const sliceStart = sliceZ * resolution * resolution;

    // Create gradient lookup for the slice
    const gradients = this.computeGradients(samples, resolution, sliceStart);

    // Generate field lines from various starting positions
    const minX = bounds[0];
    const maxX = bounds[3];
    const minY = bounds[1];
    const maxY = bounds[4];
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    const normFactor = maxDeviation > 1e-10 ? 1 / maxDeviation : 1;

    for (let i = 0; i < NUM_FIELD_LINES; i++) {
      // Distribute starting points in a circular pattern
      const angle = (i / NUM_FIELD_LINES) * Math.PI * 2;
      const radius = Math.min(rangeX, rangeY) * 0.4;
      const startX = (minX + maxX) / 2 + Math.cos(angle) * radius;
      const startY = (minY + maxY) / 2 + Math.sin(angle) * radius;

      // Trace field line
      const points: THREE.Vector3[] = [];
      let x = startX;
      let y = startY;

      for (let s = 0; s < SEGMENTS_PER_LINE; s++) {
        points.push(new THREE.Vector3(x, y, 0));

        // Get gradient at current position (bilinear interpolation)
        const grad = this.sampleGradient(
          gradients,
          x,
          y,
          resolution,
          minX,
          maxX,
          minY,
          maxY
        );

        // Move along gradient (toward mass = negative gradient direction)
        const gradMag = Math.sqrt(grad.x * grad.x + grad.y * grad.y);
        if (gradMag < 1e-10) break;

        // Normalize and step
        x -= (grad.x / gradMag) * INTEGRATION_STEP;
        y -= (grad.y / gradMag) * INTEGRATION_STEP;

        // Stop if out of bounds
        if (x < minX || x > maxX || y < minY || y > maxY) break;
      }

      if (points.length < 2) continue;

      // Create line geometry
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      resources.geometries.push(geometry);

      // Sample curvature at start for color
      const startCurvature = this.sampleCurvature(
        samples,
        startX,
        startY,
        resolution,
        sliceStart,
        minX,
        maxX,
        minY,
        maxY
      );
      const normalizedCurvature = (startCurvature * normFactor + 1) / 2;
      const color = getColorForCurvature(
        Math.max(0, Math.min(1, normalizedCurvature))
      );

      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
      });
      resources.materials.push(material);

      const line = new THREE.Line(geometry, material);
      group.add(line);

      // Add arrowheads to show direction
      if (points.length >= 2) {
        const tipIdx = Math.min(3, points.length - 1);
        const tip = points[tipIdx];
        const prev = points[tipIdx - 1];
        const dir = new THREE.Vector3()
          .subVectors(tip, prev)
          .normalize();

        const coneGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
        resources.geometries.push(coneGeometry);

        const coneMaterial = new THREE.MeshBasicMaterial({ color });
        resources.materials.push(coneMaterial);

        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.copy(tip);

        // Orient cone along direction
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
        cone.quaternion.copy(quaternion);

        group.add(cone);
      }
    }

    // Add reference plane
    const planeGeometry = new THREE.PlaneGeometry(rangeX, rangeY);
    resources.geometries.push(planeGeometry);

    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
    });
    resources.materials.push(planeMaterial);

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set((maxX + minX) / 2, (maxY + minY) / 2, -0.1);
    group.add(plane);

    return { object: group, resources };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_result: CurvatureGridResult, _existingObject: THREE.Object3D): boolean {
    // Field lines mode requires full re-render for updates
    return false;
  }

  /**
   * Computes gradient vectors for the curvature field.
   */
  private computeGradients(
    samples: CurvatureGridResult['samples'],
    resolution: number,
    sliceStart: number
  ): Array<{ x: number; y: number }> {
    const gradients: Array<{ x: number; y: number }> = [];

    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const idx = sliceStart + iy * resolution + ix;
        const sample = samples[idx];

        // Central differences for gradient
        let gradX = 0;
        let gradY = 0;

        if (ix > 0 && ix < resolution - 1) {
          const left = samples[idx - 1];
          const right = samples[idx + 1];
          gradX =
            (right.metricDeviation - left.metricDeviation) /
            (right.position[0] - left.position[0]);
        } else if (ix === 0) {
          const right = samples[idx + 1];
          gradX =
            (right.metricDeviation - sample.metricDeviation) /
            (right.position[0] - sample.position[0]);
        } else {
          const left = samples[idx - 1];
          gradX =
            (sample.metricDeviation - left.metricDeviation) /
            (sample.position[0] - left.position[0]);
        }

        if (iy > 0 && iy < resolution - 1) {
          const bottom = samples[idx - resolution];
          const top = samples[idx + resolution];
          gradY =
            (top.metricDeviation - bottom.metricDeviation) /
            (top.position[1] - bottom.position[1]);
        } else if (iy === 0) {
          const top = samples[idx + resolution];
          gradY =
            (top.metricDeviation - sample.metricDeviation) /
            (top.position[1] - sample.position[1]);
        } else {
          const bottom = samples[idx - resolution];
          gradY =
            (sample.metricDeviation - bottom.metricDeviation) /
            (sample.position[1] - bottom.position[1]);
        }

        gradients.push({ x: gradX, y: gradY });
      }
    }

    return gradients;
  }

  /**
   * Samples gradient at arbitrary position using bilinear interpolation.
   */
  private sampleGradient(
    gradients: Array<{ x: number; y: number }>,
    x: number,
    y: number,
    resolution: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): { x: number; y: number } {
    const dx = (maxX - minX) / (resolution - 1);
    const dy = (maxY - minY) / (resolution - 1);

    const fx = (x - minX) / dx;
    const fy = (y - minY) / dy;

    const ix = Math.floor(fx);
    const iy = Math.floor(fy);

    if (ix < 0 || ix >= resolution - 1 || iy < 0 || iy >= resolution - 1) {
      return { x: 0, y: 0 };
    }

    const tx = fx - ix;
    const ty = fy - iy;

    const g00 = gradients[iy * resolution + ix];
    const g10 = gradients[iy * resolution + ix + 1];
    const g01 = gradients[(iy + 1) * resolution + ix];
    const g11 = gradients[(iy + 1) * resolution + ix + 1];

    return {
      x:
        (1 - tx) * (1 - ty) * g00.x +
        tx * (1 - ty) * g10.x +
        (1 - tx) * ty * g01.x +
        tx * ty * g11.x,
      y:
        (1 - tx) * (1 - ty) * g00.y +
        tx * (1 - ty) * g10.y +
        (1 - tx) * ty * g01.y +
        tx * ty * g11.y,
    };
  }

  /**
   * Samples curvature at arbitrary position using bilinear interpolation.
   */
  private sampleCurvature(
    samples: CurvatureGridResult['samples'],
    x: number,
    y: number,
    resolution: number,
    sliceStart: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): number {
    const dx = (maxX - minX) / (resolution - 1);
    const dy = (maxY - minY) / (resolution - 1);

    const fx = (x - minX) / dx;
    const fy = (y - minY) / dy;

    const ix = Math.floor(fx);
    const iy = Math.floor(fy);

    if (ix < 0 || ix >= resolution - 1 || iy < 0 || iy >= resolution - 1) {
      return 0;
    }

    const tx = fx - ix;
    const ty = fy - iy;

    const v00 = samples[sliceStart + iy * resolution + ix].metricDeviation;
    const v10 = samples[sliceStart + iy * resolution + ix + 1].metricDeviation;
    const v01 = samples[sliceStart + (iy + 1) * resolution + ix].metricDeviation;
    const v11 =
      samples[sliceStart + (iy + 1) * resolution + ix + 1].metricDeviation;

    return (
      (1 - tx) * (1 - ty) * v00 +
      tx * (1 - ty) * v10 +
      (1 - tx) * ty * v01 +
      tx * ty * v11
    );
  }
}

/**
 * Creates a new field lines mode renderer instance.
 */
export function createFieldLinesModeRenderer(): VisualizationModeRenderer {
  return new FieldLinesModeRenderer();
}
