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

import { useMemo } from 'react';
import {
  ThreeCanvas,
  Sidebar,
  Footer,
  isWebGL2Supported,
} from './components';
import './styles/layout.css';

/**
 * Main application component
 * Renders the spacetime visualizer with sidebar controls and status footer
 */
function App() {
  // Check WebGL2 support once on mount - this is a synchronous check
  // so we use useMemo to avoid recalculating on every render
  const webglSupported = useMemo(() => isWebGL2Supported(), []);

  return (
    <div className="app-container">
      {!webglSupported && (
        <div className="app-warning" role="alert">
          WebGL2 is not supported in your browser. The visualization may not
          work correctly.
        </div>
      )}
      <main className="app-main">
        <Sidebar />
        <div className="canvas-container">
          {webglSupported && <ThreeCanvas />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
