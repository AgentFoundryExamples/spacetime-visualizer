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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrbitAnimation } from './useOrbitAnimation';
import { useSimulationStore } from '../state/simulation';

// Mock requestAnimationFrame and cancelAnimationFrame
let animationFrameCallback: ((time: number) => void) | null = null;
let animationFrameId = 0;

const mockRequestAnimationFrame = vi.fn((callback: (time: number) => void) => {
  animationFrameCallback = callback;
  return ++animationFrameId;
});

const mockCancelAnimationFrame = vi.fn((id: number) => {
  if (id === animationFrameId) {
    animationFrameCallback = null;
  }
});

describe('useOrbitAnimation', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useSimulationStore.setState({
      orbitsEnabled: false,
      simulationTime: 0,
      timeScale: 1,
      isComputing: false,
      config: {
        resolution: 16,
        bounds: [-5, -5, -5, 5, 5, 5],
        timeStep: 0.016,
        masses: [
          {
            id: 'central',
            position: [0, 0, 0],
            mass: 100,
          },
          {
            id: 'orbiting',
            position: [2, 0, 0],
            mass: 10,
            orbit: {
              semiMajorAxis: 2,
              eccentricity: 0,
              inclination: 0,
              longitudeOfAscendingNode: 0,
              argumentOfPeriapsis: 0,
              initialTrueAnomaly: 0,
            },
          },
        ],
      },
    });

    // Setup mocks
    vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);
    mockRequestAnimationFrame.mockClear();
    mockCancelAnimationFrame.mockClear();
    animationFrameCallback = null;
    animationFrameId = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should not start animation loop when orbits are disabled', () => {
    renderHook(() => useOrbitAnimation());

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  it('should start animation loop when orbits are enabled', () => {
    useSimulationStore.setState({ orbitsEnabled: true });

    renderHook(() => useOrbitAnimation());

    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('should not start animation loop when timeScale is zero', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 0 });

    renderHook(() => useOrbitAnimation());

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  it('should cancel animation frame on unmount', () => {
    useSimulationStore.setState({ orbitsEnabled: true });

    const { unmount } = renderHook(() => useOrbitAnimation());

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    unmount();

    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  it('should advance simulation time on animation frame', () => {
    useSimulationStore.setState({ orbitsEnabled: true });

    renderHook(() => useOrbitAnimation());

    const initialTime = useSimulationStore.getState().simulationTime;

    // Simulate first animation frame (used to set lastTime)
    act(() => {
      if (animationFrameCallback) {
        animationFrameCallback(0);
      }
    });

    // Simulate second animation frame 16ms later
    act(() => {
      if (animationFrameCallback) {
        animationFrameCallback(16);
      }
    });

    const newTime = useSimulationStore.getState().simulationTime;

    // Time should have advanced (exact value depends on clamping)
    expect(newTime).toBeGreaterThan(initialTime);
  });

  it('should respect timeScale when advancing time', () => {
    // Test using the store's advanceSimulationTime directly
    // since the hook just calls this function
    // Note: We need to ensure isComputing is false for the test to work
    useSimulationStore.setState({
      orbitsEnabled: true,
      timeScale: 2,
      simulationTime: 0,
      isComputing: false,
    });

    // Get state and advance time (compute will be triggered but we check time first)
    const storeBefore1 = useSimulationStore.getState();
    expect(storeBefore1.isComputing).toBe(false);

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.01);
    });

    const time1 = useSimulationStore.getState().simulationTime;

    // Reset simulation time and test with timeScale = 1
    // Also reset isComputing to allow another advance
    useSimulationStore.setState({
      simulationTime: 0,
      timeScale: 1,
      isComputing: false,
    });

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.01);
    });

    const time2 = useSimulationStore.getState().simulationTime;

    // Both should have advanced
    expect(time1).toBeGreaterThan(0);
    expect(time2).toBeGreaterThan(0);

    // Time with timeScale=2 should be greater (approximately double, but clamped)
    expect(time1).toBeGreaterThanOrEqual(time2);
  });

  it('should stop animation when orbits are disabled', () => {
    useSimulationStore.setState({ orbitsEnabled: true });

    const { rerender } = renderHook(() => useOrbitAnimation());

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    // Disable orbits
    act(() => {
      useSimulationStore.setState({ orbitsEnabled: false });
    });

    rerender();

    // Animation should be cancelled
    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  it('should stop animation when timeScale becomes zero', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 1 });

    const { rerender } = renderHook(() => useOrbitAnimation());

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    // Set timeScale to zero (pause)
    act(() => {
      useSimulationStore.setState({ timeScale: 0 });
    });

    rerender();

    // Animation should be cancelled
    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  it('should resume animation when timeScale becomes non-zero', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 0 });

    const { rerender } = renderHook(() => useOrbitAnimation());

    // Animation should not start with timeScale=0
    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();

    // Set timeScale to 1 (resume)
    act(() => {
      useSimulationStore.setState({ timeScale: 1 });
    });

    rerender();

    // Animation should now be running
    expect(mockRequestAnimationFrame).toHaveBeenCalled();
  });

  it('should clamp large delta times to prevent position jumps', () => {
    useSimulationStore.setState({ orbitsEnabled: true });

    renderHook(() => useOrbitAnimation());

    // Simulate first frame
    act(() => {
      if (animationFrameCallback) {
        animationFrameCallback(0);
      }
    });

    // Simulate frame after a long pause (500ms - simulating tab switch)
    act(() => {
      if (animationFrameCallback) {
        animationFrameCallback(500);
      }
    });

    const time = useSimulationStore.getState().simulationTime;

    // Time should be clamped to MAX_FRAME_TIME (0.1s), not 0.5s
    // The actual value depends on orbital constraints clamping too
    expect(time).toBeLessThanOrEqual(0.1);
  });
});

