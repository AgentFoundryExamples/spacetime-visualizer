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

import { SCENARIO_PRESETS, type ScenarioPreset } from '../state/simulation';
import type { UseSimulationState, UseSimulationActions } from '../hooks';
import '../styles/controls.css';

/**
 * Props for ControlsPanel component.
 */
export interface ControlsPanelProps {
  /** Current simulation state */
  state: UseSimulationState;
  /** Simulation action handlers */
  actions: UseSimulationActions;
}

/**
 * Controls panel component for simulation parameters.
 * Provides UI for adjusting mass, grid density, camera, and scenario selection.
 */
export function ControlsPanel({ state, actions }: ControlsPanelProps) {
  const {
    isComputing,
    error,
    resolutionWarning,
    isPaused,
    autoRotate,
    massScale,
    gridResolution,
    currentPreset,
  } = state;

  const {
    loadScenario,
    setResolution,
    setMassScale,
    togglePause,
    toggleAutoRotate,
    resetCamera,
    recompute,
    reset,
  } = actions;

  return (
    <div className="controls-panel">
      {/* Status indicators */}
      {isComputing && (
        <div className="computing-indicator">
          <div className="computing-spinner" />
          <span>Computing curvature...</span>
        </div>
      )}

      {error && <div className="control-error">{error}</div>}

      {resolutionWarning && (
        <div className="control-warning">{resolutionWarning}</div>
      )}

      {/* Scenario Selection */}
      <section className="control-section">
        <h3 className="control-section-title">Scenarios</h3>
        <div className="scenario-selector">
          {SCENARIO_PRESETS.map((scenario) => (
            <button
              key={scenario.id}
              className={`control-button scenario-button ${
                currentPreset === scenario.id ? 'scenario-button--selected' : ''
              }`}
              onClick={() => loadScenario(scenario.id as ScenarioPreset)}
              disabled={isComputing}
            >
              <span className="scenario-name">{scenario.name}</span>
              <span className="scenario-description">
                {scenario.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="control-divider" />

      {/* Parameters */}
      <section className="control-section">
        <h3 className="control-section-title">Parameters</h3>

        {/* Grid Resolution */}
        <div className="control-group">
          <label className="control-label">
            <span>Grid Resolution</span>
            <span className="control-value">{gridResolution}</span>
          </label>
          <input
            type="range"
            className="control-slider"
            min={8}
            max={128}
            step={8}
            value={gridResolution}
            onChange={(e) => setResolution(parseInt(e.target.value, 10))}
            disabled={isComputing}
          />
        </div>

        {/* Mass Scale */}
        <div className="control-group">
          <label className="control-label">
            <span>Mass Scale</span>
            <span className="control-value">{massScale.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            className="control-slider"
            min={0.1}
            max={5}
            step={0.1}
            value={massScale}
            onChange={(e) => setMassScale(parseFloat(e.target.value))}
            disabled={isComputing}
          />
        </div>
      </section>

      <div className="control-divider" />

      {/* Camera Controls */}
      <section className="control-section">
        <h3 className="control-section-title">Camera</h3>

        <div className="toggle-control">
          <span className="toggle-label">Auto-Rotate</span>
          <button
            className={`toggle-switch ${autoRotate ? 'toggle-switch--active' : ''}`}
            onClick={toggleAutoRotate}
            aria-pressed={autoRotate}
            aria-label="Toggle auto-rotate"
          />
        </div>

        <div className="button-group">
          <button
            className="control-button control-button--small"
            onClick={resetCamera}
          >
            Reset Camera
          </button>
        </div>
      </section>

      <div className="control-divider" />

      {/* Playback Controls */}
      <section className="control-section">
        <h3 className="control-section-title">Playback</h3>
        <div className="button-group">
          <button
            className={`control-button ${isPaused ? '' : 'control-button--active'}`}
            onClick={togglePause}
          >
            {isPaused ? '▶ Play' : '⏸ Pause'}
          </button>
          <button
            className="control-button"
            onClick={recompute}
            disabled={isComputing}
          >
            🔄 Refresh
          </button>
        </div>
      </section>

      <div className="control-divider" />

      {/* Reset */}
      <section className="control-section">
        <button
          className="control-button"
          onClick={reset}
          disabled={isComputing}
        >
          ↺ Reset All
        </button>
      </section>
    </div>
  );
}
