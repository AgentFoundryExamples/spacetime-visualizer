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

import { describe, it, expect } from 'vitest';
import {
  computeOrbitalPeriod,
  computeMeanAnomaly,
  solveKeplerEquation,
  eccentricToTrueAnomaly,
  trueToMeanAnomaly,
  computeOrbitalPosition,
  createDefaultOrbitalParameters,
  createBinaryOrbitalParameters,
  validateOrbitalParameters,
  clampOrbitalParameters,
  updateMassPositions,
  OrbitalValidationError,
  ORBITAL_CONSTRAINTS,
} from '../physics/orbit';
import type { OrbitalParameters } from '../physics/orbit';
import type { MassSource } from '../physics/types';

describe('orbital mechanics', () => {
  describe('computeOrbitalPeriod', () => {
    it('should compute period using Kepler third law', () => {
      // T = 2π * sqrt(a³ / (G * M))
      // For a = 1, M = 1, G = 1: T = 2π
      const period = computeOrbitalPeriod(1, 1);
      expect(period).toBeCloseTo(2 * Math.PI, 6);
    });

    it('should return Infinity for zero or negative mass', () => {
      expect(computeOrbitalPeriod(1, 0)).toBe(Infinity);
      expect(computeOrbitalPeriod(1, -1)).toBe(Infinity);
    });

    it('should return Infinity for zero or negative semi-major axis', () => {
      expect(computeOrbitalPeriod(0, 100)).toBe(Infinity);
      expect(computeOrbitalPeriod(-1, 100)).toBe(Infinity);
    });

    it('should scale correctly with mass', () => {
      const period1 = computeOrbitalPeriod(1, 100);
      const period4 = computeOrbitalPeriod(1, 400);
      // T ∝ 1/sqrt(M), so 4x mass = 0.5x period
      expect(period4).toBeCloseTo(period1 / 2, 6);
    });
  });

  describe('computeMeanAnomaly', () => {
    it('should return initial anomaly at t=0', () => {
      const M = computeMeanAnomaly(0, 10, Math.PI / 4);
      expect(M).toBeCloseTo(Math.PI / 4, 6);
    });

    it('should advance by 2π after one period', () => {
      const period = 10;
      const M0 = 0;
      const M = computeMeanAnomaly(period, period, M0);
      expect(M).toBeCloseTo(0, 6); // Wrapped around
    });

    it('should handle non-finite period gracefully', () => {
      const M = computeMeanAnomaly(10, Infinity, 0.5);
      expect(M).toBe(0.5);
    });
  });

  describe('solveKeplerEquation', () => {
    it('should return M for circular orbit (e=0)', () => {
      const E = solveKeplerEquation(Math.PI / 3, 0);
      expect(E).toBeCloseTo(Math.PI / 3, 10);
    });

    it('should solve correctly for low eccentricity', () => {
      const e = 0.1;
      const M = 0.5;
      const E = solveKeplerEquation(M, e);
      // Verify: M = E - e*sin(E)
      const computedM = E - e * Math.sin(E);
      expect(computedM).toBeCloseTo(M, 10);
    });

    it('should solve correctly for high eccentricity', () => {
      const e = 0.9;
      const M = 1.0;
      const E = solveKeplerEquation(M, e);
      const computedM = E - e * Math.sin(E);
      expect(computedM).toBeCloseTo(M, 8);
    });

    it('should solve for edge case M=0', () => {
      const E = solveKeplerEquation(0, 0.5);
      expect(E).toBeCloseTo(0, 10);
    });
  });

  describe('eccentricToTrueAnomaly', () => {
    it('should return E for circular orbit', () => {
      const nu = eccentricToTrueAnomaly(Math.PI / 4, 0);
      expect(nu).toBeCloseTo(Math.PI / 4, 10);
    });

    it('should produce larger true anomaly for positive E', () => {
      const E = Math.PI / 4;
      const e = 0.5;
      const nu = eccentricToTrueAnomaly(E, e);
      // True anomaly leads eccentric anomaly for e > 0 in first half
      expect(nu).toBeGreaterThan(E);
    });
  });

  describe('trueToMeanAnomaly', () => {
    it('should be inverse of eccentric/mean conversion chain', () => {
      const trueAnomaly = 0.8;
      const e = 0.3;
      const M = trueToMeanAnomaly(trueAnomaly, e);
      
      // Reconstruct true anomaly from mean anomaly
      const E = solveKeplerEquation(M, e);
      const reconstructed = eccentricToTrueAnomaly(E, e);
      
      expect(reconstructed).toBeCloseTo(trueAnomaly, 8);
    });
  });

  describe('computeOrbitalPosition', () => {
    const circularOrbit: OrbitalParameters = {
      semiMajorAxis: 2,
      eccentricity: 0,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      initialTrueAnomaly: 0,
    };

    it('should start at periapsis for circular orbit with ν=0', () => {
      const pos = computeOrbitalPosition(circularOrbit, 0, 100);
      expect(pos[0]).toBeCloseTo(2, 6); // On positive x-axis
      expect(pos[1]).toBeCloseTo(0, 6);
      expect(pos[2]).toBeCloseTo(0, 6);
    });

    it('should maintain constant radius for circular orbit', () => {
      const centralMass = 100;
      const positions = [0, 0.5, 1, 1.5, 2].map((t) =>
        computeOrbitalPosition(circularOrbit, t, centralMass)
      );

      positions.forEach((pos) => {
        const r = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
        expect(r).toBeCloseTo(2, 4);
      });
    });

    it('should complete orbit after one period', () => {
      const centralMass = 100;
      const period = computeOrbitalPeriod(circularOrbit.semiMajorAxis, centralMass);
      
      const start = computeOrbitalPosition(circularOrbit, 0, centralMass);
      const end = computeOrbitalPosition(circularOrbit, period, centralMass);

      expect(end[0]).toBeCloseTo(start[0], 4);
      expect(end[1]).toBeCloseTo(start[1], 4);
      expect(end[2]).toBeCloseTo(start[2], 4);
    });

    it('should offset from center position', () => {
      const center: [number, number, number] = [5, 3, -2];
      const pos = computeOrbitalPosition(circularOrbit, 0, 100, center);
      
      expect(pos[0]).toBeCloseTo(5 + 2, 6);
      expect(pos[1]).toBeCloseTo(3, 6);
      expect(pos[2]).toBeCloseTo(-2, 6);
    });

    it('should handle inclined orbit', () => {
      const inclinedOrbit: OrbitalParameters = {
        ...circularOrbit,
        inclination: Math.PI / 4, // 45 degrees
        initialTrueAnomaly: Math.PI / 2, // At 90 degrees in orbital plane
      };

      const pos = computeOrbitalPosition(inclinedOrbit, 0, 100);
      
      // Should have non-zero z component
      expect(Math.abs(pos[2])).toBeGreaterThan(0.1);
    });
  });

  describe('createDefaultOrbitalParameters', () => {
    it('should create circular orbit at given radius', () => {
      const params = createDefaultOrbitalParameters(3);
      expect(params.semiMajorAxis).toBe(3);
      expect(params.eccentricity).toBe(0);
      expect(params.inclination).toBe(0);
    });

    it('should clamp radius to constraints', () => {
      const params = createDefaultOrbitalParameters(100);
      expect(params.semiMajorAxis).toBe(ORBITAL_CONSTRAINTS.maxSemiMajorAxis);
    });

    it('should set initial phase', () => {
      const params = createDefaultOrbitalParameters(2, Math.PI / 2);
      expect(params.initialTrueAnomaly).toBe(Math.PI / 2);
    });
  });

  describe('createBinaryOrbitalParameters', () => {
    it('should create two orbits 180 degrees apart', () => {
      const [p1, p2] = createBinaryOrbitalParameters(4, 1, 0);
      expect(Math.abs(p1.initialTrueAnomaly - p2.initialTrueAnomaly)).toBeCloseTo(Math.PI, 6);
    });

    it('should adjust semi-major axes for mass ratio', () => {
      const [p1, p2] = createBinaryOrbitalParameters(4, 1, 0);
      // Equal masses: equal orbits
      expect(p1.semiMajorAxis).toBeCloseTo(p2.semiMajorAxis, 6);
      
      const [p3, p4] = createBinaryOrbitalParameters(4, 0.5, 0);
      // Unequal masses: different orbit sizes
      expect(p3.semiMajorAxis).toBeLessThan(p4.semiMajorAxis);
    });
  });

  describe('validateOrbitalParameters', () => {
    const validParams: OrbitalParameters = {
      semiMajorAxis: 2,
      eccentricity: 0.3,
      inclination: 0.5,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      initialTrueAnomaly: 0,
    };

    it('should accept valid parameters', () => {
      expect(() => validateOrbitalParameters(validParams)).not.toThrow();
    });

    it('should reject non-positive semi-major axis', () => {
      expect(() =>
        validateOrbitalParameters({ ...validParams, semiMajorAxis: 0 })
      ).toThrow(OrbitalValidationError);
      expect(() =>
        validateOrbitalParameters({ ...validParams, semiMajorAxis: -1 })
      ).toThrow(OrbitalValidationError);
    });

    it('should reject eccentricity >= 1', () => {
      expect(() =>
        validateOrbitalParameters({ ...validParams, eccentricity: 1 })
      ).toThrow(OrbitalValidationError);
      expect(() =>
        validateOrbitalParameters({ ...validParams, eccentricity: 1.5 })
      ).toThrow(OrbitalValidationError);
    });

    it('should reject negative eccentricity', () => {
      expect(() =>
        validateOrbitalParameters({ ...validParams, eccentricity: -0.1 })
      ).toThrow(OrbitalValidationError);
    });

    it('should reject NaN values', () => {
      expect(() =>
        validateOrbitalParameters({ ...validParams, semiMajorAxis: NaN })
      ).toThrow(OrbitalValidationError);
    });
  });

  describe('clampOrbitalParameters', () => {
    it('should clamp semi-major axis to bounds', () => {
      const clamped = clampOrbitalParameters({
        semiMajorAxis: 100,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: 0,
      });
      expect(clamped.semiMajorAxis).toBe(ORBITAL_CONSTRAINTS.maxSemiMajorAxis);
    });

    it('should clamp eccentricity', () => {
      const clamped = clampOrbitalParameters({
        semiMajorAxis: 2,
        eccentricity: 0.99,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: 0,
      });
      expect(clamped.eccentricity).toBe(ORBITAL_CONSTRAINTS.maxEccentricity);
    });

    it('should clamp inclination', () => {
      const clamped = clampOrbitalParameters({
        semiMajorAxis: 2,
        eccentricity: 0,
        inclination: Math.PI,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: 0,
      });
      expect(clamped.inclination).toBe(ORBITAL_CONSTRAINTS.maxInclination);
    });
  });

  describe('updateMassPositions', () => {
    it('should not modify masses without orbits', () => {
      const masses: MassSource[] = [
        { id: 'm1', position: [1, 2, 3], mass: 100 },
        { id: 'm2', position: [4, 5, 6], mass: 50 },
      ];

      const updated = updateMassPositions(masses, 10);
      
      expect(updated[0].position).toEqual([1, 2, 3]);
      expect(updated[1].position).toEqual([4, 5, 6]);
    });

    it('should update position for mass with orbit', () => {
      const orbit: OrbitalParameters = {
        semiMajorAxis: 2,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: 0,
      };

      const masses: MassSource[] = [
        { id: 'central', position: [0, 0, 0], mass: 100 },
        { id: 'orbiting', position: [2, 0, 0], mass: 10, orbit },
      ];

      const updated = updateMassPositions(masses, 0);
      
      // At t=0, should be at initial position
      expect(updated[1].position[0]).toBeCloseTo(2, 4);
      expect(updated[1].position[1]).toBeCloseTo(0, 4);
      expect(updated[1].position[2]).toBeCloseTo(0, 4);
    });

    it('should orbit around specified central mass', () => {
      const orbit: OrbitalParameters = {
        semiMajorAxis: 2,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        initialTrueAnomaly: 0,
      };

      const masses: MassSource[] = [
        { id: 'central', position: [5, 5, 0], mass: 100 },
        { id: 'orbiting', position: [0, 0, 0], mass: 10, orbit, orbitsCentralMassId: 'central' },
      ];

      const updated = updateMassPositions(masses, 0);
      
      // Should be 2 units from central mass at (5, 5, 0)
      expect(updated[1].position[0]).toBeCloseTo(7, 4); // 5 + 2
      expect(updated[1].position[1]).toBeCloseTo(5, 4);
      expect(updated[1].position[2]).toBeCloseTo(0, 4);
    });

    it('should handle multiple orbiting masses', () => {
      const orbit1 = createDefaultOrbitalParameters(2, 0);
      const orbit2 = createDefaultOrbitalParameters(3, Math.PI);

      const masses: MassSource[] = [
        { id: 'central', position: [0, 0, 0], mass: 100 },
        { id: 'm1', position: [0, 0, 0], mass: 10, orbit: orbit1 },
        { id: 'm2', position: [0, 0, 0], mass: 10, orbit: orbit2 },
      ];

      const updated = updateMassPositions(masses, 0);
      
      // m1 at (2, 0, 0), m2 at (-3, 0, 0)
      expect(updated[1].position[0]).toBeCloseTo(2, 4);
      expect(updated[2].position[0]).toBeCloseTo(-3, 4);
    });
  });
});

