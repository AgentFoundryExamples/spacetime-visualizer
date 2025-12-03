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

import { Canvas } from '@react-three/fiber';

/**
 * Three.js canvas component for rendering spacetime visualization
 * This is a placeholder that renders a basic scene
 */
export function ThreeCanvas() {
  return (
    <Canvas
      className="three-canvas"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 5], fov: 60 }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {/* Placeholder mesh - will be replaced with spacetime visualization */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e94560" />
      </mesh>
    </Canvas>
  );
}
