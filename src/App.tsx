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

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  Sidebar,
  Footer,
  isWebGL2Supported,
  CanvasWrapper,
  SkipLink,
  LiveRegion,
  announceToScreenReader,
} from './components';
import { useSimulation } from './hooks';
import { useSimulationStore } from './state/simulation';
import {
  capturePng,
  captureVideo,
  getInitialExportState,
  ExportQueueManager,
  type ExportState,
} from './utils/export';
import './styles/layout.css';

// Singleton export queue manager
const exportQueue = new ExportQueueManager();

/**
 * Main application component
 * Renders the spacetime visualizer with sidebar controls and status footer
 */
function App() {
  // Check WebGL2 support once on mount
  const webglSupported = useMemo(() => isWebGL2Supported(), []);

  // Ref for camera reset function
  const resetCameraRef = useRef<(() => void) | null>(null);

  // Ref for canvas element (for exports)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Export state
  const [exportState, setExportState] = useState<ExportState>(
    getInitialExportState()
  );

  const handleResetCameraRef = useCallback((resetFn: () => void) => {
    resetCameraRef.current = resetFn;
  }, []);

  const handleResetCamera = useCallback(() => {
    resetCameraRef.current?.();
  }, []);

  const handleCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  // Export handlers
  const handleExportPng = useCallback(() => {
    if (!canvasRef.current) {
      console.error('Canvas not available for export');
      return;
    }

    exportQueue.enqueue(async () => {
      setExportState({
        isExporting: true,
        progress: 0,
        message: 'Starting export...',
        format: 'png',
        error: null,
      });

      const result = await capturePng(canvasRef.current!, {}, (progress, message) => {
        setExportState((prev) => ({
          ...prev,
          progress,
          message,
        }));
      });

      if (result.success) {
        setExportState({
          isExporting: false,
          progress: 100,
          message: `Saved: ${result.filename}`,
          format: 'png',
          error: null,
        });
        announceToScreenReader(`Screenshot exported: ${result.filename}`);
        // Clear success message after 3 seconds
        setTimeout(() => {
          setExportState((prevState) => {
            // Only clear the message if another export isn't in progress
            if (prevState.isExporting) {
              return prevState;
            }
            return getInitialExportState();
          });
        }, 3000);
      } else {
        setExportState({
          isExporting: false,
          progress: 0,
          message: '',
          format: 'png',
          error: result.error ?? 'Unknown error',
        });
        announceToScreenReader(`Screenshot export failed: ${result.error ?? 'Unknown error'}`);
      }
    });
  }, []);

  const handleExportVideo = useCallback((duration: number) => {
    if (!canvasRef.current) {
      console.error('Canvas not available for export');
      return;
    }

    exportQueue.enqueue(async () => {
      setExportState({
        isExporting: true,
        progress: 0,
        message: 'Initializing recording...',
        format: 'webm',
        error: null,
      });

      const result = await captureVideo(
        canvasRef.current!,
        { duration },
        (progress, message) => {
          setExportState((prev) => ({
            ...prev,
            progress,
            message,
          }));
        }
      );

      if (result.success) {
        setExportState({
          isExporting: false,
          progress: 100,
          message: `Saved: ${result.filename}`,
          format: 'webm',
          error: null,
        });
        announceToScreenReader(`Video exported: ${result.filename}`);
        // Clear success message after 3 seconds
        setTimeout(() => {
          setExportState((prevState) => {
            // Only clear the message if another export isn't in progress
            if (prevState.isExporting) {
              return prevState;
            }
            return getInitialExportState();
          });
        }, 3000);
      } else {
        setExportState({
          isExporting: false,
          progress: 0,
          message: '',
          format: 'webm',
          error: result.error ?? 'Unknown error',
        });
        announceToScreenReader(`Video export failed: ${result.error ?? 'Unknown error'}`);
      }
    });
  }, []);

  // Use simulation hook
  const [state, actions] = useSimulation(handleResetCamera);

  // Load default scenario on mount
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  useEffect(() => {
    loadScenario('single-mass');
  }, [loadScenario]);

  return (
    <div className="app-container">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <LiveRegion />
      {!webglSupported && (
        <div className="app-warning" role="alert">
          WebGL2 is not supported in your browser. The visualization may not
          work correctly.
        </div>
      )}
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Sidebar
          state={state}
          actions={actions}
          exportState={exportState}
          onExportPng={handleExportPng}
          onExportVideo={handleExportVideo}
        />
        <div
          className="canvas-container"
          role="img"
          aria-label="3D spacetime curvature visualization canvas"
        >
          {webglSupported && (
            <CanvasWrapper
              autoRotate={state.autoRotate}
              isPaused={state.isPaused}
              onResetCameraRef={handleResetCameraRef}
              onCanvasRef={handleCanvasRef}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
