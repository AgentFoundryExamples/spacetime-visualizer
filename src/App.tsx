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

import { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Sidebar,
  Footer,
  isWebGL2Supported,
  CanvasWrapper,
} from './components';
import { useSimulation } from './hooks';
import { useSimulationStore } from './state/simulation';
import './styles/layout.css';

/**
 * Main application component
 * Renders the spacetime visualizer with sidebar controls and status footer
 */
function App() {
  // Check WebGL2 support once on mount
  const webglSupported = useMemo(() => isWebGL2Supported(), []);

  // Ref for camera reset function
  const resetCameraRef = useRef<(() => void) | null>(null);

  const handleResetCameraRef = useCallback((resetFn: () => void) => {
    resetCameraRef.current = resetFn;
  }, []);

  const handleResetCamera = useCallback(() => {
    resetCameraRef.current?.();
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
        <Sidebar state={state} actions={actions} />
        <div className="canvas-container">
          {webglSupported && (
            <CanvasWrapper
              autoRotate={state.autoRotate}
              isPaused={state.isPaused}
              onResetCameraRef={handleResetCameraRef}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
