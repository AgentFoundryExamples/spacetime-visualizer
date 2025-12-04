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
        });
        // Clear success message after 3 seconds
        setTimeout(() => {
          setExportState(getInitialExportState());
        }, 3000);
      } else {
        setExportState({
          isExporting: false,
          progress: 0,
          message: `Error: ${result.error}`,
          format: 'png',
        });
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
        });
        // Clear success message after 3 seconds
        setTimeout(() => {
          setExportState(getInitialExportState());
        }, 3000);
      } else {
        setExportState({
          isExporting: false,
          progress: 0,
          message: `Error: ${result.error}`,
          format: 'webm',
        });
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
      {!webglSupported && (
        <div className="app-warning" role="alert">
          WebGL2 is not supported in your browser. The visualization may not
          work correctly.
        </div>
      )}
      <main className="app-main">
        <Sidebar
          state={state}
          actions={actions}
          exportState={exportState}
          onExportPng={handleExportPng}
          onExportVideo={handleExportVideo}
        />
        <div className="canvas-container">
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
