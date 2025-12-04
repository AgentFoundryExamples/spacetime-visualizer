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

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildCurvatureMesh,
  createBufferGeometry,
  createMassSpheres,
  checkResolutionWarning,
  clampResolution,
  MAX_SAFE_RESOLUTION,
  buildTrailRenderData,
  createTrailLine,
  updateTrailLine,
} from '../visualization/renderer';
import {
  getColorForCurvature,
  createCurvatureMaterial,
  createWireframeMaterial,
  createMassSphereMaterial,
  CURVATURE_GRADIENT,
} from '../visualization/materials';
import type { CurvatureGridResult, MassSource } from '../physics/types';

describe('visualization/materials', () => {
  describe('getColorForCurvature', () => {
    it('should return first gradient color for value 0', () => {
      const color = getColorForCurvature(0);
      expect(color).toBeInstanceOf(THREE.Color);
      expect(color.getHex()).toBe(CURVATURE_GRADIENT[0].color.getHex());
    });

    it('should return last gradient color for value 1', () => {
      const color = getColorForCurvature(1);
      expect(color).toBeInstanceOf(THREE.Color);
      expect(color.getHex()).toBe(
        CURVATURE_GRADIENT[CURVATURE_GRADIENT.length - 1].color.getHex()
      );
    });

    it('should interpolate between gradient stops', () => {
      const color = getColorForCurvature(0.5);
      expect(color).toBeInstanceOf(THREE.Color);
      // Should be somewhere between the gradient colors
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(1);
    });

    it('should clamp values below 0', () => {
      const color = getColorForCurvature(-0.5);
      expect(color.getHex()).toBe(CURVATURE_GRADIENT[0].color.getHex());
    });

    it('should clamp values above 1', () => {
      const color = getColorForCurvature(1.5);
      expect(color.getHex()).toBe(
        CURVATURE_GRADIENT[CURVATURE_GRADIENT.length - 1].color.getHex()
      );
    });
  });

  describe('createCurvatureMaterial', () => {
    it('should create a MeshStandardMaterial with vertex colors', () => {
      const material = createCurvatureMaterial();
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.vertexColors).toBe(true);
      expect(material.side).toBe(THREE.DoubleSide);
      material.dispose();
    });
  });

  describe('createWireframeMaterial', () => {
    it('should create a LineBasicMaterial', () => {
      const material = createWireframeMaterial();
      expect(material).toBeInstanceOf(THREE.LineBasicMaterial);
      expect(material.transparent).toBe(true);
      material.dispose();
    });
  });

  describe('createMassSphereMaterial', () => {
    it('should create a MeshStandardMaterial with default color', () => {
      const material = createMassSphereMaterial();
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      material.dispose();
    });

    it('should use provided color', () => {
      const material = createMassSphereMaterial('#ff0000');
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      material.dispose();
    });
  });
});

