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

import { ControlsPanel } from './ControlsPanel';
import type { UseSimulationState, UseSimulationActions } from '../hooks';
import type { ExportState } from '../utils/export';

/**
 * Props for Sidebar component.
 */
export interface SidebarProps {
  /** Simulation state from useSimulation hook */
  state?: UseSimulationState;
  /** Simulation actions from useSimulation hook */
  actions?: UseSimulationActions;
  /** Export state for tracking export progress */
  exportState?: ExportState;
  /** Handler for PNG screenshot export */
  onExportPng?: () => void;
  /** Handler for video recording export */
  onExportVideo?: (duration: number) => void;
}

/**
 * Sidebar component providing UI for simulation controls.
 */
export function Sidebar({
  state,
  actions,
  exportState,
  onExportPng,
  onExportVideo,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2 className="sidebar-title">Controls</h2>
      </header>
      <div className="sidebar-content">
        {state && actions ? (
          <ControlsPanel
            state={state}
            actions={actions}
            exportState={exportState}
            onExportPng={onExportPng}
            onExportVideo={onExportVideo}
          />
        ) : (
          <p className="sidebar-placeholder">
            Simulation controls will appear here.
          </p>
        )}
      </div>
    </aside>
  );
}
