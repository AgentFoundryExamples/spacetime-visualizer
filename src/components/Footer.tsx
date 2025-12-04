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

import { useConfigStore } from '../state/config';

/**
 * Footer component displaying status and configuration info
 */
export function Footer() {
  const { gridResolution, animationTimestep } = useConfigStore();

  return (
    <footer className="footer" role="contentinfo" aria-label="Application status">
      <span className="footer-status" role="status">Ready</span>
      <span className="footer-divider" aria-hidden="true" />
      <span className="footer-config" aria-label={`Configuration: Grid ${gridResolution} by ${gridResolution}, Timestep ${animationTimestep.toFixed(3)} seconds`}>
        Grid: {gridResolution}×{gridResolution} | Timestep:{' '}
        {animationTimestep.toFixed(3)}s
      </span>
    </footer>
  );
}