describe('visualization/renderer', () => {
  describe('checkResolutionWarning', () => {
    it('should return null for safe resolutions', () => {
      expect(checkResolutionWarning(16)).toBeNull();
      expect(checkResolutionWarning(32)).toBeNull();
      expect(checkResolutionWarning(MAX_SAFE_RESOLUTION)).toBeNull();
    });

    it('should return warning for high resolutions', () => {
      const warning = checkResolutionWarning(128);
      expect(warning).not.toBeNull();
      expect(warning).toContain('performance');
    });
  });

  describe('clampResolution', () => {
    it('should clamp to minimum of 2', () => {
      expect(clampResolution(0)).toBe(2);
      expect(clampResolution(1)).toBe(2);
      expect(clampResolution(-10)).toBe(2);
    });

    it('should clamp to default maximum of 128', () => {
      expect(clampResolution(200)).toBe(128);
      expect(clampResolution(1000)).toBe(128);
    });

    it('should allow custom maximum', () => {
      expect(clampResolution(200, 256)).toBe(200);
      expect(clampResolution(300, 256)).toBe(256);
    });

    it('should pass through valid values', () => {
      expect(clampResolution(16)).toBe(16);
      expect(clampResolution(32)).toBe(32);
      expect(clampResolution(64)).toBe(64);
    });
  });

  describe('buildCurvatureMesh', () => {
    const createMockResult = (resolution: number): CurvatureGridResult => {
      const samples = [];
      const bounds: [number, number, number, number, number, number] = [
        -1, -1, -1, 1, 1, 1,
      ];
      const step = 2 / resolution;

      for (let iz = 0; iz < resolution; iz++) {
        const z = -1 + (iz + 0.5) * step;
        for (let iy = 0; iy < resolution; iy++) {
          const y = -1 + (iy + 0.5) * step;
          for (let ix = 0; ix < resolution; ix++) {
            const x = -1 + (ix + 0.5) * step;
            const deviation = -Math.sqrt(x * x + y * y + z * z);
            samples.push({
              position: [x, y, z] as [number, number, number],
              metricDeviation: deviation,
              tidalTensor: [0, 0, 0] as [number, number, number],
            });
          }
        }
      }

      const maxDeviation = Math.max(
        ...samples.map((s) => Math.abs(s.metricDeviation))
      );

      return {
        samples,
        resolution,
        bounds,
        maxDeviation,
      };
    };

    it('should create mesh data with correct array sizes', () => {
      const result = createMockResult(4);
      const meshData = buildCurvatureMesh(result);

      const numVertices = 4 * 4; // resolution^2 for 2D heightfield
      expect(meshData.positions.length).toBe(numVertices * 3);
      expect(meshData.normals.length).toBe(numVertices * 3);
      expect(meshData.colors.length).toBe(numVertices * 3);

      const numCells = 3 * 3; // (resolution-1)^2
      expect(meshData.indices.length).toBe(numCells * 6); // 2 triangles per cell
    });

    it('should produce valid position data', () => {
      const result = createMockResult(4);
      const meshData = buildCurvatureMesh(result);

      // All positions should be finite numbers
      for (let i = 0; i < meshData.positions.length; i++) {
        expect(Number.isFinite(meshData.positions[i])).toBe(true);
      }
    });

    it('should produce normalized normals', () => {
      const result = createMockResult(4);
      const meshData = buildCurvatureMesh(result);

      // Check that normals are approximately unit length
      for (let i = 0; i < meshData.normals.length; i += 3) {
        const nx = meshData.normals[i];
        const ny = meshData.normals[i + 1];
        const nz = meshData.normals[i + 2];
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        expect(len).toBeCloseTo(1, 4);
      }
    });

    it('should produce valid color data in [0, 1] range', () => {
      const result = createMockResult(4);
      const meshData = buildCurvatureMesh(result);

      for (let i = 0; i < meshData.colors.length; i++) {
        expect(meshData.colors[i]).toBeGreaterThanOrEqual(0);
        expect(meshData.colors[i]).toBeLessThanOrEqual(1);
      }
    });

    it('should handle different height scales', () => {
      const result = createMockResult(4);
      const mesh1 = buildCurvatureMesh(result, 1.0);
      const mesh2 = buildCurvatureMesh(result, 2.0);

      // Z positions should differ by the scale factor
      // (for non-zero curvature samples)
      let foundDifference = false;
      for (let i = 2; i < mesh1.positions.length; i += 3) {
        if (mesh1.positions[i] !== 0) {
          expect(mesh2.positions[i]).toBeCloseTo(mesh1.positions[i] * 2, 4);
          foundDifference = true;
        }
      }
      expect(foundDifference).toBe(true);
    });
  });

  describe('createBufferGeometry', () => {
    it('should create valid BufferGeometry from mesh data', () => {
      const result: CurvatureGridResult = {
        samples: Array(8)
          .fill(null)
          .map((_, i) => ({
            position: [
              (i % 2) - 0.5,
              (Math.floor(i / 2) % 2) - 0.5,
              Math.floor(i / 4) - 0.5,
            ] as [number, number, number],
            metricDeviation: -0.5,
            tidalTensor: [0, 0, 0] as [number, number, number],
          })),
        resolution: 2,
        bounds: [-1, -1, -1, 1, 1, 1],
        maxDeviation: 0.5,
      };

      const meshData = buildCurvatureMesh(result);
      const geometry = createBufferGeometry(meshData);

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(geometry.getAttribute('position')).toBeDefined();
      expect(geometry.getAttribute('normal')).toBeDefined();
      expect(geometry.getAttribute('color')).toBeDefined();
      expect(geometry.index).toBeDefined();

      geometry.dispose();
    });
  });

  describe('createMassSpheres', () => {
    it('should create sphere data for each mass', () => {
      const masses: MassSource[] = [
        {
          id: 'm1',
          position: [0, 0, 0],
          mass: 100,
          radius: 0.5,
          color: '#ff0000',
        },
        { id: 'm2', position: [1, 0, 0], mass: 50 },
      ];

      const spheres = createMassSpheres(masses);

      expect(spheres.length).toBe(2);
      expect(spheres[0].position).toEqual([0, 0, 0]);
      expect(spheres[0].radius).toBe(0.5);
      expect(spheres[0].color).toBe('#ff0000');

      expect(spheres[1].position).toEqual([1, 0, 0]);
      expect(spheres[1].color).toBe('#ffcc00'); // Default color
    });

    it('should calculate default radius based on mass', () => {
      const masses: MassSource[] = [
        { id: 'm1', position: [0, 0, 0], mass: 1000 },
      ];

      const spheres = createMassSpheres(masses);

      // Radius should be proportional to cube root of mass
      expect(spheres[0].radius).toBeGreaterThan(0.2);
    });
  });

  describe('buildTrailRenderData', () => {
    it('should return empty data for trail with less than 2 points', () => {
      const trail = {
        massId: 'mass1',
        points: [{ position: [0, 0, 0] as [number, number, number], timestamp: 0 }],
      };

      const data = buildTrailRenderData(trail);

      expect(data.pointCount).toBe(0);
      expect(data.positions.length).toBe(0);
      expect(data.colors.length).toBe(0);
    });

    it('should create position and color data for valid trail', () => {
      const trail = {
        massId: 'mass1',
        points: [
          { position: [0, 0, 0] as [number, number, number], timestamp: 0 },
          { position: [1, 0, 0] as [number, number, number], timestamp: 0.5 },
          { position: [2, 0, 0] as [number, number, number], timestamp: 1.0 },
        ],
      };

      const data = buildTrailRenderData(trail, '#ffffff');

      expect(data.massId).toBe('mass1');
      expect(data.pointCount).toBe(3);
      expect(data.positions.length).toBe(9); // 3 points * 3 components
      expect(data.colors.length).toBe(12); // 3 points * 4 components (RGBA)

      // Check positions
      expect(data.positions[0]).toBe(0);
      expect(data.positions[3]).toBe(1);
      expect(data.positions[6]).toBe(2);

      // Check fading alpha (oldest = lower, newest = 1)
      expect(data.colors[3]).toBeCloseTo(1/3, 5); // First point alpha
      expect(data.colors[7]).toBeCloseTo(2/3, 5); // Second point alpha
      expect(data.colors[11]).toBeCloseTo(1, 5); // Third point alpha (newest)
    });

    it('should use provided base color', () => {
      const trail = {
        massId: 'mass1',
        points: [
          { position: [0, 0, 0] as [number, number, number], timestamp: 0 },
          { position: [1, 0, 0] as [number, number, number], timestamp: 0.5 },
        ],
      };

      const data = buildTrailRenderData(trail, '#ff0000');

      expect(data.color).toBe('#ff0000');
      // Red component should be 1, green and blue should be 0
      expect(data.colors[0]).toBeCloseTo(1, 5); // R
      expect(data.colors[1]).toBeCloseTo(0, 5); // G
      expect(data.colors[2]).toBeCloseTo(0, 5); // B
    });
  });

  describe('createTrailLine', () => {
    it('should return null for trail with less than 2 points', () => {
      const trail = {
        massId: 'mass1',
        points: [{ position: [0, 0, 0] as [number, number, number], timestamp: 0 }],
      };

      const data = buildTrailRenderData(trail);
      const result = createTrailLine(data);

      expect(result).toBeNull();
    });

    it('should create a Line object with correct geometry', () => {
      const trail = {
        massId: 'mass1',
        points: [
          { position: [0, 0, 0] as [number, number, number], timestamp: 0 },
          { position: [1, 1, 0] as [number, number, number], timestamp: 0.5 },
        ],
      };

      const data = buildTrailRenderData(trail);
      const result = createTrailLine(data);

      expect(result).not.toBeNull();
      expect(result!.line).toBeInstanceOf(THREE.Line);
      expect(result!.geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(result!.material).toBeInstanceOf(THREE.LineBasicMaterial);
      expect(result!.line.name).toBe('trail-mass1');

      // Cleanup
      result!.geometry.dispose();
      result!.material.dispose();
    });
  });

  describe('updateTrailLine', () => {
    it('should return false when point counts do not match', () => {
      // Create initial trail with 2 points
      const trail1 = {
        massId: 'mass1',
        points: [
          { position: [0, 0, 0] as [number, number, number], timestamp: 0 },
          { position: [1, 0, 0] as [number, number, number], timestamp: 0.5 },
        ],
      };

      const data1 = buildTrailRenderData(trail1);
      const result = createTrailLine(data1);

      // Try to update with 3 points
      const trail2 = {
        massId: 'mass1',
        points: [
          { position: [0, 0, 0] as [number, number, number], timestamp: 0 },
          { position: [1, 0, 0] as [number, number, number], timestamp: 0.5 },
          { position: [2, 0, 0] as [number, number, number], timestamp: 1.0 },
        ],
      };

      const data2 = buildTrailRenderData(trail2);
      const updateResult = updateTrailLine(result!.line, data2);

      expect(updateResult).toBe(false);

      // Cleanup
      result!.geometry.dispose();
      result!.material.dispose();
    });

    it('should successfully update when point counts match', () => {
      // Create initial trail
      const trail1 = {
        massId: 'mass1',
        points: [
          { position: [0, 0, 0] as [number, number, number], timestamp: 0 },
          { position: [1, 0, 0] as [number, number, number], timestamp: 0.5 },
        ],
      };

      const data1 = buildTrailRenderData(trail1);
      const result = createTrailLine(data1);

      // Update with same number of points but different positions
      const trail2 = {
        massId: 'mass1',
        points: [
          { position: [1, 0, 0] as [number, number, number], timestamp: 0.5 },
          { position: [2, 0, 0] as [number, number, number], timestamp: 1.0 },
        ],
      };

      const data2 = buildTrailRenderData(trail2);
      const updateResult = updateTrailLine(result!.line, data2);

      expect(updateResult).toBe(true);

      // Verify positions were updated
      const positions = result!.geometry.getAttribute('position') as THREE.BufferAttribute;
      expect(positions.getX(0)).toBe(1);
      expect(positions.getX(1)).toBe(2);

      // Cleanup
      result!.geometry.dispose();
      result!.material.dispose();
    });
  });
});
