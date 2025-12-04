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

import { useState } from 'react';
import type { ScenarioPreset } from '../state/simulation';
import type { UseSimulationState, UseSimulationActions } from '../hooks';
import { ModeSelector } from './ModeSelector';
import { ScenarioLibrary } from './ScenarioLibrary';
import { EducationPanel } from './EducationPanel';
import { UI_STRINGS } from '../content/strings';
import type { ExportState } from '../utils/export';
import {
  isVideoExportSupported,
  DEFAULT_VIDEO_DURATION,
  MAX_VIDEO_DURATION,
} from '../utils/export';
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
  /** Export state for tracking export progress */
  exportState?: ExportState;
  /** Handler for PNG screenshot export */
  onExportPng?: () => void;
  /** Handler for video recording export */
  onExportVideo?: (duration: number) => void;
}

/**
 * Controls panel component for simulation parameters.
 * Provides UI for adjusting mass, grid density, camera, and scenario selection.
 */
export function ControlsPanel({
  state,
  actions,
  exportState,
  onExportPng,
  onExportVideo,
}: ControlsPanelProps) {
  const [videoDuration, setVideoDuration] = useState(DEFAULT_VIDEO_DURATION);

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
    waveParams,
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
    setWaveParams,
  } = actions;

  // Check if any masses have orbital parameters defined
  const hasOrbitalMasses = config.masses.some((m) => m.orbit !== undefined);

  // Check if wave controls should be shown
  const isWaveMode = visualizationMode === 'gravitationalWaves';

  return (
    <div className="controls-panel" role="region" aria-label="Simulation controls" aria-busy={isComputing}>
      {/* Status indicators */}
      {isComputing && (
        <div className="computing-indicator" role="status" aria-live="polite" aria-busy="true">
          <div className="computing-spinner" aria-hidden="true" />
          <span>{UI_STRINGS.statusComputing}</span>
        </div>
      )}

      {error && <div className="control-error" role="alert">{error}</div>}

      {resolutionWarning && (
        <div className="control-warning" role="status" aria-live="polite">{resolutionWarning}</div>
      )}

      {/* Visualization Mode Selection */}
      <section className="control-section" aria-labelledby="modes-heading">
        <h3 id="modes-heading" className="control-section-title">{UI_STRINGS.sectionModes}</h3>
        <ModeSelector
          currentMode={visualizationMode}
          onModeChange={setVisualizationMode}
          disabled={isComputing}
        />
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Scenario Selection */}
      <section className="control-section" aria-labelledby="scenarios-heading">
        <h3 id="scenarios-heading" className="control-section-title">{UI_STRINGS.sectionScenarios}</h3>
        <ScenarioLibrary
          currentPreset={currentPreset}
          currentConfig={config}
          hasUnsavedChanges={hasUnsavedChanges}
          onSelectPreset={(preset) => loadScenario(preset as ScenarioPreset)}
          onLoadCustomPreset={loadCustomConfig}
          disabled={isComputing}
        />
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Parameters */}
      <section className="control-section" aria-labelledby="params-heading">
        <h3 id="params-heading" className="control-section-title">{UI_STRINGS.sectionParameters}</h3>

        {/* Grid Resolution */}
        <div className="control-group">
          <label className="control-label" id="grid-resolution-label">
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
            aria-labelledby="grid-resolution-label"
            aria-valuemin={8}
            aria-valuemax={128}
            aria-valuenow={gridResolution}
            aria-valuetext={`${gridResolution} cells`}
          />
        </div>

        {/* Mass Scale */}
        <div className="control-group">
          <label className="control-label" id="mass-scale-label">
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
            aria-labelledby="mass-scale-label"
            aria-valuemin={0.1}
            aria-valuemax={5}
            aria-valuenow={massScale}
            aria-valuetext={`${massScale.toFixed(1)} times`}
          />
        </div>
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Wave Settings Controls (only shown in gravitational waves mode) */}
      {isWaveMode && (
        <>
          <section className="control-section" aria-labelledby="waves-heading">
            <h3 id="waves-heading" className="control-section-title">{UI_STRINGS.sectionWaves}</h3>

            <div className="toggle-control">
              <span className="toggle-label" id="wave-toggle-label">{UI_STRINGS.waveEnable}</span>
              <button
                className={`toggle-switch ${waveParams.enabled ? 'toggle-switch--active' : ''}`}
                onClick={() => setWaveParams({ enabled: !waveParams.enabled })}
                aria-pressed={waveParams.enabled}
                aria-labelledby="wave-toggle-label"
              />
            </div>

            {waveParams.enabled && (
              <>
                {/* Wave Amplitude */}
                <div className="control-group">
                  <label className="control-label" id="wave-amplitude-label">
                    <span>{UI_STRINGS.waveAmplitude}</span>
                    <span className="control-value">{waveParams.amplitude.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    className="control-slider"
                    min={0.1}
                    max={2}
                    step={0.1}
                    value={waveParams.amplitude}
                    onChange={(e) => setWaveParams({ amplitude: parseFloat(e.target.value) })}
                    disabled={isComputing}
                    aria-labelledby="wave-amplitude-label"
                    aria-valuemin={0.1}
                    aria-valuemax={2}
                    aria-valuenow={waveParams.amplitude}
                    aria-valuetext={`${waveParams.amplitude.toFixed(1)}`}
                  />
                </div>

                {/* Wave Frequency */}
                <div className="control-group">
                  <label className="control-label" id="wave-frequency-label">
                    <span>{UI_STRINGS.waveFrequency}</span>
                    <span className="control-value">{waveParams.frequency.toFixed(1)} Hz</span>
                  </label>
                  <input
                    type="range"
                    className="control-slider"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={waveParams.frequency}
                    onChange={(e) => setWaveParams({ frequency: parseFloat(e.target.value) })}
                    disabled={isComputing}
                    aria-labelledby="wave-frequency-label"
                    aria-valuemin={0.1}
                    aria-valuemax={10}
                    aria-valuenow={waveParams.frequency}
                    aria-valuetext={`${waveParams.frequency.toFixed(1)} Hertz`}
                  />
                </div>
              </>
            )}
          </section>

          <div className="control-divider" aria-hidden="true" />
        </>
      )}

      {/* Orbital Motion Controls */}
      <section className="control-section" aria-labelledby="orbits-heading">
        <h3 id="orbits-heading" className="control-section-title">{UI_STRINGS.sectionOrbits}</h3>

        <div className="toggle-control">
          <span className="toggle-label" id="orbit-toggle-label">{UI_STRINGS.orbitEnable}</span>
          <button
            className={`toggle-switch ${orbitsEnabled ? 'toggle-switch--active' : ''}`}
            onClick={() => setOrbitsEnabled(!orbitsEnabled)}
            aria-pressed={orbitsEnabled}
            aria-labelledby="orbit-toggle-label"
            aria-describedby={!hasOrbitalMasses ? 'orbit-hint' : undefined}
            disabled={!hasOrbitalMasses}
          />
        </div>

        {orbitsEnabled && (
          <>
            <div className="control-group">
              <label className="control-label">
                <span>{UI_STRINGS.orbitTimeLabel}</span>
                <span className="control-value" aria-live="polite">{simulationTime.toFixed(2)}s</span>
              </label>
            </div>
            <div className="button-group">
              <button
                className="control-button control-button--small"
                onClick={resetSimulationTime}
                aria-label="Reset simulation time to zero"
              >
                {UI_STRINGS.orbitResetTime}
              </button>
            </div>
          </>
        )}

        {!hasOrbitalMasses && (
          <p id="orbit-hint" className="control-hint">{UI_STRINGS.orbitHint}</p>
        )}
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Camera Controls */}
      <section className="control-section" aria-labelledby="camera-heading">
        <h3 id="camera-heading" className="control-section-title">{UI_STRINGS.sectionCamera}</h3>

        <div className="toggle-control">
          <span className="toggle-label" id="autorotate-toggle-label">{UI_STRINGS.cameraAutoRotate}</span>
          <button
            className={`toggle-switch ${autoRotate ? 'toggle-switch--active' : ''}`}
            onClick={toggleAutoRotate}
            aria-pressed={autoRotate}
            aria-labelledby="autorotate-toggle-label"
          />
        </div>

        <div className="button-group">
          <button
            className="control-button control-button--small"
            onClick={resetCamera}
            aria-label="Reset camera to default position"
          >
            {UI_STRINGS.cameraReset}
          </button>
        </div>
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Playback Controls */}
      <section className="control-section" aria-labelledby="playback-heading">
        <h3 id="playback-heading" className="control-section-title">{UI_STRINGS.sectionPlayback}</h3>
        <div className="button-group" role="group" aria-label="Playback controls">
          <button
            className={`control-button ${isPaused ? '' : 'control-button--active'}`}
            onClick={togglePause}
            aria-pressed={!isPaused}
            aria-label={isPaused ? 'Play animation' : 'Pause animation'}
          >
            {isPaused ? UI_STRINGS.playbackPlay : UI_STRINGS.playbackPause}
          </button>
          <button
            className="control-button"
            onClick={recompute}
            disabled={isComputing}
            aria-label="Refresh and recompute curvature"
          >
            {UI_STRINGS.playbackRefresh}
          </button>
        </div>
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Export Controls */}
      <section className="control-section" aria-labelledby="export-heading">
        <h3 id="export-heading" className="control-section-title">{UI_STRINGS.sectionExport}</h3>

        {/* Export Progress */}
        {exportState?.isExporting && (
          <div className="export-progress" role="status" aria-live="polite">
            <div
              className="export-progress-bar"
              role="progressbar"
              aria-valuenow={exportState.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Export progress"
            >
              <div
                className="export-progress-fill"
                style={{ width: `${exportState.progress}%` }}
              />
            </div>
            <span className="export-progress-text">{exportState.message}</span>
          </div>
        )}

        {/* Export Success */}
        {!exportState?.isExporting && exportState?.progress === 100 && !exportState?.error && (
          <div className="export-success" role="status">{UI_STRINGS.exportSuccess}</div>
        )}

        {/* Export Error */}
        {!exportState?.isExporting && exportState?.error && (
          <div className="control-error" role="alert">{exportState.error}</div>
        )}

        {/* Screenshot Button */}
        <div className="button-group">
          <button
            className="control-button"
            onClick={onExportPng}
            disabled={isComputing || exportState?.isExporting}
            aria-label="Take screenshot and download as PNG image"
          >
            {UI_STRINGS.exportScreenshot}
          </button>
        </div>

        {/* Video Recording */}
        {isVideoExportSupported() ? (
          <>
            <div className="control-group">
              <label className="control-label" id="video-duration-label">
                <span>{UI_STRINGS.exportDuration}</span>
                <span className="control-value">
                  {videoDuration}
                  {UI_STRINGS.exportDurationUnit}
                </span>
              </label>
              <input
                type="range"
                className="control-slider"
                min={1}
                max={MAX_VIDEO_DURATION}
                step={1}
                value={videoDuration}
                onChange={(e) => setVideoDuration(parseInt(e.target.value, 10))}
                disabled={exportState?.isExporting}
                aria-labelledby="video-duration-label"
                aria-valuemin={1}
                aria-valuemax={MAX_VIDEO_DURATION}
                aria-valuenow={videoDuration}
                aria-valuetext={`${videoDuration} seconds`}
              />
            </div>
            <div className="button-group">
              <button
                className="control-button"
                onClick={() => onExportVideo?.(videoDuration)}
                disabled={isComputing || exportState?.isExporting}
                aria-label={`Record ${videoDuration} second video and download as WebM`}
              >
                {exportState?.isExporting && exportState.format === 'webm'
                  ? UI_STRINGS.exportRecording
                  : UI_STRINGS.exportVideo}
              </button>
            </div>
          </>
        ) : (
          <p className="control-hint">{UI_STRINGS.exportVideoUnsupported}</p>
        )}
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Education Panel */}
      <section className="control-section" aria-labelledby="education-heading">
        <h3 id="education-heading" className="control-section-title">{UI_STRINGS.sectionEducation}</h3>
        <EducationPanel
          currentMode={visualizationMode}
          currentScenario={currentPreset}
          defaultCollapsed={true}
        />
      </section>

      <div className="control-divider" aria-hidden="true" />

      {/* Reset */}
      <section className="control-section" aria-label="Reset simulation">
        <button
          className="control-button"
          onClick={reset}
          disabled={isComputing}
          aria-label="Reset all settings to initial state"
        >
          {UI_STRINGS.playbackReset}
        </button>
      </section>
    </div>
  );
}
