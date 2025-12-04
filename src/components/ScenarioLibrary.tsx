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

import { useState, useCallback } from 'react';
import type { ScenarioPreset } from '../physics/scenarios';
import { SCENARIO_PRESETS } from '../physics/scenarios';
import type { CurvatureGridConfig } from '../physics/types';
import { SCENARIO_STRINGS, UI_STRINGS } from '../content/strings';
import '../styles/panels.css';

/**
 * Custom preset stored in local storage.
 */
export interface CustomPreset {
  id: string;
  name: string;
  config: CurvatureGridConfig;
  createdAt: number;
}

/**
 * Local storage key for custom presets.
 */
const STORAGE_KEY = 'spacetime-visualizer-presets';

/**
 * Checks if local storage is available.
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a parsed preset has the expected structure.
 */
function isValidPreset(preset: unknown): preset is CustomPreset {
  if (typeof preset !== 'object' || preset === null) return false;
  const p = preset as Record<string, unknown>;
  
  // Validate required fields
  if (typeof p.id !== 'string' || !p.id) return false;
  if (typeof p.name !== 'string' || !p.name) return false;
  if (typeof p.createdAt !== 'number') return false;
  
  // Validate config object
  if (typeof p.config !== 'object' || p.config === null) return false;
  const config = p.config as Record<string, unknown>;
  
  // Validate config structure
  if (typeof config.resolution !== 'number') return false;
  if (!Array.isArray(config.bounds) || config.bounds.length !== 6) return false;
  if (!Array.isArray(config.masses)) return false;
  
  // Validate bounds are all numbers
  if (!config.bounds.every((b: unknown) => typeof b === 'number')) return false;
  
  // Validate each mass has required structure
  for (const mass of config.masses) {
    if (typeof mass !== 'object' || mass === null) return false;
    const m = mass as Record<string, unknown>;
    if (typeof m.id !== 'string') return false;
    if (typeof m.mass !== 'number') return false;
    if (!Array.isArray(m.position) || m.position.length !== 3) return false;
    if (!m.position.every((p: unknown) => typeof p === 'number')) return false;
  }
  
  return true;
}

/**
 * Loads custom presets from local storage.
 */
function loadCustomPresets(): CustomPreset[] {
  if (!isStorageAvailable()) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Validate array structure
    if (!Array.isArray(parsed)) {
      console.warn('Invalid preset data structure in localStorage');
      return [];
    }
    
    // Filter and validate each preset
    const validPresets = parsed.filter((preset: unknown) => {
      if (!isValidPreset(preset)) {
        console.warn('Skipping invalid preset in localStorage');
        return false;
      }
      return true;
    });
    
    return validPresets;
  } catch {
    console.warn('Failed to load custom presets from local storage');
    return [];
  }
}

/**
 * Saves custom presets to local storage.
 */
function saveCustomPresets(presets: CustomPreset[]): boolean {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch {
    console.warn('Failed to save custom presets to local storage');
    return false;
  }
}

/**
 * Props for ScenarioLibrary component.
 */
export interface ScenarioLibraryProps {
  /** Currently selected preset (null for custom) */
  currentPreset: ScenarioPreset | string | null;
  /** Current configuration for saving */
  currentConfig: CurvatureGridConfig;
  /** Whether configuration has been modified */
  hasUnsavedChanges: boolean;
  /** Callback when a built-in preset is selected */
  onSelectPreset: (preset: ScenarioPreset) => void;
  /** Callback when a custom preset is loaded */
  onLoadCustomPreset: (config: CurvatureGridConfig) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
}

/**
 * Scenario library component for managing presets.
 * Displays built-in presets and manages custom preset save/load.
 */
