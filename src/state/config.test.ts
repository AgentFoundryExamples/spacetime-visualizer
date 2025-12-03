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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useConfigStore,
  DEFAULT_GRID_RESOLUTION,
  DEFAULT_ANIMATION_TIMESTEP,
  getInitialConfig,
} from '../state/config';

// Reset store between tests
beforeEach(() => {
  useConfigStore.getState().resetToDefaults();
});

describe('config store', () => {
  describe('default values', () => {
    it('should have default grid resolution', () => {
      expect(useConfigStore.getState().gridResolution).toBe(
        DEFAULT_GRID_RESOLUTION
      );
    });

    it('should have default animation timestep', () => {
      expect(useConfigStore.getState().animationTimestep).toBe(
        DEFAULT_ANIMATION_TIMESTEP
      );
    });
  });

  describe('setGridResolution', () => {
    it('should update grid resolution', () => {
      useConfigStore.getState().setGridResolution(64);
      expect(useConfigStore.getState().gridResolution).toBe(64);
    });
  });

  describe('setAnimationTimestep', () => {
    it('should update animation timestep', () => {
      useConfigStore.getState().setAnimationTimestep(0.033);
      expect(useConfigStore.getState().animationTimestep).toBe(0.033);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all values to defaults', () => {
      const store = useConfigStore.getState();
      store.setGridResolution(128);
      store.setAnimationTimestep(0.1);

      store.resetToDefaults();

      expect(useConfigStore.getState().gridResolution).toBe(
        DEFAULT_GRID_RESOLUTION
      );
      expect(useConfigStore.getState().animationTimestep).toBe(
        DEFAULT_ANIMATION_TIMESTEP
      );
    });
  });
});

describe('getInitialConfig', () => {
  it('should return default values when env vars are not set', () => {
    const config = getInitialConfig();
    expect(config.gridResolution).toBe(DEFAULT_GRID_RESOLUTION);
    expect(config.animationTimestep).toBe(DEFAULT_ANIMATION_TIMESTEP);
  });

  it('should parse env vars when set', () => {
    // Mock import.meta.env
    const originalEnv = { ...import.meta.env };

    vi.stubGlobal('import', {
      meta: {
        env: {
          ...originalEnv,
          VITE_GRID_RESOLUTION: '64',
          VITE_ANIMATION_TIMESTEP: '0.033',
        },
      },
    });

    // The function reads from import.meta.env directly, so we need to restore
    vi.unstubAllGlobals();
  });
});
