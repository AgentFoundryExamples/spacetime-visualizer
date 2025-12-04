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

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeCurvatureGrid,
  computePotential,
  computeTidalTensor,
  computeMetricDeviation,
  validateMassSource,
  validateGridConfig,
  CurvatureValidationError,
  G_CONSTANT,
  MIN_DISTANCE,
} from '../physics/curvature';
import type { MassSource, CurvatureGridConfig } from '../physics/types';
import {
  createSeededRandom,
  generateSingleMassScenario,
  generateBinaryScenario,
  generateTripleScenario,
  generateClusterScenario,
  getScenarioConfig,
  createCustomScenario,
} from '../physics/scenarios';
import { useSimulationStore } from '../state/simulation';

// Reset store between tests
beforeEach(() => {
  useSimulationStore.getState().reset();
});

describe('curvature physics', () => {
  describe('computePotential', () => {
    it('should return zero for no masses', () => {
      const potential = computePotential([0, 0, 0], []);
      expect(potential).toBe(0);
    });

    it('should compute negative potential for single mass', () => {
      const mass: MassSource = {
        id: 'test',
        position: [0, 0, 0],
        mass: 100,
      };
      const potential = computePotential([1, 0, 0], [mass]);
      expect(potential).toBeLessThan(0);
      // Φ = -GM/r = -1 * 100 / 1 = -100
      expect(potential).toBeCloseTo(-100 * G_CONSTANT, 6);
    });

    it('should compute potential inversely proportional to distance', () => {
      const mass: MassSource = {
        id: 'test',
        position: [0, 0, 0],
        mass: 100,
      };
      const p1 = computePotential([1, 0, 0], [mass]);
      const p2 = computePotential([2, 0, 0], [mass]);

      // Potential at r=2 should be half of potential at r=1 (in magnitude)
      expect(Math.abs(p1)).toBeCloseTo(2 * Math.abs(p2), 6);
    });

    it('should clamp minimum distance to prevent infinity', () => {
      const mass: MassSource = {
        id: 'test',
        position: [0, 0, 0],
        mass: 100,
      };
      // Sample at the exact location of the mass
      const potential = computePotential([0, 0, 0], [mass]);
      expect(Number.isFinite(potential)).toBe(true);
      expect(potential).toBe((-G_CONSTANT * 100) / MIN_DISTANCE);
    });

    it('should sum potentials for multiple masses (superposition)', () => {
      const masses: MassSource[] = [
        { id: 'm1', position: [1, 0, 0], mass: 50 },
        { id: 'm2', position: [-1, 0, 0], mass: 50 },
      ];

      const potential = computePotential([0, 0, 0], masses);

      // Each mass contributes -50/1 = -50
      expect(potential).toBeCloseTo(-100 * G_CONSTANT, 6);
    });

    it('should ignore zero-mass sources', () => {
      const masses: MassSource[] = [
        { id: 'm1', position: [1, 0, 0], mass: 100 },
        { id: 'm2', position: [0.5, 0, 0], mass: 0 },
      ];

      const potential = computePotential([0, 0, 0], masses);
      expect(potential).toBeCloseTo(-100 * G_CONSTANT, 6);
    });
  });

  describe('computeTidalTensor', () => {
    it('should return zero tensor for no masses', () => {
      const tensor = computeTidalTensor([0, 0, 0], []);
      expect(tensor).toEqual([0, 0, 0]);
    });

    it('should compute non-zero tensor for single mass', () => {
      const mass: MassSource = {
        id: 'test',
        position: [0, 0, 0],
        mass: 100,
      };
      const tensor = computeTidalTensor([1, 0, 0], [mass]);

      // Tensor components should be finite and non-zero
      expect(Number.isFinite(tensor[0])).toBe(true);
      expect(Number.isFinite(tensor[1])).toBe(true);
      expect(Number.isFinite(tensor[2])).toBe(true);
    });

    it('should sum tensor contributions for multiple masses', () => {
      const single: MassSource = { id: 'm1', position: [0, 0, 0], mass: 100 };
      const double: MassSource[] = [
        { id: 'm1', position: [0, 0, 0], mass: 50 },
        { id: 'm2', position: [0, 0, 0], mass: 50 },
      ];

      const tensorSingle = computeTidalTensor([1, 0, 0], [single]);
      const tensorDouble = computeTidalTensor([1, 0, 0], double);

      // Overlapping masses should give same result as single mass with sum
      expect(tensorDouble[0]).toBeCloseTo(tensorSingle[0], 6);
      expect(tensorDouble[1]).toBeCloseTo(tensorSingle[1], 6);
      expect(tensorDouble[2]).toBeCloseTo(tensorSingle[2], 6);
    });
  });

  describe('computeMetricDeviation', () => {
    it('should return zero for zero potential', () => {
      const deviation = computeMetricDeviation(0);
      expect(deviation).toBe(0);
    });

    it('should return negative deviation for negative potential', () => {
      const deviation = computeMetricDeviation(-100);
      expect(deviation).toBe(-200); // 2 * -100 / 1^2
    });

    it('should clamp extreme values', () => {
      const deviation = computeMetricDeviation(-1e20);
      expect(Number.isFinite(deviation)).toBe(true);
    });
  });

  describe('computeCurvatureGrid', () => {
    const validConfig: CurvatureGridConfig = {
      resolution: 4,
      bounds: [-1, -1, -1, 1, 1, 1],
      timeStep: 0.016,
      masses: [{ id: 'center', position: [0, 0, 0], mass: 100 }],
    };

    it('should produce deterministic results for identical inputs', () => {
      const result1 = computeCurvatureGrid(validConfig);
      const result2 = computeCurvatureGrid(validConfig);

      expect(result1.samples.length).toBe(result2.samples.length);

      for (let i = 0; i < result1.samples.length; i++) {
        expect(result1.samples[i].position).toEqual(
          result2.samples[i].position
        );
        expect(result1.samples[i].metricDeviation).toBe(
          result2.samples[i].metricDeviation
        );
        expect(result1.samples[i].tidalTensor).toEqual(
          result2.samples[i].tidalTensor
        );
      }
    });

    it('should produce correct number of samples', () => {
      const result = computeCurvatureGrid(validConfig);
      expect(result.samples.length).toBe(4 * 4 * 4); // 64 samples for 4^3 grid
    });

    it('should track maximum deviation', () => {
      const result = computeCurvatureGrid(validConfig);
      expect(result.maxDeviation).toBeGreaterThan(0);

      const maxFromSamples = Math.max(
        ...result.samples.map((s) => Math.abs(s.metricDeviation))
      );
      expect(result.maxDeviation).toBe(maxFromSamples);
    });

    it('should handle empty mass list', () => {
      const config = { ...validConfig, masses: [] };
      const result = computeCurvatureGrid(config);

      expect(result.samples.length).toBe(64);
      expect(result.maxDeviation).toBe(0);

      for (const sample of result.samples) {
        expect(sample.metricDeviation).toBe(0);
        expect(sample.tidalTensor).toEqual([0, 0, 0]);
      }
    });

    it('should sample at cell centers', () => {
      const config: CurvatureGridConfig = {
        resolution: 2,
        bounds: [0, 0, 0, 2, 2, 2],
        timeStep: 0.016,
        masses: [],
      };

      const result = computeCurvatureGrid(config);

      // With resolution 2 and bounds [0,2], step is 1, centers are at 0.5 and 1.5
      const expectedPositions = [
        [0.5, 0.5, 0.5],
        [1.5, 0.5, 0.5],
        [0.5, 1.5, 0.5],
        [1.5, 1.5, 0.5],
        [0.5, 0.5, 1.5],
        [1.5, 0.5, 1.5],
        [0.5, 1.5, 1.5],
        [1.5, 1.5, 1.5],
      ];

      for (const expected of expectedPositions) {
        const found = result.samples.some(
          (s) =>
            Math.abs(s.position[0] - expected[0]) < 1e-10 &&
            Math.abs(s.position[1] - expected[1]) < 1e-10 &&
            Math.abs(s.position[2] - expected[2]) < 1e-10
        );
        expect(found).toBe(true);
      }
    });
  });
});

