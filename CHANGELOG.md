# Changelog

All notable changes to the Spacetime Visualizer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-04

### Added

#### Dynamic Orbital Motion
- Real-time orbital animation for masses with defined orbital parameters
- Keplerian orbital mechanics in weak-field approximation
- Orbital controls: Enable Orbits toggle, Reset Time, and simulation time display
- Binary systems orbit around their common center of mass
- See [docs/scenarios.md#orbital-motion](docs/scenarios.md#orbital-motion) for details

#### Physics Web Worker
- Offloaded physics computations to dedicated Web Worker for UI responsiveness
- Typed message protocol (INIT, COMPUTE, RESULT, ERROR, TERMINATE)
- Automatic fallback to main thread when Workers are unavailable
- Worker status exposed via `useSimulation` hook
- See [docs/scenarios.md#physics-worker-architecture](docs/scenarios.md#physics-worker-architecture) for details

#### New Preset Scenarios
- **Gravitational Lensing**: Massive object demonstrating deep curvature
- **Extreme Mass Ratio**: Binary with ~100:1 mass ratio (EMRI-like system)
- **Hierarchical Triple**: Inner binary orbiting a massive third body
- **Black Hole Inspiral**: Two equal masses in tight pre-merger orbit
- All new scenarios documented in [docs/scenarios.md](docs/scenarios.md)

#### Export Tools
- PNG screenshot capture of current visualization
- WebM video recording (1-30 seconds duration)
- Progress indicator with status messages
- Sequential queue management for multiple exports
- Browser compatibility: VP9 (Chrome, Firefox, Edge), VP8 (Safari 16.4+)
- See [docs/scenarios.md#exporting-visuals](docs/scenarios.md#exporting-visuals) for details

#### Accessibility Improvements
- Skip link for keyboard navigation
- ARIA live regions for dynamic announcements
- Semantic HTML landmarks (main, nav, contentinfo)
- WCAG 2.1 AA color contrast compliance
- `prefers-reduced-motion` support
- Windows High Contrast Mode (`forced-colors`) support
- Screen reader tested with VoiceOver, NVDA, and ChromeVox
- See [docs/scenarios.md#accessibility](docs/scenarios.md#accessibility) for details

### Changed

- Test suite expanded from 136 to 242 tests
- Documentation updated with v0.2 features

### Known Limitations

- Orbital decay (inspiral) is not simulated; orbits are static Keplerian
- Gravitational lensing visualization shows curvature depth, not ray-traced lensing
- Video export requires MediaRecorder API support
- Maximum video duration clamped to 30 seconds

## [0.1.0] - 2025-12-04

### Added

#### Project Scaffolding
- Vite + React + TypeScript project structure
- ESLint and Prettier configuration for code quality
- Vitest test framework with testing-library integration
- Environment-based configuration with `.env` support

#### Physics Engine
- Curvature computation engine with weak-field approximation of Einstein's equations
- MassSource and CurvatureSample data models
- Support for multiple mass superposition
- Configurable grid resolution (8-256 cells)
- Deterministic seeding for reproducible scenarios
- Comprehensive input validation with descriptive error messages

#### Visualization System
- Three.js integration via React Three Fiber
- WebGL2 detection with graceful degradation
- Three visualization modes:
  - **Heightfield Mesh**: 3D surface showing curvature depth as height displacement
  - **Contour Grid**: Equipotential lines showing gravitational field strength
  - **Field Lines**: Animated particles showing gravitational field direction
- Color mapping from blue (flat spacetime) to red (curved spacetime)
- Resource management with proper disposal on mode switching

#### Preset Scenarios
- Single Mass: Spherically symmetric curvature demonstration
- Binary Orbit (Static): A static snapshot of a two-body gravitational interaction
- Gravitational Wave (Static): A static quadrupole pattern representing a moment of a gravitational wave
- Triple System: Three-body complexity
- Mass Cluster: Aggregate curvature visualization

#### User Interface
- Interactive parameter controls with debounced updates
- Mode selector for switching visualization types
- Scenario library with preset and custom configurations
- Camera controls: orbit, zoom, pan, and auto-rotate
- Playback controls: play/pause, refresh, reset
- Educational panel with mode/scenario explanations
- Custom preset saving/loading via browser local storage

#### Configuration
- Environment variables for grid resolution and animation timestep
- Safe defaults when configuration is not provided
- Configuration validation with sensible bounds

### Known Limitations

- **Weak-field approximation only**: Does not model extreme gravity near black holes or neutron stars
- **Static sources**: Masses are stationary; no gravitational wave propagation
- **Point masses**: Finite-size effects are not modeled
- **Normalized units**: Uses G = c = 1; physical values require dimensional conversion
- **Performance**: High grid resolutions (64+) may cause lag during parameter changes

## [Unreleased]

### Planned

See [docs/roadmap.md](docs/roadmap.md) for upcoming features and improvements.

[0.2.0]: https://github.com/AgentFoundryExamples/spacetime-visualizer/releases/tag/v0.2.0
[0.1.0]: https://github.com/AgentFoundryExamples/spacetime-visualizer/releases/tag/v0.1.0
[Unreleased]: https://github.com/AgentFoundryExamples/spacetime-visualizer/compare/v0.2.0...HEAD
