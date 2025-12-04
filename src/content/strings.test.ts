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
import {
  MODE_STRINGS,
  SCENARIO_STRINGS,
  UI_STRINGS,
  getModeStrings,
  getScenarioStrings,
  getUIString,
} from './strings';
import type { VisualizationMode } from './strings';

describe('content/strings', () => {
  describe('MODE_STRINGS', () => {
    it('should have strings for all visualization modes', () => {
      const modes: VisualizationMode[] = ['mesh', 'contour', 'fieldLines'];

      modes.forEach((mode) => {
        const strings = MODE_STRINGS[mode];
        expect(strings).toBeDefined();
        expect(strings.name).toBeTruthy();
        expect(strings.description).toBeTruthy();
        expect(strings.educationalText).toBeTruthy();
      });
    });

    it('should have name, description, and educationalText for mesh mode', () => {
      const mesh = MODE_STRINGS.mesh;
      expect(mesh.name).toBe('Heightfield Mesh');
      expect(mesh.description).toContain('3D surface');
      expect(mesh.educationalText).toContain('heightfield');
    });

    it('should have name, description, and educationalText for contour mode', () => {
      const contour = MODE_STRINGS.contour;
      expect(contour.name).toBe('Contour Grid');
      expect(contour.description).toContain('Equipotential');
      expect(contour.educationalText).toContain('contour');
    });

    it('should have name, description, and educationalText for fieldLines mode', () => {
      const fieldLines = MODE_STRINGS.fieldLines;
      expect(fieldLines.name).toBe('Field Lines');
      expect(fieldLines.description).toContain('particles');
      expect(fieldLines.educationalText).toContain('Field Lines');
    });
  });

  describe('SCENARIO_STRINGS', () => {
    it('should have strings for all built-in scenarios', () => {
      const scenarios = [
        'single-mass',
        'binary-orbit',
        'gravitational-wave',
        'triple-system',
        'cluster',
        'gravitational-lensing',
        'extreme-mass-ratio',
        'hierarchical-triple',
        'black-hole-inspiral',
      ];

      scenarios.forEach((scenario) => {
        const strings = SCENARIO_STRINGS[scenario];
        expect(strings).toBeDefined();
        expect(strings.name).toBeTruthy();
        expect(strings.description).toBeTruthy();
        expect(strings.educationalText).toBeTruthy();
      });
    });

    it('should have appropriate content for single-mass scenario', () => {
      const singleMass = SCENARIO_STRINGS['single-mass'];
      expect(singleMass.name).toBe('Single Mass');
      expect(singleMass.description).toContain('spherical');
      expect(singleMass.educationalText).toContain('Schwarzschild');
    });

    it('should have appropriate content for gravitational-wave scenario', () => {
      const gravWave = SCENARIO_STRINGS['gravitational-wave'];
      expect(gravWave.name).toBe('Gravitational Wave');
      expect(gravWave.description).toContain('ripple');
      expect(gravWave.educationalText).toContain('gravitational waves');
    });

    it('should have appropriate content for gravitational-lensing scenario', () => {
      const lensing = SCENARIO_STRINGS['gravitational-lensing'];
      expect(lensing.name).toBe('Gravitational Lensing');
      expect(lensing.description).toContain('curvature');
      expect(lensing.educationalText).toContain('Light bends');
    });

    it('should have appropriate content for extreme-mass-ratio scenario', () => {
      const emri = SCENARIO_STRINGS['extreme-mass-ratio'];
      expect(emri.name).toBe('Extreme Mass Ratio');
      expect(emri.description).toContain('star-planet');
      expect(emri.educationalText).toContain('EMRI');
    });

    it('should have appropriate content for hierarchical-triple scenario', () => {
      const triple = SCENARIO_STRINGS['hierarchical-triple'];
      expect(triple.name).toBe('Hierarchical Triple');
      expect(triple.description).toContain('close binary');
      expect(triple.educationalText).toContain('Kozai-Lidov');
    });

    it('should have appropriate content for black-hole-inspiral scenario', () => {
      const inspiral = SCENARIO_STRINGS['black-hole-inspiral'];
      expect(inspiral.name).toBe('Black Hole Inspiral');
      expect(inspiral.description).toContain('close orbit');
      expect(inspiral.educationalText).toContain('LIGO');
    });
  });

  describe('UI_STRINGS', () => {
    it('should have all required section titles', () => {
      expect(UI_STRINGS.sectionModes).toBeTruthy();
      expect(UI_STRINGS.sectionScenarios).toBeTruthy();
      expect(UI_STRINGS.sectionParameters).toBeTruthy();
      expect(UI_STRINGS.sectionCamera).toBeTruthy();
      expect(UI_STRINGS.sectionPlayback).toBeTruthy();
      expect(UI_STRINGS.sectionEducation).toBeTruthy();
    });

    it('should have all required control labels', () => {
      expect(UI_STRINGS.paramGridResolution).toBeTruthy();
      expect(UI_STRINGS.paramMassScale).toBeTruthy();
      expect(UI_STRINGS.cameraAutoRotate).toBeTruthy();
      expect(UI_STRINGS.cameraReset).toBeTruthy();
    });

    it('should have all required playback labels', () => {
      expect(UI_STRINGS.playbackPlay).toBeTruthy();
      expect(UI_STRINGS.playbackPause).toBeTruthy();
      expect(UI_STRINGS.playbackRefresh).toBeTruthy();
      expect(UI_STRINGS.playbackReset).toBeTruthy();
    });

    it('should have scenario library labels', () => {
      expect(UI_STRINGS.scenarioBuiltInLabel).toBeTruthy();
      expect(UI_STRINGS.scenarioCustomLabel).toBeTruthy();
      expect(UI_STRINGS.scenarioSaveCustom).toBeTruthy();
      expect(UI_STRINGS.scenarioDeleteCustom).toBeTruthy();
      expect(UI_STRINGS.scenarioStorageUnavailable).toBeTruthy();
      expect(UI_STRINGS.scenarioOverwriteWarning).toBeTruthy();
    });

    it('should have education panel labels', () => {
      expect(UI_STRINGS.educationTitle).toBeTruthy();
      expect(UI_STRINGS.educationCollapse).toBeTruthy();
      expect(UI_STRINGS.educationExpand).toBeTruthy();
      expect(UI_STRINGS.educationReadMore).toBeTruthy();
    });
  });

  describe('getModeStrings', () => {
    it('should return correct strings for mesh mode', () => {
      const strings = getModeStrings('mesh');
      expect(strings).toBe(MODE_STRINGS.mesh);
    });

    it('should return correct strings for contour mode', () => {
      const strings = getModeStrings('contour');
      expect(strings).toBe(MODE_STRINGS.contour);
    });

    it('should return correct strings for fieldLines mode', () => {
      const strings = getModeStrings('fieldLines');
      expect(strings).toBe(MODE_STRINGS.fieldLines);
    });
  });

  describe('getScenarioStrings', () => {
    it('should return strings for valid scenario', () => {
      const strings = getScenarioStrings('single-mass');
      expect(strings).toBe(SCENARIO_STRINGS['single-mass']);
    });

    it('should return undefined for unknown scenario', () => {
      const strings = getScenarioStrings('unknown-scenario');
      expect(strings).toBeUndefined();
    });
  });

  describe('getUIString', () => {
    it('should return correct string for valid key', () => {
      expect(getUIString('statusComputing')).toBe(UI_STRINGS.statusComputing);
      expect(getUIString('cameraReset')).toBe(UI_STRINGS.cameraReset);
    });
  });
});
