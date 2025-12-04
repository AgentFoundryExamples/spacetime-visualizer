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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../state/simulation';
import type {
  ScenarioPreset,
  MassSource,
  VisualizationMode,
  CurvatureGridConfig,
} from '../state/simulation';
import { checkResolutionWarning, clampResolution } from '../visualization';

/**
 * Default debounce delay for parameter updates (ms).
 * Prevents physics thrash from rapid UI changes.
 */
export const DEFAULT_DEBOUNCE_MS = 100;

/**
 * Minimum time between compute calls (ms).
 * Ensures we don't trigger too many recomputations.
 */
export const MIN_COMPUTE_INTERVAL_MS = 50;

/**
 * Minimum allowed mass scale multiplier.
 */
export const MIN_MASS_SCALE = 0.1;

/**
 * Maximum allowed mass scale multiplier.
 */
export const MAX_MASS_SCALE = 10;

/**
 * Hook state returned by useSimulation.
 */
export interface UseSimulationState {
  /** Whether simulation is currently computing */
  isComputing: boolean;
  /** Current error message (null if no error) */
  error: string | null;
  /** Warning about resolution (null if resolution is safe) */
  resolutionWarning: string | null;
  /** Whether simulation is paused */
  isPaused: boolean;
  /** Whether auto-rotate is enabled */
  autoRotate: boolean;
  /** Current mass scale multiplier */
  massScale: number;
  /** Current grid resolution */
  gridResolution: number;
  /** Currently selected scenario */
  currentPreset: ScenarioPreset | null;
  /** Current visualization mode */
  visualizationMode: VisualizationMode;
  /** Current configuration */
  config: CurvatureGridConfig;
  /** Whether the configuration has been modified from the preset */
  hasUnsavedChanges: boolean;
  /** Whether orbital motion is enabled */
  orbitsEnabled: boolean;
  /** Current simulation time */
  simulationTime: number;
  /** Time scale multiplier for orbital motion (0 = paused, 1 = normal speed) */
  timeScale: number;
  /** Whether physics computation is using a Web Worker */
  isUsingWorker: boolean;
  /** Warning message about worker status (null if no warning) */
  workerWarning: string | null;
}

/**
 * Hook actions returned by useSimulation.
 */
export interface UseSimulationActions {
  /** Load a preset scenario */
  loadScenario: (preset: ScenarioPreset) => void;
  /** Load a custom configuration */
  loadCustomConfig: (config: CurvatureGridConfig) => void;
  /** Set visualization mode */
  setVisualizationMode: (mode: VisualizationMode) => void;
  /** Set grid resolution (debounced) */
  setResolution: (resolution: number) => void;
  /** Set mass scale multiplier (debounced) */
  setMassScale: (scale: number) => void;
  /** Update a specific mass source */
  updateMass: (id: string, updates: Partial<Omit<MassSource, 'id'>>) => void;
  /** Toggle pause state */
  togglePause: () => void;
  /** Toggle auto-rotate */
  toggleAutoRotate: () => void;
  /** Reset camera to default position */
  resetCamera: () => void;
  /** Force recompute */
  recompute: () => void;
  /** Reset simulation to initial state */
  reset: () => void;
  /** Enable or disable orbital motion */
  setOrbitsEnabled: (enabled: boolean) => void;
  /** Set time scale for orbital motion (0 = paused, 1 = normal speed) */
  setTimeScale: (scale: number) => void;
  /** Advance simulation time for orbital motion */
  advanceSimulationTime: (deltaTime: number) => void;
  /** Reset simulation time to zero */
  resetSimulationTime: () => void;
}

/**
 * Hook for managing simulation state with debounced updates.
 * Connects UI controls to the simulation store while preventing
 * performance issues from rapid parameter changes.
 *
 * @param onResetCamera - Callback to reset camera position
 * @param debounceMs - Debounce delay for parameter updates
 * @returns Tuple of [state, actions]
 */