describe('orbit enable/disable flows', () => {
  beforeEach(() => {
    useSimulationStore.setState({
      orbitsEnabled: false,
      simulationTime: 0,
      timeScale: 1,
      isComputing: false,
      config: {
        resolution: 16,
        bounds: [-5, -5, -5, 5, 5, 5],
        timeStep: 0.016,
        masses: [
          {
            id: 'central',
            position: [0, 0, 0],
            mass: 100,
          },
          {
            id: 'orbiting',
            position: [2, 0, 0],
            mass: 10,
            orbit: {
              semiMajorAxis: 2,
              eccentricity: 0,
              inclination: 0,
              longitudeOfAscendingNode: 0,
              argumentOfPeriapsis: 0,
              initialTrueAnomaly: 0,
            },
          },
        ],
      },
    });
  });

  it('should set timeScale to 1 when enabling orbits with timeScale of 0', () => {
    useSimulationStore.setState({ timeScale: 0 });

    act(() => {
      useSimulationStore.getState().setOrbitsEnabled(true);
    });

    expect(useSimulationStore.getState().orbitsEnabled).toBe(true);
    expect(useSimulationStore.getState().timeScale).toBe(1);
  });

  it('should preserve timeScale when enabling orbits with non-zero timeScale', () => {
    useSimulationStore.setState({ timeScale: 2 });

    act(() => {
      useSimulationStore.getState().setOrbitsEnabled(true);
    });

    expect(useSimulationStore.getState().orbitsEnabled).toBe(true);
    expect(useSimulationStore.getState().timeScale).toBe(2);
  });

  it('should preserve timeScale when disabling orbits', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 2 });

    act(() => {
      useSimulationStore.getState().setOrbitsEnabled(false);
    });

    expect(useSimulationStore.getState().orbitsEnabled).toBe(false);
    expect(useSimulationStore.getState().timeScale).toBe(2);
  });

  it('should allow pausing orbits by setting timeScale to 0', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 1 });

    act(() => {
      useSimulationStore.getState().setTimeScale(0);
    });

    expect(useSimulationStore.getState().orbitsEnabled).toBe(true);
    expect(useSimulationStore.getState().timeScale).toBe(0);
  });

  it('should allow resuming orbits by setting timeScale back to 1', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 0 });

    act(() => {
      useSimulationStore.getState().setTimeScale(1);
    });

    expect(useSimulationStore.getState().orbitsEnabled).toBe(true);
    expect(useSimulationStore.getState().timeScale).toBe(1);
  });

  it('should not advance time when timeScale is 0', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 0 });

    const initialTime = useSimulationStore.getState().simulationTime;

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.1);
    });

    expect(useSimulationStore.getState().simulationTime).toBe(initialTime);
  });

  it('should advance time scaled by timeScale', () => {
    useSimulationStore.setState({ orbitsEnabled: true, timeScale: 2 });

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.01);
    });

    const time1 = useSimulationStore.getState().simulationTime;

    // Reset and test with timeScale = 1
    useSimulationStore.setState({ simulationTime: 0, timeScale: 1 });

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.01);
    });

    const time2 = useSimulationStore.getState().simulationTime;

    // With timeScale=2, advance should be approximately double
    // (accounting for orbital constraints clamping)
    expect(time1).toBeGreaterThan(time2);
  });

  it('should reset timeScale to 1 on full reset', () => {
    useSimulationStore.setState({ timeScale: 0 });

    act(() => {
      useSimulationStore.getState().reset();
    });

    expect(useSimulationStore.getState().timeScale).toBe(1);
  });
});

