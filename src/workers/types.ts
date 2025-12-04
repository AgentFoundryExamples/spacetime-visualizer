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
 * Message protocol types for physics Web Worker communication.
 *
 * @module workers/types
 *
 * ## Message Flow
 *
 * ```mermaid
 * sequenceDiagram
 *     participant Main as Main Thread
 *     participant Worker as Physics Worker
 *
 *     Main->>Worker: INIT
 *     Worker-->>Main: READY
 *
 *     Main->>Worker: COMPUTE (config)
 *     Worker-->>Main: RESULT (samples) or ERROR
 *
 *     Main->>Worker: TERMINATE
 *     Worker-->>Main: (closes)
 * ```
 */

import type { CurvatureGridConfig, CurvatureGridResult } from '../physics/types';

/** Message types sent from main thread to worker */
export type PhysicsWorkerMessageType = 'INIT' | 'COMPUTE' | 'TERMINATE';

/** Message types sent from worker to main thread */
export type PhysicsWorkerResponseType = 'READY' | 'RESULT' | 'ERROR' | 'PROGRESS';

/**
 * Request to initialize the physics worker.
 */
export interface InitMessage {
  type: 'INIT';
}

/**
 * Request to compute curvature grid.
 */
export interface ComputeMessage {
  type: 'COMPUTE';
  /** Unique request ID for correlation */
  requestId: string;
  /** Configuration for curvature computation */
  config: CurvatureGridConfig;
}

/**
 * Request to terminate the worker.
 */
export interface TerminateMessage {
  type: 'TERMINATE';
}

/** Union of all messages from main thread to worker */
export type PhysicsWorkerMessage =
  | InitMessage
  | ComputeMessage
  | TerminateMessage;

/**
 * Response indicating worker is ready.
 */
export interface ReadyResponse {
  type: 'READY';
}

/**
 * Response containing computation result.
 * Uses Float64Array for transferable buffer optimization.
 */
export interface ResultResponse {
  type: 'RESULT';
  /** Correlates with original request */
  requestId: string;
  /** Computation result with sample data */
  result: CurvatureGridResult;
  /** Time taken for computation in milliseconds */
  computeTimeMs: number;
}

/**
 * Response indicating an error occurred.
 */
export interface ErrorResponse {
  type: 'ERROR';
  /** Correlates with original request if applicable */
  requestId?: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: PhysicsErrorCode;
}

/**
 * Response indicating computation progress (for long-running computations).
 */
export interface ProgressResponse {
  type: 'PROGRESS';
  /** Correlates with original request */
  requestId: string;
  /** Completion percentage (0-100) */
  percent: number;
}

/** Union of all messages from worker to main thread */
export type PhysicsWorkerResponse =
  | ReadyResponse
  | ResultResponse
  | ErrorResponse
  | ProgressResponse;

/**
 * Error codes for worker errors.
 */
export type PhysicsErrorCode =
  | 'VALIDATION_ERROR'
  | 'COMPUTATION_ERROR'
  | 'WORKER_ERROR'
  | 'TIMEOUT_ERROR';

/**
 * Configuration for the physics client.
 */
export interface PhysicsClientConfig {
  /** Enable fallback to main thread computation (default: true) */
  enableFallback?: boolean;
  /** Timeout for worker initialization in milliseconds (default: 5000) */
  initTimeoutMs?: number;
  /** Timeout for computation in milliseconds (default: 30000) */
  computeTimeoutMs?: number;
  /** Callback for worker errors */
  onError?: (error: ErrorResponse) => void;
  /** Callback for worker warnings (e.g., fallback activated) */
  onWarning?: (message: string) => void;
}

/**
 * Interface for physics computation - implemented by worker client and fallback.
 */
export interface PhysicsComputer {
  /** Whether the computer is using a Web Worker */
  readonly isWorkerBased: boolean;
  /** Compute curvature grid with given config */
  compute(config: CurvatureGridConfig): Promise<CurvatureGridResult>;
  /** Terminate the computer and release resources */
  terminate(): void;
}

/**
 * Creates a unique request ID for worker message correlation.
 */
export function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
