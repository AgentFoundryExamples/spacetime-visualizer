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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimulation, DEFAULT_DEBOUNCE_MS } from '../hooks/useSimulation';
import { useSimulationStore } from '../state/simulation';

describe('useSimulation hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSimulationStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useSimulation());
      const [state] = result.current;

      expect(state.isComputing).toBe(false);
      expect(state.error).toBeNull();
      expect(state.resolutionWarning).toBeNull();
      expect(state.isPaused).toBe(false);
      expect(state.autoRotate).toBe(false);
      expect(state.massScale).toBe(1.0);
      expect(state.gridResolution).toBe(16); // Default from store
    });

    it('should return action functions', () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      expect(typeof actions.loadScenario).toBe('function');
      expect(typeof actions.setResolution).toBe('function');
      expect(typeof actions.setMassScale).toBe('function');
      expect(typeof actions.updateMass).toBe('function');
      expect(typeof actions.togglePause).toBe('function');
      expect(typeof actions.toggleAutoRotate).toBe('function');
      expect(typeof actions.resetCamera).toBe('function');
      expect(typeof actions.recompute).toBe('function');
      expect(typeof actions.reset).toBe('function');
    });
  });

  describe('loadScenario', () => {
    it('should load scenario and update preset', async () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      act(() => {
        actions.loadScenario('binary-orbit');
      });

      // Wait for async computation
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE_MS + 100);
      });

      const [state] = result.current;
      expect(state.currentPreset).toBe('binary-orbit');
    });
  });

  describe('setResolution', () => {
    it('should update resolution and trigger debounced compute', async () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      // First load a scenario to have masses
      act(() => {
        actions.loadScenario('single-mass');
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE_MS + 100);
      });

      act(() => {
        actions.setResolution(32);
      });

      // Wait for debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE_MS + 100);
      });

      const [state] = result.current;
      expect(state.gridResolution).toBe(32);
    });

    it('should clamp resolution to valid range', async () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      act(() => {
        actions.setResolution(500);
      });

      const [state] = result.current;
      expect(state.gridResolution).toBe(128); // Clamped to max
    });

    it('should show warning for high resolution', async () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      act(() => {
        actions.setResolution(128);
      });

      const [state] = result.current;
      expect(state.resolutionWarning).not.toBeNull();
    });
  });

  describe('togglePause', () => {
    it('should toggle pause state', () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      expect(result.current[0].isPaused).toBe(false);

      act(() => {
        actions.togglePause();
      });

      expect(result.current[0].isPaused).toBe(true);

      act(() => {
        actions.togglePause();
      });

      expect(result.current[0].isPaused).toBe(false);
    });
  });

  describe('toggleAutoRotate', () => {
    it('should toggle autoRotate state', () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      expect(result.current[0].autoRotate).toBe(false);

      act(() => {
        actions.toggleAutoRotate();
      });

      expect(result.current[0].autoRotate).toBe(true);
    });
  });

  describe('resetCamera', () => {
    it('should call the reset camera callback', () => {
      const mockResetCamera = vi.fn();
      const { result } = renderHook(() => useSimulation(mockResetCamera));
      const [, actions] = result.current;

      act(() => {
        actions.resetCamera();
      });

      expect(mockResetCamera).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      // Make some changes
      act(() => {
        actions.loadScenario('binary-orbit');
        actions.togglePause();
        actions.toggleAutoRotate();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE_MS + 100);
      });

      // Reset
      act(() => {
        actions.reset();
      });

      const [state] = result.current;
      expect(state.isPaused).toBe(false);
      expect(state.autoRotate).toBe(false);
      expect(state.massScale).toBe(1.0);
      expect(state.currentPreset).toBeNull();
    });
  });

  describe('debouncing', () => {
    it('should batch rapid resolution changes', async () => {
      const computeSpy = vi.spyOn(useSimulationStore.getState(), 'compute');
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      // Rapid changes
      act(() => {
        actions.setResolution(24);
        actions.setResolution(32);
        actions.setResolution(40);
        actions.setResolution(48);
      });

      // Advance partial time (should not compute yet)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE_MS / 2);
      });

      // Wait for full debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE_MS + 100);
      });

      // Should only have computed once (or twice max if there was a pending call)
      expect(computeSpy.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('trail controls', () => {
    it('should return trail state from store', () => {
      const { result } = renderHook(() => useSimulation());
      const [state] = result.current;

      expect(state.trailConfig).toBeDefined();
      expect(state.trailConfig.enabled).toBe(false);
      expect(state.trailConfig.maxPoints).toBe(100);
      expect(state.trails).toEqual([]);
    });

    it('should have trail action functions', () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      expect(typeof actions.setTrailConfig).toBe('function');
      expect(typeof actions.clearTrails).toBe('function');
    });

    it('should toggle trail enabled state', () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      expect(result.current[0].trailConfig.enabled).toBe(false);

      act(() => {
        actions.setTrailConfig({ enabled: true });
      });

      expect(result.current[0].trailConfig.enabled).toBe(true);

      act(() => {
        actions.setTrailConfig({ enabled: false });
      });

      expect(result.current[0].trailConfig.enabled).toBe(false);
    });

    it('should update trail maxPoints within bounds', () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      act(() => {
        actions.setTrailConfig({ maxPoints: 200 });
      });

      expect(result.current[0].trailConfig.maxPoints).toBe(200);

      // Test clamping to max
      act(() => {
        actions.setTrailConfig({ maxPoints: 1000 });
      });

      expect(result.current[0].trailConfig.maxPoints).toBe(500);

      // Test clamping to min
      act(() => {
        actions.setTrailConfig({ maxPoints: 5 });
      });

      expect(result.current[0].trailConfig.maxPoints).toBe(10);
    });

    it('should clear trails', () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      // First enable trails and add some data directly to store
      act(() => {
        actions.setTrailConfig({ enabled: true });
      });

      // Manually add some trail data to store
      act(() => {
        useSimulationStore.setState({
          trails: [
            {
              massId: 'mass1',
              points: [
                { position: [0, 0, 0], timestamp: 0 },
                { position: [1, 0, 0], timestamp: 0.5 },
              ],
            },
          ],
        });
      });

      expect(result.current[0].trails.length).toBe(1);

      act(() => {
        actions.clearTrails();
      });

      expect(result.current[0].trails).toEqual([]);
    });

    it('should clear trails when loading a new scenario', async () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      // Add some trail data
      act(() => {
        useSimulationStore.setState({
          trails: [{ massId: 'mass1', points: [{ position: [0, 0, 0], timestamp: 0 }] }],
        });
      });

      expect(result.current[0].trails.length).toBe(1);

      // Load a new scenario
      act(() => {
        actions.loadScenario('single-mass');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE_MS + 100);
      });

      expect(result.current[0].trails).toEqual([]);
    });

    it('should clear trails when resetting simulation', async () => {
      const { result } = renderHook(() => useSimulation());
      const [, actions] = result.current;

      // Add some trail data
      act(() => {
        useSimulationStore.setState({
          trails: [{ massId: 'mass1', points: [{ position: [0, 0, 0], timestamp: 0 }] }],
        });
      });

      expect(result.current[0].trails.length).toBe(1);

      act(() => {
        actions.reset();
      });

      expect(result.current[0].trails).toEqual([]);
      expect(result.current[0].trailConfig.enabled).toBe(false);
    });
  });
});
