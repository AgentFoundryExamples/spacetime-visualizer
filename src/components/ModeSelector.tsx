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

import type { VisualizationMode } from '../content/strings';
import { MODE_STRINGS, UI_STRINGS } from '../content/strings';
import '../styles/panels.css';

/**
 * Available visualization modes in display order.
 */
const MODES: VisualizationMode[] = ['mesh', 'contour', 'fieldLines'];

/**
 * Props for ModeSelector component.
 */
export interface ModeSelectorProps {
  /** Currently selected mode */
  currentMode: VisualizationMode;
  /** Callback when mode is changed */
  onModeChange: (mode: VisualizationMode) => void;
  /** Whether mode changing is disabled */
  disabled?: boolean;
}

/**
 * Mode selector component for switching between visualization modes.
 * Displays available modes as radio buttons with descriptions.
 */
export function ModeSelector({
  currentMode,
  onModeChange,
  disabled = false,
}: ModeSelectorProps) {
  return (
    <div
      className="mode-selector"
      role="radiogroup"
      aria-label={UI_STRINGS.modeSelectLabel}
    >
      {MODES.map((mode) => {
        const strings = MODE_STRINGS[mode];
        const isSelected = mode === currentMode;

        return (
          <label
            key={mode}
            className={`mode-option ${isSelected ? 'mode-option--selected' : ''}`}
          >
            <input
              type="radio"
              className="mode-option__radio"
              name="visualization-mode"
              value={mode}
              checked={isSelected}
              onChange={() => onModeChange(mode)}
              disabled={disabled}
            />
            <div className="mode-option__content">
              <span className="mode-option__name">{strings.name}</span>
              <span className="mode-option__description">
                {strings.description}
              </span>
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default ModeSelector;