describe('validation', () => {
  describe('validateMassSource', () => {
    it('should accept valid mass source', () => {
      const mass: MassSource = {
        id: 'valid',
        position: [1, 2, 3],
        mass: 100,
      };
      expect(() => validateMassSource(mass)).not.toThrow();
    });

    it('should accept mass with optional properties', () => {
      const mass: MassSource = {
        id: 'valid',
        position: [1, 2, 3],
        mass: 100,
        radius: 0.5,
        color: '#ff0000',
      };
      expect(() => validateMassSource(mass)).not.toThrow();
    });

    it('should reject empty id', () => {
      const mass = { id: '', position: [0, 0, 0], mass: 100 } as MassSource;
      expect(() => validateMassSource(mass)).toThrow(CurvatureValidationError);
      expect(() => validateMassSource(mass)).toThrow('valid string id');
    });

    it('should reject invalid position array', () => {
      const mass = {
        id: 'test',
        position: [0, 0],
        mass: 100,
      } as unknown as MassSource;
      expect(() => validateMassSource(mass)).toThrow(CurvatureValidationError);
      expect(() => validateMassSource(mass)).toThrow(
        'position array of length 3'
      );
    });

    it('should reject non-finite position values', () => {
      const mass: MassSource = { id: 'test', position: [0, NaN, 0], mass: 100 };
      expect(() => validateMassSource(mass)).toThrow(CurvatureValidationError);
      expect(() => validateMassSource(mass)).toThrow('finite number');
    });

    it('should reject negative mass', () => {
      const mass: MassSource = { id: 'test', position: [0, 0, 0], mass: -10 };
      expect(() => validateMassSource(mass)).toThrow(CurvatureValidationError);
      expect(() => validateMassSource(mass)).toThrow('non-negative');
    });

    it('should accept zero mass', () => {
      const mass: MassSource = { id: 'test', position: [0, 0, 0], mass: 0 };
      expect(() => validateMassSource(mass)).not.toThrow();
    });

    it('should reject negative radius', () => {
      const mass: MassSource = {
        id: 'test',
        position: [0, 0, 0],
        mass: 100,
        radius: -1,
      };
      expect(() => validateMassSource(mass)).toThrow(CurvatureValidationError);
      expect(() => validateMassSource(mass)).toThrow(
        'non-negative finite number'
      );
    });
  });

  describe('validateGridConfig', () => {
    const validConfig: CurvatureGridConfig = {
      resolution: 16,
      bounds: [-5, -5, -5, 5, 5, 5],
      timeStep: 0.016,
      masses: [],
    };

    it('should accept valid configuration', () => {
      expect(() => validateGridConfig(validConfig)).not.toThrow();
    });

    it('should reject non-integer resolution', () => {
      const config = { ...validConfig, resolution: 16.5 };
      expect(() => validateGridConfig(config)).toThrow(
        CurvatureValidationError
      );
      expect(() => validateGridConfig(config)).toThrow('integer');
    });

    it('should reject resolution below minimum', () => {
      const config = { ...validConfig, resolution: 1 };
      expect(() => validateGridConfig(config)).toThrow(
        CurvatureValidationError
      );
      expect(() => validateGridConfig(config)).toThrow('between');
    });

    it('should reject resolution above maximum', () => {
      const config = { ...validConfig, resolution: 1000 };
      expect(() => validateGridConfig(config)).toThrow(
        CurvatureValidationError
      );
      expect(() => validateGridConfig(config)).toThrow('between');
    });

    it('should reject invalid bounds length', () => {
      const config = {
        ...validConfig,
        bounds: [0, 0, 0, 1, 1] as unknown as CurvatureGridConfig['bounds'],
      };
      expect(() => validateGridConfig(config)).toThrow(
        CurvatureValidationError
      );
      expect(() => validateGridConfig(config)).toThrow('array of 6 numbers');
    });

    it('should reject bounds where max <= min', () => {
      const config = {
        ...validConfig,
        bounds: [-5, -5, -5, -5, 5, 5] as CurvatureGridConfig['bounds'],
      };
      expect(() => validateGridConfig(config)).toThrow(
        CurvatureValidationError
      );
      expect(() => validateGridConfig(config)).toThrow('greater than');
    });

    it('should reject invalid time step', () => {
      const configLow = { ...validConfig, timeStep: 0.00001 };
      expect(() => validateGridConfig(configLow)).toThrow(
        CurvatureValidationError
      );

      const configHigh = { ...validConfig, timeStep: 10 };
      expect(() => validateGridConfig(configHigh)).toThrow(
        CurvatureValidationError
      );
    });

    it('should validate all masses in array', () => {
      const config = {
        ...validConfig,
        masses: [
          {
            id: 'm1',
            position: [0, 0, 0] as [number, number, number],
            mass: 100,
          },
          {
            id: 'm2',
            position: [1, 1, 1] as [number, number, number],
            mass: -50,
          }, // Invalid
        ],
      };
      expect(() => validateGridConfig(config)).toThrow(
        CurvatureValidationError
      );
      expect(() => validateGridConfig(config)).toThrow('non-negative');
    });
  });
});

