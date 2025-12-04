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

export type {
  VisualizationModeRenderer,
  ModeRenderResult,
  DisposableResources,
  ModeRegistry,
} from './types';

export { createEmptyResources, disposeResources } from './types';

export { MeshModeRenderer, createMeshModeRenderer } from './mesh';
export { ContourModeRenderer, createContourModeRenderer } from './contour';
export { FieldLinesModeRenderer, createFieldLinesModeRenderer } from './fieldLines';

import type { VisualizationMode } from '../../content/strings';
import type { ModeRegistry, VisualizationModeRenderer } from './types';
import { createMeshModeRenderer } from './mesh';
import { createContourModeRenderer } from './contour';
import { createFieldLinesModeRenderer } from './fieldLines';

/**
 * Creates a registry of all available visualization mode renderers.
 */
export function createModeRegistry(): ModeRegistry {
  return {
    mesh: createMeshModeRenderer(),
    contour: createContourModeRenderer(),
    fieldLines: createFieldLinesModeRenderer(),
  };
}

/**
 * Gets a renderer for the specified mode.
 * @param mode - The visualization mode
 * @returns The corresponding renderer
 */
export function getModeRenderer(mode: VisualizationMode): VisualizationModeRenderer {
  const registry = createModeRegistry();
  return registry[mode];
}