export function useSimulation(
  onResetCamera?: () => void,
  debounceMs: number = DEFAULT_DEBOUNCE_MS
): [UseSimulationState, UseSimulationActions] {
  // Local UI state
  const [isPaused, setIsPaused] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [massScale, setMassScaleLocal] = useState(1.0);
  const [localResolution, setLocalResolution] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastComputeRef = useRef<number>(0);
  const pendingMassUpdatesRef = useRef<
    Map<string, Partial<Omit<MassSource, 'id'>>>
  >(new Map());
  // Store original base masses to avoid floating-point drift from repeated scaling
  const baseMassesRef = useRef<Map<string, number>>(new Map());

  // Store state
  const {
    isComputing,
    error,
    currentPreset,
    config,
    visualizationMode,
    orbitsEnabled,
    simulationTime,
    timeScale,
    isUsingWorker,
    workerWarning,
    loadScenario: storeLoadScenario,
    loadCustomConfig: storeLoadCustomConfig,
    setVisualizationMode: storeSetVisualizationMode,
    setResolution: storeSetResolution,
    updateMass: storeUpdateMass,
    compute: storeCompute,
    reset: storeReset,
    setOrbitsEnabled: storeSetOrbitsEnabled,
    setTimeScale: storeSetTimeScale,
    advanceSimulationTime: storeAdvanceSimulationTime,
    resetSimulationTime: storeResetSimulationTime,
  } = useSimulationStore();

  // Calculate resolution warning
  const displayResolution = localResolution ?? config.resolution;
  const resolutionWarning = checkResolutionWarning(displayResolution);

  /**
   * Flushes pending updates and triggers compute.
   */
  const flushAndCompute = useCallback(() => {
    // Flush pending mass updates
    const pending = pendingMassUpdatesRef.current;
    if (pending.size > 0) {
      pending.forEach((updates, id) => {
        storeUpdateMass(id, updates);
      });
      pending.clear();
    }

    lastComputeRef.current = Date.now();
    storeCompute();
  }, [storeCompute, storeUpdateMass]);

  /**
   * Schedules a debounced compute.
   */
  const scheduleCompute = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastCompute = now - lastComputeRef.current;

      if (timeSinceLastCompute < MIN_COMPUTE_INTERVAL_MS) {
        // Reschedule after remaining delay
        const delay = MIN_COMPUTE_INTERVAL_MS - timeSinceLastCompute;
        debounceTimerRef.current = setTimeout(flushAndCompute, delay);
        return;
      }

      flushAndCompute();
    }, debounceMs);
  }, [debounceMs, flushAndCompute]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Actions
  const loadScenario = useCallback(
    (preset: ScenarioPreset) => {
      setLocalResolution(null);
      setMassScaleLocal(1.0);
      setHasUnsavedChanges(false);
      // Clear base masses - they'll be captured on first scale change
      baseMassesRef.current.clear();
      storeLoadScenario(preset);
    },
    [storeLoadScenario]
  );

  const loadCustomConfig = useCallback(
    (config: CurvatureGridConfig) => {
      setLocalResolution(config.resolution);
      setMassScaleLocal(1.0);
      setHasUnsavedChanges(false);
      baseMassesRef.current.clear();
      storeLoadCustomConfig(config);
    },
    [storeLoadCustomConfig]
  );

  const setVisualizationMode = useCallback(
    (mode: VisualizationMode) => {
      storeSetVisualizationMode(mode);
    },
    [storeSetVisualizationMode]
  );

  const setResolution = useCallback(
    (resolution: number) => {
      const clamped = clampResolution(resolution);
      setLocalResolution(clamped);
      setHasUnsavedChanges(true);
      storeSetResolution(clamped);
      scheduleCompute();
    },
    [storeSetResolution, scheduleCompute]
  );

  const setMassScale = useCallback(
    (scale: number) => {
      const clampedScale = Math.max(
        MIN_MASS_SCALE,
        Math.min(MAX_MASS_SCALE, scale)
      );
      setMassScaleLocal(clampedScale);
      setHasUnsavedChanges(true);

      // Update all masses with the new scale using stored base masses
      // This prevents floating-point drift from repeated scale operations
      config.masses.forEach((mass) => {
        // Capture base mass on first scale change if not already stored
        if (!baseMassesRef.current.has(mass.id)) {
          baseMassesRef.current.set(mass.id, mass.mass);
        }
        const baseMass = baseMassesRef.current.get(mass.id) ?? mass.mass;
        pendingMassUpdatesRef.current.set(mass.id, {
          mass: baseMass * clampedScale,
        });
      });

      scheduleCompute();
    },
    [config.masses, scheduleCompute]
  );

  const updateMass = useCallback(
    (id: string, updates: Partial<Omit<MassSource, 'id'>>) => {
      // Batch updates
      const existing = pendingMassUpdatesRef.current.get(id) ?? {};
      pendingMassUpdatesRef.current.set(id, { ...existing, ...updates });
      setHasUnsavedChanges(true);
      scheduleCompute();
    },
    [scheduleCompute]
  );

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const resetCamera = useCallback(() => {
    onResetCamera?.();
  }, [onResetCamera]);

  const recompute = useCallback(() => {
    storeCompute();
  }, [storeCompute]);

  const reset = useCallback(() => {
    setLocalResolution(null);
    setMassScaleLocal(1.0);
    setIsPaused(false);
    setAutoRotate(false);
    setHasUnsavedChanges(false);
    pendingMassUpdatesRef.current.clear();
    baseMassesRef.current.clear();
    storeReset();
  }, [storeReset]);

  const setOrbitsEnabled = useCallback(
    (enabled: boolean) => {
      storeSetOrbitsEnabled(enabled);
    },
    [storeSetOrbitsEnabled]
  );

  const setTimeScale = useCallback(
    (scale: number) => {
      storeSetTimeScale(scale);
    },
    [storeSetTimeScale]
  );

  const advanceSimulationTime = useCallback(
    (deltaTime: number) => {
      storeAdvanceSimulationTime(deltaTime);
    },
    [storeAdvanceSimulationTime]
  );

  const resetSimulationTime = useCallback(() => {
    storeResetSimulationTime();
  }, [storeResetSimulationTime]);

  const state: UseSimulationState = {
    isComputing,
    error,
    resolutionWarning,
    isPaused,
    autoRotate,
    massScale,
    gridResolution: displayResolution,
    currentPreset,
    visualizationMode,
    config,
    hasUnsavedChanges,
    orbitsEnabled,
    simulationTime,
    timeScale,
    isUsingWorker,
    workerWarning,
  };

  const actions: UseSimulationActions = {
    loadScenario,
    loadCustomConfig,
    setVisualizationMode,
    setResolution,
    setMassScale,
    updateMass,
    togglePause,
    toggleAutoRotate,
    resetCamera,
    recompute,
    reset,
    setOrbitsEnabled,
    setTimeScale,
    advanceSimulationTime,
    resetSimulationTime,
  };

  return [state, actions];
}

export default useSimulation;