export function ScenarioLibrary({
  currentPreset,
  currentConfig,
  hasUnsavedChanges,
  onSelectPreset,
  onLoadCustomPreset,
  disabled = false,
}: ScenarioLibraryProps) {
  // Initialize storage availability synchronously
  const [storageAvailable] = useState(() => isStorageAvailable());
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() =>
    isStorageAvailable() ? loadCustomPresets() : []
  );
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<CurvatureGridConfig | null>(null);

  const handleSaveCustom = useCallback(() => {
    const name = prompt(UI_STRINGS.scenarioSavePrompt);
    if (!name || !name.trim()) return;

    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      config: { ...currentConfig },
      createdAt: Date.now(),
    };

    const updated = [...customPresets, newPreset];
    if (saveCustomPresets(updated)) {
      setCustomPresets(updated);
    }
  }, [currentConfig, customPresets]);

  const handleDeleteCustom = useCallback(
    (presetId: string) => {
      if (!confirm(UI_STRINGS.scenarioDeleteConfirm)) return;

      const updated = customPresets.filter((p) => p.id !== presetId);
      if (saveCustomPresets(updated)) {
        setCustomPresets(updated);
      }
    },
    [customPresets]
  );

  const handleLoadCustom = useCallback(
    (config: CurvatureGridConfig) => {
      if (hasUnsavedChanges) {
        setShowOverwriteWarning(true);
        setPendingLoad(config);
        return;
      }
      onLoadCustomPreset(config);
    },
    [hasUnsavedChanges, onLoadCustomPreset]
  );

  const handleConfirmLoad = useCallback(() => {
    if (pendingLoad) {
      onLoadCustomPreset(pendingLoad);
    }
    setShowOverwriteWarning(false);
    setPendingLoad(null);
  }, [pendingLoad, onLoadCustomPreset]);

  const handleCancelLoad = useCallback(() => {
    setShowOverwriteWarning(false);
    setPendingLoad(null);
  }, []);

  const handleSelectBuiltIn = useCallback(
    (preset: ScenarioPreset) => {
      if (hasUnsavedChanges) {
        if (!confirm(UI_STRINGS.scenarioOverwriteWarning)) return;
      }
      onSelectPreset(preset);
    },
    [hasUnsavedChanges, onSelectPreset]
  );

  return (
    <div className="scenario-library" role="region" aria-label="Scenario selection">
      {!storageAvailable && (
        <div className="scenario-library__warning" role="alert">
          {UI_STRINGS.scenarioStorageUnavailable}
        </div>
      )}

      {showOverwriteWarning && (
        <div className="scenario-library__warning" role="alertdialog" aria-labelledby="overwrite-warning">
          <p id="overwrite-warning">{UI_STRINGS.scenarioOverwriteWarning}</p>
          <div className="scenario-library__actions">
            <button
              className="scenario-library__action-btn"
              onClick={handleConfirmLoad}
              aria-label="Confirm loading preset and discard changes"
            >
              Continue
            </button>
            <button
              className="scenario-library__action-btn"
              onClick={handleCancelLoad}
              aria-label="Cancel and keep current changes"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Built-in presets */}
      <div className="scenario-library__section" role="group" aria-labelledby="builtin-presets-title">
        <h4 id="builtin-presets-title" className="scenario-library__section-title">
          {UI_STRINGS.scenarioBuiltInLabel}
        </h4>
        <div className="scenario-library__list" role="listbox" aria-label="Built-in scenario presets">
          {SCENARIO_PRESETS.map((preset) => {
            const strings = SCENARIO_STRINGS[preset.id];
            const isSelected = currentPreset === preset.id;

            return (
              <div key={preset.id} className="scenario-library__item" role="option" aria-selected={isSelected}>
                <button
                  className={`scenario-library__item-button ${
                    isSelected ? 'scenario-library__item-button--selected' : ''
                  }`}
                  onClick={() => handleSelectBuiltIn(preset.id)}
                  disabled={disabled}
                  aria-label={`${strings?.name ?? preset.name}: ${strings?.description ?? preset.description}`}
                  aria-pressed={isSelected}
                >
                  <span className="scenario-library__item-name">
                    {strings?.name ?? preset.name}
                  </span>
                  <span className="scenario-library__item-description">
                    {strings?.description ?? preset.description}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom presets */}
      {storageAvailable && (
        <div className="scenario-library__section" role="group" aria-labelledby="custom-presets-title">
          <h4 id="custom-presets-title" className="scenario-library__section-title">
            {UI_STRINGS.scenarioCustomLabel}
          </h4>
          {customPresets.length === 0 ? (
            <p className="scenario-library__empty">No custom presets saved.</p>
          ) : (
            <div className="scenario-library__list" role="listbox" aria-label="Custom scenario presets">
              {customPresets.map((preset) => {
                const isSelected = currentPreset === preset.id;
                const massCount = preset.config.masses.length;
                const massText = `${massCount} mass${massCount !== 1 ? 'es' : ''}`;

                return (
                  <div key={preset.id} className="scenario-library__item" role="option" aria-selected={isSelected}>
                    <button
                      className={`scenario-library__item-button ${
                        isSelected
                          ? 'scenario-library__item-button--selected'
                          : ''
                      }`}
                      onClick={() => handleLoadCustom(preset.config)}
                      disabled={disabled}
                      aria-label={`${preset.name}: ${massText}`}
                      aria-pressed={isSelected}
                    >
                      <span className="scenario-library__item-name">
                        {preset.name}
                      </span>
                      <span className="scenario-library__item-description">
                        {massText}
                      </span>
                    </button>
                    <button
                      className="scenario-library__delete-btn"
                      onClick={() => handleDeleteCustom(preset.id)}
                      disabled={disabled}
                      title={UI_STRINGS.scenarioDeleteCustom}
                      aria-label={`Delete custom preset ${preset.name}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save button */}
          <div className="scenario-library__actions">
            <button
              className="scenario-library__action-btn"
              onClick={handleSaveCustom}
              disabled={disabled || currentConfig.masses.length === 0}
              aria-label="Save current configuration as a custom preset"
            >
              {UI_STRINGS.scenarioSaveCustom}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScenarioLibrary;
