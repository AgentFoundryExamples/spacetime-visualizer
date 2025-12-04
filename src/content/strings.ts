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

/**
 * User-facing strings for the application.
 * Centralized for future localization support.
 */

/**
 * Visualization mode identifiers.
 */
export type VisualizationMode = 'mesh' | 'contour' | 'fieldLines' | 'gravitationalWaves';

/**
 * Mode display information.
 */
export interface ModeStrings {
  name: string;
  description: string;
  educationalText: string;
}

/**
 * Scenario display information.
 */
export interface ScenarioStrings {
  name: string;
  description: string;
  educationalText: string;
}

/**
 * Strings for visualization modes.
 */
export const MODE_STRINGS: Record<VisualizationMode, ModeStrings> = {
  mesh: {
    name: 'Heightfield Mesh',
    description: 'A 3D surface showing curvature depth as height displacement.',
    educationalText: `## Heightfield Mesh Mode

The heightfield mesh visualizes spacetime curvature by displacing a 2D grid in the vertical direction.

**Key concepts:**
- **Depth represents curvature**: Deeper wells indicate stronger gravitational fields
- **Color gradient**: Blue represents flat spacetime, red indicates high curvature
- **Surface normals**: The mesh lighting shows the gradient of the gravitational potential

This visualization is inspired by the classic "rubber sheet" analogy for general relativity, where massive objects create depressions in spacetime.

[Learn more about spacetime curvature](#physics-engine)`,
  },
  contour: {
    name: 'Contour Grid',
    description: 'Equipotential lines showing gravitational field strength.',
    educationalText: `## Contour Grid Mode

The contour grid displays equipotential lines of the gravitational field.

**Key concepts:**
- **Contour lines**: Each line represents a constant gravitational potential
- **Closer lines = stronger gradient**: Tightly packed contours indicate rapid change in field strength
- **Circular patterns**: Spherically symmetric masses produce circular contour patterns

This visualization helps understand how gravitational potential varies across space, similar to topographic maps showing elevation.

[Learn more about gravitational potential](#physics-engine)`,
  },
  fieldLines: {
    name: 'Field Lines',
    description: 'Animated particles showing gravitational field direction.',
    educationalText: `## Field Lines Mode

Field lines show the direction and strength of the gravitational field using animated particles.

**Key concepts:**
- **Particle flow**: Particles move along field lines toward mass sources
- **Convergence**: Lines converge at mass locations indicating attractive force
- **Density = field strength**: More closely spaced particles indicate stronger fields

This visualization demonstrates how test particles would naturally fall in the gravitational field.

[Learn more about tidal forces](#physics-engine)`,
  },
  gravitationalWaves: {
    name: 'Gravitational Waves',
    description: 'Animated ripples showing gravitational wave propagation.',
    educationalText: `## Gravitational Waves Mode

This mode visualizes gravitational waves as propagating ripples through spacetime.

**Key concepts:**
- **Ripple propagation**: Waves emanate from regions of changing curvature
- **Amplitude**: Controls the strength of the wave distortions
- **Frequency**: Controls how rapidly the waves oscillate
- **Attenuation**: Waves weaken as they propagate outward

Gravitational waves are produced by accelerating masses, most dramatically by inspiraling compact objects like binary black holes.

**Performance note:** High frequency values may cause visual artifacts on lower-end GPUs. Reduce frequency if you experience issues.

[Learn more about gravitational waves](#physics-engine)`,
  },
};

/**
 * Strings for scenario presets.
 */
