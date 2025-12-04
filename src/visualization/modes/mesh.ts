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
import type {
  VisualizationModeRenderer,
  ModeRenderResult,
} from './types';
import { createEmptyResources } from './types';
import {
  buildCurvatureMesh,
  createBufferGeometry,
  updateBufferGeometry,
} from '../renderer';
import { createCurvatureMaterial } from '../materials';

/**
 * Heightfield mesh visualization mode.
 * Renders curvature as a 3D surface with height displacement.
 */
export class MeshModeRenderer implements VisualizationModeRenderer {
  readonly id = 'mesh' as const;

  render(result: CurvatureGridResult): ModeRenderResult {
    const resources = createEmptyResources();

    // Build mesh data from curvature
    const meshData = buildCurvatureMesh(result);
    const geometry = createBufferGeometry(meshData);
    const material = createCurvatureMaterial();

    resources.geometries.push(geometry);
    resources.materials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'curvature-mesh';

    return { object: mesh, resources };
  }

  update(result: CurvatureGridResult, existingObject: THREE.Object3D): boolean {
    const mesh = existingObject as THREE.Mesh;
    if (!mesh.geometry || !(mesh.geometry instanceof THREE.BufferGeometry)) {
      return false;
    }

    // Check if resolution changed (requires new geometry)
    const positionAttr = mesh.geometry.getAttribute('position');
    const expectedVertices = result.resolution * result.resolution;
    if (positionAttr.count !== expectedVertices) {
      return false; // Need full re-render
    }

    // Update existing geometry
    const meshData = buildCurvatureMesh(result);
    updateBufferGeometry(mesh.geometry, meshData);

    return true;
  }
}

/**
 * Creates a new mesh mode renderer instance.
 */
export function createMeshModeRenderer(): VisualizationModeRenderer {
  return new MeshModeRenderer();
}