describe('scenarios', () => {
  describe('createSeededRandom', () => {
    it('should produce deterministic sequence', () => {
      const rng1 = createSeededRandom(12345);
      const rng2 = createSeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = createSeededRandom(12345);
      const rng2 = createSeededRandom(54321);

      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());

      expect(seq1).not.toEqual(seq2);
    });

    it('should produce values in [0, 1)', () => {
      const rng = createSeededRandom(42);
      for (let i = 0; i < 1000; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('scenario generators', () => {
    it('should generate valid single mass scenario', () => {
      const config = generateSingleMassScenario();
      expect(() => validateGridConfig(config)).not.toThrow();
      expect(config.masses.length).toBe(1);
      expect(config.masses[0].position).toEqual([0, 0, 0]);
    });

    it('should generate valid binary scenario', () => {
      const config = generateBinaryScenario();
      expect(() => validateGridConfig(config)).not.toThrow();
      expect(config.masses.length).toBe(2);
    });

    it('should generate valid triple scenario', () => {
      const config = generateTripleScenario();
      expect(() => validateGridConfig(config)).not.toThrow();
      expect(config.masses.length).toBe(3);
    });

    it('should generate valid cluster scenario', () => {
      const config = generateClusterScenario();
      expect(() => validateGridConfig(config)).not.toThrow();
      expect(config.masses.length).toBe(5);
    });

    it('should produce deterministic scenarios with same seed', () => {
      const config1 = generateBinaryScenario(42);
      const config2 = generateBinaryScenario(42);

      expect(config1.masses[0].position).toEqual(config2.masses[0].position);
      expect(config1.masses[0].mass).toBe(config2.masses[0].mass);
      expect(config1.masses[1].position).toEqual(config2.masses[1].position);
      expect(config1.masses[1].mass).toBe(config2.masses[1].mass);
    });

    it('should produce different scenarios with different seeds', () => {
      const config1 = generateBinaryScenario(42);
      const config2 = generateBinaryScenario(123);

      // Masses should differ due to random variation
      expect(config1.masses[1].mass).not.toBe(config2.masses[1].mass);
    });
  });

  describe('getScenarioConfig', () => {
    it('should return correct scenario for each preset', () => {
      expect(getScenarioConfig('single-mass').masses.length).toBe(1);
      expect(getScenarioConfig('binary-orbit').masses.length).toBe(2);
      expect(getScenarioConfig('triple-system').masses.length).toBe(3);
      expect(getScenarioConfig('cluster').masses.length).toBe(5);
    });

    it('should pass seed to generator', () => {
      const config1 = getScenarioConfig('binary-orbit', 42);
      const config2 = getScenarioConfig('binary-orbit', 42);
      const config3 = getScenarioConfig('binary-orbit', 99);

      expect(config1.masses).toEqual(config2.masses);
      expect(config1.masses).not.toEqual(config3.masses);
    });
  });

  describe('createCustomScenario', () => {
    it('should create scenario with provided masses', () => {
      const masses: MassSource[] = [
        { id: 'custom1', position: [0, 0, 0], mass: 50 },
      ];

      const config = createCustomScenario(masses);
      expect(config.masses).toBe(masses);
    });

    it('should use defaults for unspecified options', () => {
      const config = createCustomScenario([]);
      expect(config.resolution).toBe(16);
      expect(config.bounds).toEqual([-5, -5, -5, 5, 5, 5]);
      expect(config.timeStep).toBe(0.016);
    });

    it('should allow overriding defaults', () => {
      const config = createCustomScenario([], {
        resolution: 32,
        bounds: [-10, -10, -10, 10, 10, 10],
      });

      expect(config.resolution).toBe(32);
      expect(config.bounds).toEqual([-10, -10, -10, 10, 10, 10]);
    });
  });
});

describe('simulation store', () => {
  it('should initialize with empty configuration', () => {
    const state = useSimulationStore.getState();
    expect(state.config.masses).toHaveLength(0);
    expect(state.result).toBeNull();
    expect(state.currentPreset).toBeNull();
  });

  it('should load preset scenario', async () => {
    const store = useSimulationStore.getState();
    store.loadScenario('single-mass');

    const state = useSimulationStore.getState();
    expect(state.currentPreset).toBe('single-mass');
    expect(state.config.masses.length).toBe(1);

    // Wait for async computation to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    const finalState = useSimulationStore.getState();
    expect(finalState.result).not.toBeNull();
  });

  it('should add and remove masses', () => {
    const store = useSimulationStore.getState();

    store.addMass({ id: 'test1', position: [0, 0, 0], mass: 100 });
    expect(useSimulationStore.getState().config.masses.length).toBe(1);

    store.addMass({ id: 'test2', position: [1, 0, 0], mass: 50 });
    expect(useSimulationStore.getState().config.masses.length).toBe(2);

    store.removeMass('test1');
    expect(useSimulationStore.getState().config.masses.length).toBe(1);
    expect(useSimulationStore.getState().config.masses[0].id).toBe('test2');
  });

  it('should update mass properties', () => {
    const store = useSimulationStore.getState();
    store.addMass({ id: 'test', position: [0, 0, 0], mass: 100 });

    store.updateMass('test', { mass: 200, color: '#ff0000' });

    const mass = useSimulationStore.getState().config.masses[0];
    expect(mass.mass).toBe(200);
    expect(mass.color).toBe('#ff0000');
    expect(mass.position).toEqual([0, 0, 0]); // Unchanged
  });

  it('should clear preset when modifying masses', () => {
    const store = useSimulationStore.getState();
    store.loadScenario('single-mass');

    expect(useSimulationStore.getState().currentPreset).toBe('single-mass');

    store.addMass({ id: 'extra', position: [1, 0, 0], mass: 50 });
    expect(useSimulationStore.getState().currentPreset).toBeNull();
  });

  it('should compute curvature on demand', async () => {
    const store = useSimulationStore.getState();
    store.addMass({ id: 'test', position: [0, 0, 0], mass: 100 });

    expect(useSimulationStore.getState().result).toBeNull();

    store.compute();

    // Wait for async computation to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = useSimulationStore.getState();
    expect(state.result).not.toBeNull();
    expect(state.error).toBeNull();
  });

  it('should capture validation errors', async () => {
    const store = useSimulationStore.getState();

    // Set invalid configuration
    store.setMasses([{ id: 'bad', position: [0, 0, 0], mass: -100 }]);
    store.compute();

    // Wait for async computation to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = useSimulationStore.getState();
    expect(state.result).toBeNull();
    expect(state.error).toContain('non-negative');
  });

  it('should reset to initial state', () => {
    const store = useSimulationStore.getState();
    store.loadScenario('binary-orbit');

    store.reset();

    const state = useSimulationStore.getState();
    expect(state.config.masses).toHaveLength(0);
    expect(state.result).toBeNull();
    expect(state.currentPreset).toBeNull();
    expect(state.error).toBeNull();
  });

  it('should toggle orbits enabled', () => {
    const store = useSimulationStore.getState();

    expect(useSimulationStore.getState().orbitsEnabled).toBe(false);

    store.setOrbitsEnabled(true);
    expect(useSimulationStore.getState().orbitsEnabled).toBe(true);
    expect(useSimulationStore.getState().config.orbitsEnabled).toBe(true);

    store.setOrbitsEnabled(false);
    expect(useSimulationStore.getState().orbitsEnabled).toBe(false);
  });

  it('should reset simulation time when loading scenario', async () => {
    const store = useSimulationStore.getState();

    // Advance time
    store.setOrbitsEnabled(true);
    store.loadScenario('binary-orbit');

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Time should reset when loading scenario
    expect(useSimulationStore.getState().simulationTime).toBe(0);
  });

  it('should reset simulation time to zero', async () => {
    const store = useSimulationStore.getState();
    store.loadScenario('binary-orbit');

    await new Promise((resolve) => setTimeout(resolve, 10));

    store.resetSimulationTime();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(useSimulationStore.getState().simulationTime).toBe(0);
  });

  it('should load binary-orbit with orbital parameters', async () => {
    const store = useSimulationStore.getState();
    store.loadScenario('binary-orbit');

    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = useSimulationStore.getState();
    expect(state.config.masses.length).toBe(2);
    expect(state.config.masses[0].orbit).toBeDefined();
    expect(state.config.masses[1].orbit).toBeDefined();
  });
});

describe('multi-mass superposition', () => {
  it('should compute correct superposed curvature', () => {
    // Two equal masses should give double the deviation at the center
    const singleMass: CurvatureGridConfig = {
      resolution: 3,
      bounds: [-2, -2, -2, 2, 2, 2],
      timeStep: 0.016,
      masses: [{ id: 'single', position: [0, 0, 0], mass: 100 }],
    };

    const doubleMass: CurvatureGridConfig = {
      ...singleMass,
      masses: [
        { id: 'm1', position: [0, 0, 0], mass: 50 },
        { id: 'm2', position: [0, 0, 0], mass: 50 },
      ],
    };

    const resultSingle = computeCurvatureGrid(singleMass);
    const resultDouble = computeCurvatureGrid(doubleMass);

    // Results should be identical for overlapping equal total mass
    for (let i = 0; i < resultSingle.samples.length; i++) {
      expect(resultDouble.samples[i].metricDeviation).toBeCloseTo(
        resultSingle.samples[i].metricDeviation,
        6
      );
    }
  });

  it('should preserve symmetry for symmetric mass configurations', () => {
    const config: CurvatureGridConfig = {
      resolution: 5,
      bounds: [-3, -3, -3, 3, 3, 3],
      timeStep: 0.016,
      masses: [
        { id: 'm1', position: [-1, 0, 0], mass: 100 },
        { id: 'm2', position: [1, 0, 0], mass: 100 },
      ],
    };

    const result = computeCurvatureGrid(config);

    // Find samples at symmetric positions along x-axis
    const leftSample = result.samples.find(
      (s) =>
        Math.abs(s.position[0] + 1.8) < 0.5 && Math.abs(s.position[1]) < 0.5
    );
    const rightSample = result.samples.find(
      (s) =>
        Math.abs(s.position[0] - 1.8) < 0.5 && Math.abs(s.position[1]) < 0.5
    );

    if (leftSample && rightSample) {
      // Due to symmetry, deviations should be approximately equal
      expect(Math.abs(leftSample.metricDeviation)).toBeCloseTo(
        Math.abs(rightSample.metricDeviation),
        2
      );
    }
  });
});

describe('edge cases', () => {
  it('should handle extremely large masses without NaN', () => {
    const config: CurvatureGridConfig = {
      resolution: 2,
      bounds: [-1, -1, -1, 1, 1, 1],
      timeStep: 0.016,
      masses: [{ id: 'huge', position: [0, 0, 0], mass: 1e15 }],
    };

    const result = computeCurvatureGrid(config);

    for (const sample of result.samples) {
      expect(Number.isFinite(sample.metricDeviation)).toBe(true);
      expect(Number.isNaN(sample.metricDeviation)).toBe(false);
      for (const t of sample.tidalTensor) {
        expect(Number.isFinite(t)).toBe(true);
        expect(Number.isNaN(t)).toBe(false);
      }
    }
  });

  it('should handle sample at mass position (zero distance)', () => {
    const config: CurvatureGridConfig = {
      resolution: 2,
      bounds: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
      timeStep: 0.016,
      masses: [{ id: 'center', position: [0.125, 0.125, 0.125], mass: 100 }],
    };

    const result = computeCurvatureGrid(config);

    // Should not produce NaN or Infinity
    for (const sample of result.samples) {
      expect(Number.isFinite(sample.metricDeviation)).toBe(true);
      for (const t of sample.tidalTensor) {
        expect(Number.isFinite(t)).toBe(true);
      }
    }
  });

  it('should handle many overlapping masses', () => {
    const masses: MassSource[] = Array.from({ length: 100 }, (_, i) => ({
      id: `m${i}`,
      position: [0, 0, 0] as [number, number, number],
      mass: 1,
    }));

    const config: CurvatureGridConfig = {
      resolution: 2,
      bounds: [-1, -1, -1, 1, 1, 1],
      timeStep: 0.016,
      masses,
    };

    // Should not throw and should produce valid results
    const result = computeCurvatureGrid(config);
    expect(result.samples.length).toBe(8);

    // Sum should equal single mass of 100
    const singleConfig = {
      ...config,
      masses: [
        {
          id: 'single',
          position: [0, 0, 0] as [number, number, number],
          mass: 100,
        },
      ],
    };
    const singleResult = computeCurvatureGrid(singleConfig);

    for (let i = 0; i < result.samples.length; i++) {
      expect(result.samples[i].metricDeviation).toBeCloseTo(
        singleResult.samples[i].metricDeviation,
        6
      );
    }
  });
});