export const SCENARIO_STRINGS: Record<string, ScenarioStrings> = {
  'single-mass': {
    name: 'Single Mass',
    description:
      'A single massive object at the center, demonstrating spherical symmetry.',
    educationalText: `## Single Mass Scenario

A single point mass creates a spherically symmetric gravitational field.

**Physics highlights:**
- The curvature follows the Schwarzschild metric (weak-field approximation)
- Gravitational potential: Φ = -GM/r
- Curvature decreases with distance squared

This is the simplest case for understanding gravitational wells.`,
  },
  'binary-orbit': {
    name: 'Binary Orbit',
    description:
      'Two masses in orbital configuration, showing gravitational interaction.',
    educationalText: `## Binary Orbit Scenario

Two masses demonstrate gravitational interaction and potential superposition.

**Physics highlights:**
- Gravitational potentials add linearly (superposition principle)
- A saddle point exists between the masses (Lagrange L1 point)
- The combined field shows complex equipotential surfaces

Binary systems are common in astrophysics, from binary stars to exoplanet systems.`,
  },
  'gravitational-wave': {
    name: 'Gravitational Wave',
    description: 'Animated ripple pattern simulating gravitational wave effects.',
    educationalText: `## Gravitational Wave Scenario

This toy model visualizes the rippling effect of gravitational waves.

**Physics highlights:**
- Gravitational waves are oscillating distortions in spacetime
- They propagate at the speed of light
- This simplified visualization shows the quadrupole pattern

Note: This is an educational approximation, not a full GR simulation.`,
  },
  'triple-system': {
    name: 'Triple System',
    description:
      'Three-body configuration demonstrating complex gravitational superposition.',
    educationalText: `## Triple System Scenario

Three masses create a complex gravitational potential landscape.

**Physics highlights:**
- The three-body problem has no general closed-form solution
- Multiple saddle points and potential wells
- Demonstrates chaotic dynamics (in full simulations)

This scenario showcases the complexity of multi-body gravitational systems.`,
  },
  cluster: {
    name: 'Mass Cluster',
    description: 'A cluster of multiple masses showing aggregate curvature effects.',
    educationalText: `## Mass Cluster Scenario

Multiple masses clustered together approximate extended mass distributions.

**Physics highlights:**
- Far from the cluster, it appears as a single point mass
- Internal structure creates complex potential
- Demonstrates the shell theorem principles

Galaxy clusters exhibit similar aggregate gravitational behavior.`,
  },
  'gravitational-lensing': {
    name: 'Gravitational Lensing',
    description:
      'A massive central object demonstrating deep curvature for light deflection.',
    educationalText: `## Gravitational Lensing Scenario

A very massive object creates extreme spacetime curvature.

**Physics highlights:**
- Light bends as it passes through curved spacetime
- The deflection angle depends on the impact parameter
- This effect is used to detect dark matter and distant galaxies

Einstein's prediction of light bending was confirmed during the 1919 solar eclipse.`,
  },
  'extreme-mass-ratio': {
    name: 'Extreme Mass Ratio',
    description:
      'A binary with vastly different masses, simulating star-planet or EMRI systems.',
    educationalText: `## Extreme Mass Ratio Scenario

A massive primary with a much smaller orbiting companion (~100:1 mass ratio).

**Physics highlights:**
- The smaller body barely affects the primary's position
- EMRIs (Extreme Mass Ratio Inspirals) are key LISA gravitational wave sources
- Demonstrates how planets orbit stars with minimal stellar motion

This configuration is common in planetary systems and galactic nuclei.`,
  },
  'hierarchical-triple': {
    name: 'Hierarchical Triple',
    description:
      'A close binary orbiting a more massive third body, demonstrating multi-scale dynamics.',
    educationalText: `## Hierarchical Triple Scenario

A stable configuration with two orbital timescales.

**Physics highlights:**
- Inner binary completes many orbits per outer orbit
- Kozai-Lidov oscillations can exchange eccentricity and inclination
- Common in stellar systems like Alpha Centauri

Hierarchical systems are more stable than arbitrary three-body configurations.`,
  },
  'black-hole-inspiral': {
    name: 'Black Hole Inspiral',
    description:
      'Two equal masses in close orbit, simulating pre-merger gravitational wave sources.',
    educationalText: `## Black Hole Inspiral Scenario

Two compact objects in tight orbit, slowly spiraling inward.

**Physics highlights:**
- Energy is radiated away as gravitational waves
- Orbital decay follows Peters-Mathews formalism
- LIGO detected such inspirals starting in 2015

The final merger produces the most powerful events in the universe.`,
  },
};

/**
 * UI labels and messages.
 */
