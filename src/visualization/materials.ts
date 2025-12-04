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

/**
 * Color stops for curvature visualization gradient.
 * Maps normalized deviation values to colors (blue = flat, red = curved).
 */
export const CURVATURE_GRADIENT: Array<{ stop: number; color: THREE.Color }> = [
  { stop: 0.0, color: new THREE.Color(0x1a1a2e) }, // Deep blue - flat spacetime
  { stop: 0.2, color: new THREE.Color(0x0f3460) }, // Navy blue
  { stop: 0.4, color: new THREE.Color(0x4ecdc4) }, // Cyan
  { stop: 0.6, color: new THREE.Color(0xffe66d) }, // Yellow
  { stop: 0.8, color: new THREE.Color(0xe94560) }, // Red - high curvature
  { stop: 1.0, color: new THREE.Color(0xff0000) }, // Bright red - extreme curvature
];

/**
 * Interpolates between color stops to get a color for a normalized value.
 * @param normalizedValue - Value between 0 and 1
 * @returns Interpolated THREE.Color
 */
export function getColorForCurvature(normalizedValue: number): THREE.Color {
  // Clamp to [0, 1]
  const t = Math.max(0, Math.min(1, normalizedValue));

  // Find surrounding color stops
  let lowerStop = CURVATURE_GRADIENT[0];
  let upperStop = CURVATURE_GRADIENT[CURVATURE_GRADIENT.length - 1];

  for (let i = 0; i < CURVATURE_GRADIENT.length - 1; i++) {
    if (
      t >= CURVATURE_GRADIENT[i].stop &&
      t <= CURVATURE_GRADIENT[i + 1].stop
    ) {
      lowerStop = CURVATURE_GRADIENT[i];
      upperStop = CURVATURE_GRADIENT[i + 1];
      break;
    }
  }

  // Interpolate between stops
  const range = upperStop.stop - lowerStop.stop;
  const localT = range === 0 ? 0 : (t - lowerStop.stop) / range;

  const result = new THREE.Color();
  result.lerpColors(lowerStop.color, upperStop.color, localT);
  return result;
}

/**
 * Creates a MeshStandardMaterial for the curvature mesh.
 * Uses vertex colors for curvature visualization.
 */
export function createCurvatureMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    flatShading: false,
    metalness: 0.1,
    roughness: 0.7,
  });
}

/**
 * Creates a wireframe material for grid overlay.
 */
export function createWireframeMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: 0x4a4a6a,
    transparent: true,
    opacity: 0.3,
  });
}

/**
 * Creates a material for mass source spheres.
 * @param color - Optional CSS color string
 */
export function createMassSphereMaterial(
  color?: string
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: color ?? '#ffcc00',
    emissive: color ?? '#ffcc00',
    emissiveIntensity: 0.3,
    metalness: 0.5,
    roughness: 0.3,
  });
}
