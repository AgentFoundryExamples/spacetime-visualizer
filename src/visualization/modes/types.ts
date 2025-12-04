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
import type { CurvatureGridResult } from '../../physics/types';
import type { VisualizationMode } from '../../content/strings';

/**
 * Disposable resources that must be cleaned up when switching modes.
 */
export interface DisposableResources {
  /** Dispose all geometry objects */
  geometries: THREE.BufferGeometry[];
  /** Dispose all material objects */
  materials: THREE.Material[];
  /** Dispose all texture objects */
  textures: THREE.Texture[];
}

/**
 * Result of a mode render operation.
 */
export interface ModeRenderResult {
  /** The main Three.js object to add to the scene */
  object: THREE.Object3D;
  /** Resources that need disposal when mode changes */
  resources: DisposableResources;
}

/**
 * Interface for visualization mode renderers.
 * Each mode implements this interface to provide a consistent API.
 */
export interface VisualizationModeRenderer {
  /** Unique identifier for the mode */
  readonly id: VisualizationMode;

  /**
   * Creates the visualization from curvature data.
   * @param result - The curvature grid computation result
   * @returns Render result with object and disposable resources
   */
  render(result: CurvatureGridResult): ModeRenderResult;

  /**
   * Updates the visualization with new curvature data.
   * More efficient than full re-render for animations.
   * @param result - The new curvature grid computation result
   * @param existingObject - The existing Three.js object to update
   * @returns true if update was successful, false if full re-render needed
   */
  update(result: CurvatureGridResult, existingObject: THREE.Object3D): boolean;
}

/**
 * Creates empty disposable resources object.
 */
export function createEmptyResources(): DisposableResources {
  return {
    geometries: [],
    materials: [],
    textures: [],
  };
}

/**
 * Disposes all resources in the given object.
 * @param resources - Resources to dispose
 */
export function disposeResources(resources: DisposableResources): void {
  resources.geometries.forEach((g) => g.dispose());
  resources.materials.forEach((m) => m.dispose());
  resources.textures.forEach((t) => t.dispose());

  // Clear arrays
  resources.geometries.length = 0;
  resources.materials.length = 0;
  resources.textures.length = 0;
}

/**
 * Registry of available visualization mode renderers.
 */
export type ModeRegistry = Record<VisualizationMode, VisualizationModeRenderer>;
