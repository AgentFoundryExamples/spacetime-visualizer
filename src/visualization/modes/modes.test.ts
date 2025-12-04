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
  createMeshModeRenderer,
  createContourModeRenderer,
  createFieldLinesModeRenderer,
  createModeRegistry,
  getModeRenderer,
  disposeResources,
  createEmptyResources,
} from './index';
import type { CurvatureGridResult } from '../../physics/types';

// Create a simple test curvature result
function createTestResult(resolution: number = 4): CurvatureGridResult {
  const samples = [];
  const bounds: [number, number, number, number, number, number] = [
    -5, -5, -5, 5, 5, 5,
  ];
  const step = 10 / (resolution - 1);

  for (let iz = 0; iz < resolution; iz++) {
    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const x = bounds[0] + ix * step;
        const y = bounds[1] + iy * step;
        const z = bounds[2] + iz * step;

        // Simple curvature based on distance from center
        const distance = Math.sqrt(x * x + y * y + z * z);
        const metricDeviation = distance > 0.1 ? -1 / distance : -10;

        samples.push({
          position: [x, y, z] as [number, number, number],
          metricDeviation,
          tidalTensor: [0, 0, 0] as [number, number, number],
        });
      }
    }
  }

  return {
    samples,
    resolution,
    bounds,
    maxDeviation: 10,
  };
}

describe('visualization/modes', () => {
  describe('MeshModeRenderer', () => {
    it('should have correct id', () => {
      const renderer = createMeshModeRenderer();
      expect(renderer.id).toBe('mesh');
    });

    it('should render a mesh object', () => {
      const renderer = createMeshModeRenderer();
      const result = createTestResult(4);
      const { object, resources } = renderer.render(result);

      expect(object).toBeInstanceOf(THREE.Mesh);
      expect(object.name).toBe('curvature-mesh');
      expect(resources.geometries.length).toBeGreaterThan(0);
      expect(resources.materials.length).toBeGreaterThan(0);

      // Cleanup
      disposeResources(resources);
    });

    it('should update existing mesh when resolution matches', () => {
      const renderer = createMeshModeRenderer();
      const result = createTestResult(4);
      const { object, resources } = renderer.render(result);

      // Update with same resolution
      const newResult = createTestResult(4);
      const updateSuccessful = renderer.update(newResult, object);

      expect(updateSuccessful).toBe(true);

      // Cleanup
      disposeResources(resources);
    });

    it('should return false when resolution changes', () => {
      const renderer = createMeshModeRenderer();
      const result = createTestResult(4);
      const { object, resources } = renderer.render(result);

      // Update with different resolution
      const newResult = createTestResult(8);
      const updateSuccessful = renderer.update(newResult, object);

      expect(updateSuccessful).toBe(false);

      // Cleanup
      disposeResources(resources);
    });
  });

  describe('ContourModeRenderer', () => {
    it('should have correct id', () => {
      const renderer = createContourModeRenderer();
      expect(renderer.id).toBe('contour');
    });

    it('should render a group object with contour lines', () => {
      const renderer = createContourModeRenderer();
      const result = createTestResult(8);
      const { object, resources } = renderer.render(result);

      expect(object).toBeInstanceOf(THREE.Group);
      expect(object.name).toBe('contour-grid');
      expect(object.children.length).toBeGreaterThan(0);
      expect(resources.geometries.length).toBeGreaterThan(0);
      expect(resources.materials.length).toBeGreaterThan(0);

      // Cleanup
      disposeResources(resources);
    });

    it('should always return false for update (requires full re-render)', () => {
      const renderer = createContourModeRenderer();
      const result = createTestResult(8);
      const { object, resources } = renderer.render(result);

      const updateSuccessful = renderer.update(result, object);
      expect(updateSuccessful).toBe(false);

      // Cleanup
      disposeResources(resources);
    });
  });

  describe('FieldLinesModeRenderer', () => {
    it('should have correct id', () => {
      const renderer = createFieldLinesModeRenderer();
      expect(renderer.id).toBe('fieldLines');
    });

    it('should render a group object with field lines', () => {
      const renderer = createFieldLinesModeRenderer();
      const result = createTestResult(8);
      const { object, resources } = renderer.render(result);

      expect(object).toBeInstanceOf(THREE.Group);
      expect(object.name).toBe('field-lines');
      expect(object.children.length).toBeGreaterThan(0);
      expect(resources.geometries.length).toBeGreaterThan(0);
      expect(resources.materials.length).toBeGreaterThan(0);

      // Cleanup
      disposeResources(resources);
    });

    it('should always return false for update (requires full re-render)', () => {
      const renderer = createFieldLinesModeRenderer();
      const result = createTestResult(8);
      const { object, resources } = renderer.render(result);

      const updateSuccessful = renderer.update(result, object);
      expect(updateSuccessful).toBe(false);

      // Cleanup
      disposeResources(resources);
    });
  });

  describe('createModeRegistry', () => {
    it('should return a registry with all modes', () => {
      const registry = createModeRegistry();

      expect(registry.mesh).toBeDefined();
      expect(registry.contour).toBeDefined();
      expect(registry.fieldLines).toBeDefined();

      expect(registry.mesh.id).toBe('mesh');
      expect(registry.contour.id).toBe('contour');
      expect(registry.fieldLines.id).toBe('fieldLines');
    });
  });

  describe('getModeRenderer', () => {
    it('should return correct renderer for each mode', () => {
      expect(getModeRenderer('mesh').id).toBe('mesh');
      expect(getModeRenderer('contour').id).toBe('contour');
      expect(getModeRenderer('fieldLines').id).toBe('fieldLines');
    });
  });

  describe('disposeResources', () => {
    it('should dispose all resources and clear arrays', () => {
      const resources = createEmptyResources();

      // Add some mock resources
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.MeshBasicMaterial();
      const texture = new THREE.Texture();

      resources.geometries.push(geometry);
      resources.materials.push(material);
      resources.textures.push(texture);

      expect(resources.geometries.length).toBe(1);
      expect(resources.materials.length).toBe(1);
      expect(resources.textures.length).toBe(1);

      disposeResources(resources);

      expect(resources.geometries.length).toBe(0);
      expect(resources.materials.length).toBe(0);
      expect(resources.textures.length).toBe(0);
    });
  });

  describe('createEmptyResources', () => {
    it('should create empty resource arrays', () => {
      const resources = createEmptyResources();

      expect(resources.geometries).toEqual([]);
      expect(resources.materials).toEqual([]);
      expect(resources.textures).toEqual([]);
    });
  });
});