describe('orbital edge cases', () => {
  it('should handle very high eccentricity orbits', () => {
    const highEccOrbit: OrbitalParameters = {
      semiMajorAxis: 3,
      eccentricity: 0.95,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      initialTrueAnomaly: 0,
    };

    // Should not throw
    const pos = computeOrbitalPosition(highEccOrbit, 1.5, 100);
    
    expect(Number.isFinite(pos[0])).toBe(true);
    expect(Number.isFinite(pos[1])).toBe(true);
    expect(Number.isFinite(pos[2])).toBe(true);
  });

  it('should handle very small semi-major axis', () => {
    const tightOrbit: OrbitalParameters = {
      semiMajorAxis: 0.5,
      eccentricity: 0,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      initialTrueAnomaly: 0,
    };

    const pos = computeOrbitalPosition(tightOrbit, 0, 100);
    
    expect(pos[0]).toBeCloseTo(0.5, 6);
  });

  it('should handle all angular parameters at non-zero values', () => {
    const complexOrbit: OrbitalParameters = {
      semiMajorAxis: 2,
      eccentricity: 0.3,
      inclination: Math.PI / 6,
      longitudeOfAscendingNode: Math.PI / 4,
      argumentOfPeriapsis: Math.PI / 3,
      initialTrueAnomaly: Math.PI / 5,
    };

    const pos = computeOrbitalPosition(complexOrbit, 0, 100);
    
    // Just verify it produces valid output
    expect(Number.isFinite(pos[0])).toBe(true);
    expect(Number.isFinite(pos[1])).toBe(true);
    expect(Number.isFinite(pos[2])).toBe(true);

    // And has non-zero z due to inclination
    expect(Math.abs(pos[2])).toBeGreaterThan(0);
  });
});
