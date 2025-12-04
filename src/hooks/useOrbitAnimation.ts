// Copyright 2025 John Brosnihan
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Hook for animating orbital motion.
 * Automatically advances simulation time when orbits are enabled and time scale is non-zero.
 */

import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../state/simulation';

/**
 * Maximum frame time to prevent large jumps after tab switches or long pauses.
 */
const MAX_FRAME_TIME = 0.1;

/**
 * Flag to track if an animation loop is currently active.
 * Prevents multiple concurrent loops from starting during rapid state changes.
 */
let isAnimationLoopActive = false;

/**
 * Hook that animates orbital motion by advancing simulation time each frame.
 *
 * This hook manages a requestAnimationFrame loop that:
 * 1. Runs only when orbitsEnabled is true and timeScale is non-zero
 * 2. Uses clamped delta time to prevent position jumps on slow devices
 * 3. Properly cleans up on unmount
 *
 * @example
 * ```tsx
 * function OrbitingScene() {
 *   useOrbitAnimation();
 *   return <SpacetimeVisualization />;
 * }
 * ```
 */
export function useOrbitAnimation(): void {
  const orbitsEnabled = useSimulationStore((state) => state.orbitsEnabled);
  const timeScale = useSimulationStore((state) => state.timeScale);
  const advanceSimulationTime = useSimulationStore((state) => state.advanceSimulationTime);

  const lastTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Only run animation when orbits are enabled and time scale is non-zero
    if (!orbitsEnabled || timeScale === 0) {
      // Reset lastTimeRef when animation stops so next start has fresh timing
      lastTimeRef.current = null;
      return;
    }

    // Prevent multiple concurrent animation loops during rapid state changes
    if (isAnimationLoopActive) {
      return;
    }
    isAnimationLoopActive = true;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current !== null) {
        // Calculate delta time in seconds
        const rawDelta = (currentTime - lastTimeRef.current) / 1000;

        // Clamp delta time to prevent large jumps after tab switches or pauses
        const deltaTime = Math.min(rawDelta, MAX_FRAME_TIME);

        // Only advance if we have a reasonable delta (skip first frame)
        if (deltaTime > 0) {
          advanceSimulationTime(deltaTime);
        }
      }

      lastTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimationLoopActive = false;
      // Only reset lastTimeRef if the animation is stopping
      if (!orbitsEnabled || timeScale === 0) {
        lastTimeRef.current = null;
      }
    };
  }, [orbitsEnabled, timeScale, advanceSimulationTime]);
}
