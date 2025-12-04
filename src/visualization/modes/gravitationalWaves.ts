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
import type { VisualizationModeRenderer, ModeRenderResult } from './types';
import { createEmptyResources } from './types';

/**
 * Maximum allowed wave frequency to prevent aliasing and GPU instability.
 * Higher frequencies can cause visual artifacts on lower resolution grids.
 */
export const MAX_WAVE_FREQUENCY = 10.0;

/**
 * Minimum allowed wave frequency.
 */
export const MIN_WAVE_FREQUENCY = 0.1;

/**
 * Default wave frequency in Hz.
 */
export const DEFAULT_WAVE_FREQUENCY = 1.0;

/**
 * Maximum allowed wave amplitude.
 */
export const MAX_WAVE_AMPLITUDE = 2.0;

/**
 * Minimum allowed wave amplitude.
 */
export const MIN_WAVE_AMPLITUDE = 0.1;

/**
 * Default wave amplitude.
 */
export const DEFAULT_WAVE_AMPLITUDE = 1.0;

/**
 * Number of concentric wave rings.
 */
const NUM_WAVE_RINGS = 24;

/**
 * Segments per wave ring.
 */
const SEGMENTS_PER_RING = 64;

/**
 * Wave parameters for the gravitational wave visualization.
 */
export interface WaveParameters {
  /** Wave amplitude multiplier (0.1 - 2.0) */
  amplitude: number;
  /** Wave frequency in Hz (0.1 - 10.0) */
  frequency: number;
  /** Whether the wave animation is enabled */
  enabled: boolean;
}

/**
 * Default wave parameters.
 */
export const DEFAULT_WAVE_PARAMETERS: WaveParameters = {
  amplitude: DEFAULT_WAVE_AMPLITUDE,
  frequency: DEFAULT_WAVE_FREQUENCY,
  enabled: true,
};

/**
 * Clamps wave frequency to safe bounds to prevent aliasing or GPU instability.
 * Also handles NaN/undefined values by returning the default.
 * @param frequency - Requested frequency
 * @returns Clamped frequency value
 */
export function clampWaveFrequency(frequency: number): number {
  if (!Number.isFinite(frequency)) {
    return DEFAULT_WAVE_FREQUENCY;
  }
  return Math.min(Math.max(MIN_WAVE_FREQUENCY, frequency), MAX_WAVE_FREQUENCY);
}

/**
 * Clamps wave amplitude to safe bounds.
 * Also handles NaN/undefined values by returning the default.
 * @param amplitude - Requested amplitude
 * @returns Clamped amplitude value
 */
export function clampWaveAmplitude(amplitude: number): number {
  if (!Number.isFinite(amplitude)) {
    return DEFAULT_WAVE_AMPLITUDE;
  }
  return Math.min(Math.max(MIN_WAVE_AMPLITUDE, amplitude), MAX_WAVE_AMPLITUDE);
}

/**
 * Vertex shader for gravitational wave ripples.
 * Displaces vertices based on time and distance from center.
 */
const waveVertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uMaxDeviation;
  
  varying float vIntensity;
  varying float vDistance;
  
  void main() {
    vDistance = length(position.xy);
    
    // Create propagating wave effect
    float wave = sin(vDistance * uFrequency * 2.0 - uTime * 3.0) * uAmplitude;
    
    // Attenuate wave based on distance (waves weaken as they propagate)
    float attenuation = 1.0 / (1.0 + vDistance * 0.2);
    wave *= attenuation;
    
    // Also factor in the base curvature deviation
    float baseHeight = position.z;
    
    // Combine base curvature with wave displacement
    vec3 newPosition = position;
    newPosition.z = baseHeight + wave * uMaxDeviation * 0.5;
    
    // Pass intensity for color modulation
    vIntensity = 0.5 + wave * 0.5;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

/**
 * Fragment shader for gravitational wave ripples.
 * Colors based on wave intensity.
 */
const waveFragmentShader = `
  uniform float uTime;
  
  varying float vIntensity;
  varying float vDistance;
  
  void main() {
    // Create color gradient from deep blue to bright cyan based on wave intensity
    vec3 baseColor = vec3(0.1, 0.2, 0.4); // Deep blue
    vec3 waveColor = vec3(0.3, 0.7, 1.0); // Bright cyan
    
    // Add pulsing effect
    float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
    
    vec3 color = mix(baseColor, waveColor, vIntensity * pulse);
    
    // Add distance-based fade
    float alpha = 1.0 / (1.0 + vDistance * 0.1);
    alpha = clamp(alpha, 0.3, 1.0);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Gravitational wave visualization mode.
 * Renders animated propagating ripples representing gravitational waves.
 */
export class GravitationalWavesModeRenderer implements VisualizationModeRenderer {
  readonly id = 'gravitationalWaves' as const;

  /** Current wave parameters */
  private waveParams: WaveParameters = { ...DEFAULT_WAVE_PARAMETERS };

  /** Reference to the shader material for uniform updates */
  private shaderMaterial: THREE.ShaderMaterial | null = null;

  /**
   * Sets wave parameters for the visualization.
   * @param params - Partial wave parameters to update
   */
  setWaveParameters(params: Partial<WaveParameters>): void {
    if (params.amplitude !== undefined) {
      this.waveParams.amplitude = clampWaveAmplitude(params.amplitude);
    }
    if (params.frequency !== undefined) {
      this.waveParams.frequency = clampWaveFrequency(params.frequency);
    }
    if (params.enabled !== undefined) {
      this.waveParams.enabled = params.enabled;
    }

    // Update shader uniforms if material exists
    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.uAmplitude.value = this.waveParams.amplitude;
      this.shaderMaterial.uniforms.uFrequency.value = this.waveParams.frequency;
    }
  }

  /**
   * Gets current wave parameters.
   */
  getWaveParameters(): WaveParameters {
    return { ...this.waveParams };
  }

  /**
   * Updates the animation time for the wave shader.
   * @param time - Current animation time in seconds
   */
  updateTime(time: number): void {
    if (this.shaderMaterial && this.waveParams.enabled) {
      this.shaderMaterial.uniforms.uTime.value = time;
    }
  }

  render(result: CurvatureGridResult): ModeRenderResult {
    const resources = createEmptyResources();
    const group = new THREE.Group();
    group.name = 'gravitational-waves';

    const { samples, resolution, maxDeviation } = result;

    // Get the middle Z slice
    const sliceZ = Math.floor(resolution / 2);
    const sliceStart = sliceZ * resolution * resolution;

    // Validate we have enough samples to avoid out-of-bounds access
    if (samples.length < sliceStart + resolution * resolution) {
      // Not enough data to render, return empty object
      return { object: group, resources };
    }

    // Get bounds from samples
    const firstSample = samples[sliceStart];
    const lastSample = samples[sliceStart + resolution * resolution - 1];
    const minX = firstSample.position[0];
    const maxX = lastSample.position[0];
    const minY = firstSample.position[1];
    const maxY = lastSample.position[1];
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    // Create wave mesh geometry
    const geometry = this.createWaveGeometry(
      samples,
      resolution,
      sliceStart,
      maxDeviation
    );
    resources.geometries.push(geometry);

    // Create shader material with wave uniforms
    this.shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: waveVertexShader,
      fragmentShader: waveFragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uAmplitude: { value: this.waveParams.amplitude },
        uFrequency: { value: this.waveParams.frequency },
        uMaxDeviation: { value: maxDeviation > 1e-10 ? maxDeviation : 1.0 },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });
    resources.materials.push(this.shaderMaterial);

    const waveMesh = new THREE.Mesh(geometry, this.shaderMaterial);
    waveMesh.name = 'wave-mesh';
    group.add(waveMesh);

    // Add concentric wave rings for additional visual effect
    const ringGroup = this.createWaveRings(rangeX, rangeY, resources);
    ringGroup.position.z = 0.01; // Slightly above base mesh
    group.add(ringGroup);

    // Add reference plane
    const planeGeometry = new THREE.PlaneGeometry(rangeX, rangeY);
    resources.geometries.push(planeGeometry);

    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0a1e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    resources.materials.push(planeMaterial);

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set((maxX + minX) / 2, (maxY + minY) / 2, -0.5);
    group.add(plane);

    return { object: group, resources };
  }

  update(result: CurvatureGridResult, existingObject: THREE.Object3D): boolean {
    // Find the wave mesh in the group
    const waveMesh = existingObject.getObjectByName('wave-mesh') as THREE.Mesh;
    if (!waveMesh || !waveMesh.geometry) {
      return false;
    }

    // Check if resolution changed
    const positionAttr = waveMesh.geometry.getAttribute('position');
    const expectedVertices = result.resolution * result.resolution;
    if (positionAttr.count !== expectedVertices) {
      return false; // Need full re-render
    }

    // Update geometry with new curvature data
    const { samples, resolution, maxDeviation } = result;
    const sliceZ = Math.floor(resolution / 2);
    const sliceStart = sliceZ * resolution * resolution;

    // Validate we have enough samples to avoid out-of-bounds access
    if (samples.length < sliceStart + resolution * resolution) {
      return false; // Not enough data, need full re-render
    }

    const positions = positionAttr.array as Float32Array;
    const normFactor = maxDeviation > 1e-10 ? 1 / maxDeviation : 1;

    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const sampleIdx = sliceStart + iy * resolution + ix;
        const vertexIdx = iy * resolution + ix;
        const sample = samples[sampleIdx];

        // Update Z position based on curvature
        positions[vertexIdx * 3 + 2] = sample.metricDeviation * normFactor;
      }
    }

    positionAttr.needsUpdate = true;
    waveMesh.geometry.computeVertexNormals();

    // Update maxDeviation uniform
    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.uMaxDeviation.value =
        maxDeviation > 1e-10 ? maxDeviation : 1.0;
    }

    return true;
  }

  /**
   * Creates the wave mesh geometry from curvature data.
   */
  private createWaveGeometry(
    samples: CurvatureGridResult['samples'],
    resolution: number,
    sliceStart: number,
    maxDeviation: number
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const numVertices = resolution * resolution;
    const positions = new Float32Array(numVertices * 3);
    const normFactor = maxDeviation > 1e-10 ? 1 / maxDeviation : 1;

    // Fill vertex positions
    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const sampleIdx = sliceStart + iy * resolution + ix;
        const vertexIdx = iy * resolution + ix;
        const sample = samples[sampleIdx];

        positions[vertexIdx * 3] = sample.position[0];
        positions[vertexIdx * 3 + 1] = sample.position[1];
        positions[vertexIdx * 3 + 2] = sample.metricDeviation * normFactor;
      }
    }

    // Create indices for triangles
    const numCells = (resolution - 1) * (resolution - 1);
    const indices = new Uint32Array(numCells * 6);
    let indexPtr = 0;

    for (let iy = 0; iy < resolution - 1; iy++) {
      for (let ix = 0; ix < resolution - 1; ix++) {
        const topLeft = iy * resolution + ix;
        const topRight = topLeft + 1;
        const bottomLeft = (iy + 1) * resolution + ix;
        const bottomRight = bottomLeft + 1;

        indices[indexPtr++] = topLeft;
        indices[indexPtr++] = bottomLeft;
        indices[indexPtr++] = topRight;

        indices[indexPtr++] = topRight;
        indices[indexPtr++] = bottomLeft;
        indices[indexPtr++] = bottomRight;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Creates concentric wave rings for visual effect.
   */
  private createWaveRings(
    rangeX: number,
    rangeY: number,
    resources: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }
  ): THREE.Group {
    const ringGroup = new THREE.Group();
    ringGroup.name = 'wave-rings';

    const maxRadius = Math.min(rangeX, rangeY) * 0.45;

    for (let i = 0; i < NUM_WAVE_RINGS; i++) {
      const radius = (i / NUM_WAVE_RINGS) * maxRadius;
      if (radius < 0.1) continue;

      const ringGeometry = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];

      for (let j = 0; j <= SEGMENTS_PER_RING; j++) {
        const angle = (j / SEGMENTS_PER_RING) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
        );
      }

      ringGeometry.setFromPoints(points);
      resources.geometries.push(ringGeometry);

      // Fade rings towards the edge
      const opacity = 1.0 - i / NUM_WAVE_RINGS;
      const ringMaterial = new THREE.LineBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: opacity * 0.3,
      });
      resources.materials.push(ringMaterial);

      const ring = new THREE.Line(ringGeometry, ringMaterial);
      ringGroup.add(ring);
    }

    return ringGroup;
  }
}

/**
 * Creates a new gravitational waves mode renderer instance.
 */
export function createGravitationalWavesModeRenderer(): GravitationalWavesModeRenderer {
  return new GravitationalWavesModeRenderer();
}
