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

import type { ScenarioPreset } from '../state/simulation';
import type { UseSimulationState, UseSimulationActions } from '../hooks';
import { ModeSelector } from './ModeSelector';
import { ScenarioLibrary } from './ScenarioLibrary';
import { EducationPanel } from './EducationPanel';
import { UI_STRINGS } from '../content/strings';
import '../styles/controls.css';
import '../styles/panels.css';

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
    visualizationMode,
    config,
    hasUnsavedChanges,
    orbitsEnabled,
    simulationTime,
  } = state;

  const {
    loadScenario,
    loadCustomConfig,
    setVisualizationMode,
    setResolution,
    setMassScale,
    togglePause,
    toggleAutoRotate,
    resetCamera,
    recompute,
    reset,
    setOrbitsEnabled,
    resetSimulationTime,
  } = actions;

  // Check if any masses have orbital parameters defined
  const hasOrbitalMasses = config.masses.some((m) => m.orbit !== undefined);

  return (
    <div className="controls-panel">
      {/* Status indicators */}
      {isComputing && (
        <div className="computing-indicator">
          <div className="computing-spinner" />
          <span>{UI_STRINGS.statusComputing}</span>
        </div>
      )}

      {error && <div className="control-error">{error}</div>}

      {resolutionWarning && (
        <div className="control-warning">{resolutionWarning}</div>
      )}

      {/* Visualization Mode Selection */}
      <section className="control-section">
        <h3 className="control-section-title">{UI_STRINGS.sectionModes}</h3>
        <ModeSelector
          currentMode={visualizationMode}
          onModeChange={setVisualizationMode}
          disabled={isComputing}
        />
      </section>

      <div className="control-divider" />

      {/* Scenario Selection */}
      <section className="control-section">
        <h3 className="control-section-title">{UI_STRINGS.sectionScenarios}</h3>
        <ScenarioLibrary
          currentPreset={currentPreset}
          currentConfig={config}
          hasUnsavedChanges={hasUnsavedChanges}
          onSelectPreset={(preset) => loadScenario(preset as ScenarioPreset)}
          onLoadCustomPreset={loadCustomConfig}
          disabled={isComputing}
        />
      </section>

      <div className="control-divider" />

      {/* Parameters */}
      <section className="control-section">
        <h3 className="control-section-title">{UI_STRINGS.sectionParameters}</h3>

        {/* Grid Resolution */}
        <div className="control-group">
          <label className="control-label">
            <span>{UI_STRINGS.paramGridResolution}</span>
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
            <span>{UI_STRINGS.paramMassScale}</span>
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

      {/* Orbital Motion Controls */}
      <section className="control-section">
        <h3 className="control-section-title">{UI_STRINGS.sectionOrbits}</h3>

        <div className="toggle-control">
          <span className="toggle-label">{UI_STRINGS.orbitEnable}</span>
          <button
            className={`toggle-switch ${orbitsEnabled ? 'toggle-switch--active' : ''}`}
            onClick={() => setOrbitsEnabled(!orbitsEnabled)}
            aria-pressed={orbitsEnabled}
            aria-label="Toggle orbital motion"
            disabled={!hasOrbitalMasses}
          />
        </div>

        {orbitsEnabled && (
          <>
            <div className="control-group">
              <label className="control-label">
                <span>{UI_STRINGS.orbitTimeLabel}</span>
                <span className="control-value">{simulationTime.toFixed(2)}s</span>
              </label>
            </div>
            <div className="button-group">
              <button
                className="control-button control-button--small"
                onClick={resetSimulationTime}
              >
                {UI_STRINGS.orbitResetTime}
              </button>
            </div>
          </>
        )}

        {!hasOrbitalMasses && (
          <p className="control-hint">{UI_STRINGS.orbitHint}</p>
        )}
      </section>

      <div className="control-divider" />

      {/* Camera Controls */}
      <section className="control-section">
        <h3 className="control-section-title">{UI_STRINGS.sectionCamera}</h3>

        <div className="toggle-control">
          <span className="toggle-label">{UI_STRINGS.cameraAutoRotate}</span>
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
            {UI_STRINGS.cameraReset}
          </button>
        </div>
      </section>

      <div className="control-divider" />

      {/* Playback Controls */}
      <section className="control-section">
        <h3 className="control-section-title">{UI_STRINGS.sectionPlayback}</h3>
        <div className="button-group">
          <button
            className={`control-button ${isPaused ? '' : 'control-button--active'}`}
            onClick={togglePause}
          >
            {isPaused ? UI_STRINGS.playbackPlay : UI_STRINGS.playbackPause}
          </button>
          <button
            className="control-button"
            onClick={recompute}
            disabled={isComputing}
          >
            {UI_STRINGS.playbackRefresh}
          </button>
        </div>
      </section>

      <div className="control-divider" />

      {/* Education Panel */}
      <section className="control-section">
        <h3 className="control-section-title">{UI_STRINGS.sectionEducation}</h3>
        <EducationPanel
          currentMode={visualizationMode}
          currentScenario={currentPreset}
          defaultCollapsed={true}
        />
      </section>

      <div className="control-divider" />

      {/* Reset */}
      <section className="control-section">
        <button
          className="control-button"
          onClick={reset}
          disabled={isComputing}
        >
          {UI_STRINGS.playbackReset}
        </button>
      </section>
    </div>
  );
}
