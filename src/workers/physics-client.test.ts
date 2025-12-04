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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequestId } from './types';
import {
  isWorkerSupported,
  createPhysicsComputer,
  terminatePhysicsComputer,
  getPhysicsComputer,
} from './physics-client';
import type { CurvatureGridConfig } from '../physics/types';

describe('createRequestId', () => {
  it('should generate unique request IDs', () => {
    const id1 = createRequestId();
    const id2 = createRequestId();
    const id3 = createRequestId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('should generate string IDs', () => {
    const id = createRequestId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should contain timestamp and random component', () => {
    const id = createRequestId();
    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
  });
});

describe('isWorkerSupported', () => {
  it('should return a boolean', () => {
    expect(typeof isWorkerSupported()).toBe('boolean');
  });
});

describe('physics client fallback', () => {
  const validConfig: CurvatureGridConfig = {
    resolution: 4,
    bounds: [-1, -1, -1, 1, 1, 1],
    timeStep: 0.016,
    masses: [{ id: 'center', position: [0, 0, 0], mass: 100 }],
  };

  let originalWorker: typeof Worker | undefined;
  let warnings: string[] = [];

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    warnings = [];
    terminatePhysicsComputer();
  });

  afterEach(() => {
    if (originalWorker) {
      globalThis.Worker = originalWorker;
    } else {
      (globalThis as Record<string, unknown>).Worker = undefined;
    }
    terminatePhysicsComputer();
  });

  it('should use fallback when Worker is not available', async () => {
    // Remove Worker to simulate SSR or unsupported environment
    (globalThis as Record<string, unknown>).Worker = undefined;

    const computer = await createPhysicsComputer({
      onWarning: (msg) => warnings.push(msg),
    });

    expect(computer.isWorkerBased).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('not supported');
  });

  it('should compute correctly with fallback', async () => {
    (globalThis as Record<string, unknown>).Worker = undefined;

    const computer = await createPhysicsComputer();
    const result = await computer.compute(validConfig);

    expect(result.samples.length).toBe(64); // 4^3
    expect(result.maxDeviation).toBeGreaterThan(0);
  });

  it('should throw without fallback when Worker is not available', async () => {
    (globalThis as Record<string, unknown>).Worker = undefined;

    await expect(
      createPhysicsComputer({ enableFallback: false })
    ).rejects.toThrow('not supported');
  });

  it('should use fallback when Worker initialization fails', async () => {
    // Mock Worker that fails to initialize
    class FailingWorker {
      constructor() {
        throw new Error('Worker initialization failed');
      }
    }
    (globalThis as Record<string, unknown>).Worker = FailingWorker;

    const computer = await createPhysicsComputer({
      onWarning: (msg) => warnings.push(msg),
    });

    expect(computer.isWorkerBased).toBe(false);
    expect(warnings.some(w => w.includes('Failed to initialize'))).toBe(true);
  });

  it('should handle validation errors in fallback mode', async () => {
    (globalThis as Record<string, unknown>).Worker = undefined;

    const computer = await createPhysicsComputer();
    const invalidConfig = {
      ...validConfig,
      masses: [{ id: 'bad', position: [0, 0, 0] as [number, number, number], mass: -100 }],
    };

    await expect(computer.compute(invalidConfig)).rejects.toThrow('non-negative');
  });

  it('should handle empty masses array in fallback mode', async () => {
    (globalThis as Record<string, unknown>).Worker = undefined;

    const computer = await createPhysicsComputer();
    const result = await computer.compute({ ...validConfig, masses: [] });

    expect(result.samples.length).toBe(64);
    expect(result.maxDeviation).toBe(0);
  });
});

describe('singleton physics computer', () => {
  let originalWorker: typeof Worker | undefined;

  beforeEach(() => {
    terminatePhysicsComputer();
    originalWorker = globalThis.Worker;
    (globalThis as Record<string, unknown>).Worker = undefined;
  });

  afterEach(() => {
    if (originalWorker) {
      globalThis.Worker = originalWorker;
    }
    terminatePhysicsComputer();
  });

  it('should return same instance on multiple calls', async () => {
    const computer1 = await getPhysicsComputer();
    const computer2 = await getPhysicsComputer();

    expect(computer1).toBe(computer2);
  });

  it('should create new instance after terminate', async () => {
    const computer1 = await getPhysicsComputer();
    terminatePhysicsComputer();
    const computer2 = await getPhysicsComputer();

    expect(computer1).not.toBe(computer2);
  });

  it('should share singleton across concurrent calls', async () => {
    const [computer1, computer2, computer3] = await Promise.all([
      getPhysicsComputer(),
      getPhysicsComputer(),
      getPhysicsComputer(),
    ]);

    expect(computer1).toBe(computer2);
    expect(computer2).toBe(computer3);
  });
});

describe('fallback computer terminate', () => {
  let originalWorker: typeof Worker | undefined;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    (globalThis as Record<string, unknown>).Worker = undefined;
    terminatePhysicsComputer();
  });

  afterEach(() => {
    if (originalWorker) {
      globalThis.Worker = originalWorker;
    }
    terminatePhysicsComputer();
  });

  it('should allow terminate to be called multiple times', async () => {
    const computer = await createPhysicsComputer();
    
    // Should not throw
    expect(() => {
      computer.terminate();
      computer.terminate();
      computer.terminate();
    }).not.toThrow();
  });

  it('should still work after terminate for fallback', async () => {
    // For fallback, terminate is a no-op, so the computer should still work
    const computer = await createPhysicsComputer();
    computer.terminate();

    const validConfig: CurvatureGridConfig = {
      resolution: 2,
      bounds: [-1, -1, -1, 1, 1, 1],
      timeStep: 0.016,
      masses: [],
    };

    // Fallback doesn't actually "terminate" so this should work
    const result = await computer.compute(validConfig);
    expect(result.samples.length).toBe(8);
  });
});