describe('worker message expectations', () => {
  beforeEach(() => {
    useSimulationStore.setState({
      orbitsEnabled: false,
      simulationTime: 0,
      timeScale: 1,
      isComputing: false,
      config: {
        resolution: 16,
        bounds: [-5, -5, -5, 5, 5, 5],
        timeStep: 0.016,
        masses: [
          {
            id: 'central',
            position: [0, 0, 0],
            mass: 100,
          },
          {
            id: 'orbiting',
            position: [2, 0, 0],
            mass: 10,
            orbit: {
              semiMajorAxis: 2,
              eccentricity: 0,
              inclination: 0,
              longitudeOfAscendingNode: 0,
              argumentOfPeriapsis: 0,
              initialTrueAnomaly: 0,
            },
          },
        ],
      },
    });
  });

  it('should not advance time while computing', () => {
    useSimulationStore.setState({ orbitsEnabled: true, isComputing: true });

    const initialTime = useSimulationStore.getState().simulationTime;

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.1);
    });

    expect(useSimulationStore.getState().simulationTime).toBe(initialTime);
  });

  it('should trigger compute after advancing time', () => {
    useSimulationStore.setState({ orbitsEnabled: true });

    // Mock the compute function to track calls
    const computeSpy = vi.fn();
    const originalCompute = useSimulationStore.getState().compute;
    useSimulationStore.setState({ compute: computeSpy });

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.01);
    });

    expect(computeSpy).toHaveBeenCalled();

    // Restore original compute
    useSimulationStore.setState({ compute: originalCompute });
  });

  it('should update mass positions when advancing time', () => {
    useSimulationStore.setState({ orbitsEnabled: true });

    const initialPosition =
      useSimulationStore.getState().config.masses[1].position;

    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.1);
    });

    const newPosition = useSimulationStore.getState().config.masses[1].position;

    // Position should have changed for the orbiting mass
    expect(newPosition).not.toEqual(initialPosition);
  });
});

describe('paused state regression tests', () => {
  beforeEach(() => {
    useSimulationStore.setState({
      orbitsEnabled: true,
      simulationTime: 5.0,
      timeScale: 1,
      isComputing: false,
      config: {
        resolution: 16,
        bounds: [-5, -5, -5, 5, 5, 5],
        timeStep: 0.016,
        masses: [
          {
            id: 'central',
            position: [0, 0, 0],
            mass: 100,
          },
          {
            id: 'orbiting',
            position: [2, 0, 0],
            mass: 10,
            orbit: {
              semiMajorAxis: 2,
              eccentricity: 0,
              inclination: 0,
              longitudeOfAscendingNode: 0,
              argumentOfPeriapsis: 0,
              initialTrueAnomaly: 0,
            },
          },
        ],
      },
    });
  });

  it('should maintain simulation time when paused', () => {
    const timeBeforePause = useSimulationStore.getState().simulationTime;

    act(() => {
      useSimulationStore.getState().setTimeScale(0);
    });

    // Try to advance time while paused
    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.5);
    });

    expect(useSimulationStore.getState().simulationTime).toBe(timeBeforePause);
  });

  it('should resume from correct time after pause', () => {
    const timeBeforePause = useSimulationStore.getState().simulationTime;

    // Pause
    act(() => {
      useSimulationStore.getState().setTimeScale(0);
    });

    // Resume
    act(() => {
      useSimulationStore.getState().setTimeScale(1);
    });

    // Advance time
    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.01);
    });

    const newTime = useSimulationStore.getState().simulationTime;

    // Should have advanced from the paused time, not jumped
    expect(newTime).toBeGreaterThan(timeBeforePause);
    expect(newTime).toBeLessThan(timeBeforePause + 0.2); // Within reasonable bounds
  });

  it('should handle pause/resume cycle without position jumps', () => {
    // Start with a fresh simulation time of 0
    useSimulationStore.setState({ simulationTime: 0 });

    // Get initial position at t=0
    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0);
    });

    const positionBeforePause = [
      ...useSimulationStore.getState().config.masses[1].position,
    ] as [number, number, number];
    const timeBeforePause = useSimulationStore.getState().simulationTime;

    // Pause
    act(() => {
      useSimulationStore.getState().setTimeScale(0);
    });

    // Resume
    act(() => {
      useSimulationStore.getState().setTimeScale(1);
    });

    // Small time advance - the clamp ensures minimum step of 0.001
    act(() => {
      useSimulationStore.getState().advanceSimulationTime(0.001);
    });

    const positionAfterResume =
      useSimulationStore.getState().config.masses[1].position;
    const timeAfterResume = useSimulationStore.getState().simulationTime;

    // Time should have advanced only by the small amount
    const timeDelta = timeAfterResume - timeBeforePause;
    expect(timeDelta).toBeLessThanOrEqual(0.1); // Within orbital constraints max step

    // Position change should be proportional to small time advance
    // For a circular orbit with radius 2 and period ~6.28 (2π), 
    // velocity is roughly 1 unit/second, so 0.001s should move ~0.001 units
    // Allowing generous margin for orbital mechanics
    const totalDelta = Math.sqrt(
      Math.pow(positionAfterResume[0] - positionBeforePause[0], 2) +
        Math.pow(positionAfterResume[1] - positionBeforePause[1], 2) +
        Math.pow(positionAfterResume[2] - positionBeforePause[2], 2)
    );

    // The position change should be reasonable (not a huge jump)
    // Given timeScale clamping and orbital velocity, allow up to 0.5 units
    expect(totalDelta).toBeLessThan(0.5);
  });
});