export const UI_STRINGS = {
  // Section titles
  sectionModes: 'Visualization Mode',
  sectionScenarios: 'Scenarios',
  sectionParameters: 'Parameters',
  sectionCamera: 'Camera',
  sectionPlayback: 'Playback',
  sectionEducation: 'Learn',
  sectionOrbits: 'Orbital Motion',
  sectionWaves: 'Wave Settings',

  // Mode selector
  modeSelectLabel: 'Select visualization mode',

  // Scenario library
  scenarioSelectLabel: 'Select scenario',
  scenarioSaveCustom: 'Save Current',
  scenarioLoadCustom: 'Load Custom',
  scenarioDeleteCustom: 'Delete',
  scenarioCustomLabel: 'Custom Presets',
  scenarioBuiltInLabel: 'Built-in Presets',
  scenarioSavePrompt: 'Enter a name for this preset:',
  scenarioSaveSuccess: 'Preset saved successfully',
  scenarioSaveError: 'Failed to save preset',
  scenarioLoadError: 'Failed to load preset',
  scenarioDeleteConfirm: 'Are you sure you want to delete this preset?',
  scenarioStorageUnavailable:
    'Local storage unavailable. Custom presets will not be saved.',
  scenarioOverwriteWarning:
    'You have unsaved changes. Loading a preset will discard them.',

  // Parameters
  paramGridResolution: 'Grid Resolution',
  paramMassScale: 'Mass Scale',

  // Orbital motion controls
  orbitEnable: 'Enable Orbits',
  orbitResetTime: 'Reset Time',
  orbitTimeLabel: 'Time',
  orbitHint:
    'Enable orbital motion to animate masses along their orbital paths.',

  // Wave controls
  waveEnable: 'Enable Waves',
  waveAmplitude: 'Wave Amplitude',
  waveFrequency: 'Wave Frequency',
  waveHint:
    'Wave controls are only available in Gravitational Waves mode.',

  // Camera controls
  cameraAutoRotate: 'Auto-Rotate',
  cameraReset: 'Reset Camera',

  // Playback controls
  playbackPlay: '▶ Play',
  playbackPause: '⏸ Pause',
  playbackRefresh: '🔄 Refresh',
  playbackReset: '↺ Reset All',

  // Status messages
  statusComputing: 'Computing curvature...',
  statusReady: 'Ready',

  // Education panel
  educationTitle: 'About This View',
  educationCollapse: 'Collapse',
  educationExpand: 'Expand',
  educationReadMore: 'Read more in documentation',

  // Warnings and errors
  warningHighResolution:
    'High resolution may cause performance issues. Consider using 64 or lower.',
  warningWebGLUnsupported:
    'WebGL2 is not supported in your browser. The visualization may not work correctly.',
  errorComputationFailed: 'Failed to compute curvature',

  // Export controls
  sectionExport: 'Export',
  exportScreenshot: '📷 Screenshot (PNG)',
  exportVideo: '🎬 Record Video',
  exportDuration: 'Duration',
  exportDurationUnit: 's',
  exportProgress: 'Exporting...',
  exportSuccess: 'Export complete!',
  exportError: 'Export failed',
  exportVideoUnsupported:
    'Video recording is not supported in this browser. Try Chrome or Firefox.',
  exportRecording: 'Recording...',
  exportProcessing: 'Processing...',

  // Accessibility
  skipToMain: 'Skip to main content',
  accessibilityLiveRegion: 'Status announcements',
} as const;

/**
 * Type for UI string keys.
 */
export type UIStringKey = keyof typeof UI_STRINGS;

/**
 * Gets a UI string by key.
 * @param key - The string key
 * @returns The string value
 */
export function getUIString(key: UIStringKey): string {
  return UI_STRINGS[key];
}

/**
 * Gets mode strings by mode identifier.
 * @param mode - The visualization mode
 * @returns Mode strings or undefined if not found
 */
export function getModeStrings(mode: VisualizationMode): ModeStrings {
  return MODE_STRINGS[mode];
}

/**
 * Gets scenario strings by scenario identifier.
 * @param scenarioId - The scenario ID
 * @returns Scenario strings or undefined if not found
 */
export function getScenarioStrings(scenarioId: string): ScenarioStrings | undefined {
  return SCENARIO_STRINGS[scenarioId];
}
