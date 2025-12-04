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
 * Physics computation client with Web Worker support and fallback.
 *
 * This module provides a unified interface for physics computations that:
 * 1. Uses a Web Worker when available to keep the main thread responsive
 * 2. Falls back to main thread computation when workers are not available
 * 3. Handles errors gracefully with retry capability
 * 4. Is SSR-safe (no window/Worker references at import time)
 *
 * @module workers/physics-client
 */

import type { CurvatureGridConfig, CurvatureGridResult } from '../physics/types';
import {
  computeCurvatureGrid,
  CurvatureValidationError,
} from '../physics/curvature';
import type {
  PhysicsComputer,
  PhysicsClientConfig,
  PhysicsWorkerResponse,
  ErrorResponse,
} from './types';
import { createRequestId } from './types';

/** Default timeout for worker initialization (ms) */
const DEFAULT_INIT_TIMEOUT_MS = 5000;

/** Default timeout for computation (ms) */
const DEFAULT_COMPUTE_TIMEOUT_MS = 30000;

/**
 * Checks if Web Workers are available in the current environment.
 * SSR-safe: returns false during server-side rendering.
 */
export function isWorkerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof Worker !== 'undefined'
  );
}

/**
 * Fallback physics computer that runs on the main thread.
 * Used when Web Workers are not available or fail to initialize.
 */
class FallbackPhysicsComputer implements PhysicsComputer {
  readonly isWorkerBased = false;

  async compute(config: CurvatureGridConfig): Promise<CurvatureGridResult> {
    // Simulate async behavior to match worker interface
    return new Promise((resolve, reject) => {
      // Use setTimeout to allow UI updates before blocking computation
      setTimeout(() => {
        try {
          const result = computeCurvatureGrid(config);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }

  terminate(): void {
    // No-op for fallback
  }
}

/**
 * Web Worker-based physics computer.
 * Offloads computation to a dedicated worker thread.
 */
class WorkerPhysicsComputer implements PhysicsComputer {
  readonly isWorkerBased = true;

  private worker: Worker;
  private pendingRequests: Map<
    string,
    {
      resolve: (result: CurvatureGridResult) => void;
      reject: (error: Error) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  > = new Map();
  private config: Required<PhysicsClientConfig>;
  private isTerminated = false;

  constructor(worker: Worker, config: PhysicsClientConfig = {}) {
    this.worker = worker;
    this.config = {
      enableFallback: config.enableFallback ?? true,
      initTimeoutMs: config.initTimeoutMs ?? DEFAULT_INIT_TIMEOUT_MS,
      computeTimeoutMs: config.computeTimeoutMs ?? DEFAULT_COMPUTE_TIMEOUT_MS,
      onError: config.onError ?? (() => {}),
      onWarning: config.onWarning ?? (() => {}),
    };

    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);
  }

  private handleMessage = (event: MessageEvent<PhysicsWorkerResponse>): void => {
    const response = event.data;

    switch (response.type) {
      case 'READY':
        // Worker initialization complete
        break;

      case 'RESULT': {
        const pending = this.pendingRequests.get(response.requestId);
        if (pending) {
          clearTimeout(pending.timeoutId);
          this.pendingRequests.delete(response.requestId);
          pending.resolve(response.result);
        }
        break;
      }

      case 'ERROR': {
        const errorResponse = response as ErrorResponse;
        if (errorResponse.requestId) {
          const pending = this.pendingRequests.get(errorResponse.requestId);
          if (pending) {
            clearTimeout(pending.timeoutId);
            this.pendingRequests.delete(errorResponse.requestId);
            const error = new Error(errorResponse.message);
            if (errorResponse.code === 'VALIDATION_ERROR') {
              Object.setPrototypeOf(error, CurvatureValidationError.prototype);
            }
            pending.reject(error);
          }
        }
        this.config.onError(errorResponse);
        break;
      }

      case 'PROGRESS':
        // Could be used for progress UI in the future
        break;
    }
  };

  private handleError = (event: ErrorEvent): void => {
    const errorResponse: ErrorResponse = {
      type: 'ERROR',
      message: event.message || 'Worker error',
      code: 'WORKER_ERROR',
    };
    this.config.onError(errorResponse);

    // Reject all pending requests
    this.pendingRequests.forEach((pending, requestId) => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error(`Worker error: ${event.message}`));
      this.pendingRequests.delete(requestId);
    });
  };

  async compute(config: CurvatureGridConfig): Promise<CurvatureGridResult> {
    if (this.isTerminated) {
      throw new Error('Worker has been terminated');
    }

    const requestId = createRequestId();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Computation timeout'));
      }, this.config.computeTimeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeoutId });

      this.worker.postMessage({
        type: 'COMPUTE',
        requestId,
        config,
      });
    });
  }

  terminate(): void {
    if (this.isTerminated) return;

    this.isTerminated = true;

    // Reject all pending requests
    this.pendingRequests.forEach((pending, requestId) => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Worker terminated'));
      this.pendingRequests.delete(requestId);
    });

    // Send terminate message to worker for graceful shutdown
    this.worker.postMessage({ type: 'TERMINATE' });

    // Give the worker a moment to gracefully shut down before force-terminating
    setTimeout(() => {
      // Clean up event listeners after worker has had time to process
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.removeEventListener('error', this.handleError);
      this.worker.terminate();
    }, 100);
  }
}

/**
 * Creates a physics computer instance.
 *
 * Attempts to create a Web Worker-based computer first. If workers are not
 * available or fail to initialize, falls back to main thread computation.
 *
 * @param config - Optional configuration for the physics client
 * @returns Promise resolving to a PhysicsComputer instance
 *
 * @example
 * ```typescript
 * const computer = await createPhysicsComputer({
 *   onError: (error) => console.error('Physics error:', error),
 *   onWarning: (msg) => console.warn('Physics warning:', msg),
 * });
 *
 * const result = await computer.compute(gridConfig);
 *
 * // Clean up when done
 * computer.terminate();
 * ```
 */
export async function createPhysicsComputer(
  config: PhysicsClientConfig = {}
): Promise<PhysicsComputer> {
  const enableFallback = config.enableFallback ?? true;
  const initTimeoutMs = config.initTimeoutMs ?? DEFAULT_INIT_TIMEOUT_MS;
  const onWarning = config.onWarning ?? (() => {});

  // Check for SSR environment
  if (!isWorkerSupported()) {
    if (enableFallback) {
      onWarning('Web Workers not supported in this environment. Using main thread computation.');
      return new FallbackPhysicsComputer();
    }
    throw new Error('Web Workers are not supported in this environment');
  }

  try {
    // Create worker using Vite's worker import syntax
    const worker = new Worker(
      new URL('./physics.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker initialization timeout'));
      }, initTimeoutMs);

      const handleReady = (event: MessageEvent<PhysicsWorkerResponse>) => {
        if (event.data.type === 'READY') {
          clearTimeout(timeoutId);
          worker.removeEventListener('message', handleReady);
          resolve();
        }
      };

      const handleError = (event: ErrorEvent) => {
        clearTimeout(timeoutId);
        worker.terminate();
        reject(new Error(`Worker initialization failed: ${event.message}`));
      };

      worker.addEventListener('message', handleReady);
      worker.addEventListener('error', handleError);

      // Send init message
      worker.postMessage({ type: 'INIT' });
    });

    return new WorkerPhysicsComputer(worker, config);
  } catch (error) {
    if (enableFallback) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onWarning(`Failed to initialize physics worker: ${message}. Using main thread computation.`);
      return new FallbackPhysicsComputer();
    }
    throw error;
  }
}

/**
 * Singleton physics computer instance.
 * Lazily initialized on first use.
 */
let physicsComputerInstance: PhysicsComputer | null = null;
let physicsComputerPromise: Promise<PhysicsComputer> | null = null;

/**
 * Gets or creates the singleton physics computer instance.
 *
 * This ensures only one worker is created and shared across the application.
 *
 * @param config - Optional configuration (only used on first call)
 * @returns Promise resolving to the physics computer instance
 */
export async function getPhysicsComputer(
  config?: PhysicsClientConfig
): Promise<PhysicsComputer> {
  if (physicsComputerInstance) {
    return physicsComputerInstance;
  }

  if (!physicsComputerPromise) {
    physicsComputerPromise = createPhysicsComputer(config).then(
      (computer) => {
        physicsComputerInstance = computer;
        return computer;
      },
      (error) => {
        // Reset promise on failure to allow for retries
        physicsComputerPromise = null;
        throw error;
      }
    );
  }

  return physicsComputerPromise;
}

/**
 * Terminates the singleton physics computer instance.
 * Should be called when the application is unmounting or no longer needs
 * physics computation.
 */
export function terminatePhysicsComputer(): void {
  if (physicsComputerInstance) {
    physicsComputerInstance.terminate();
    physicsComputerInstance = null;
    physicsComputerPromise = null;
  }
}

/**
 * Checks if the physics computer is using a Web Worker.
 * Returns false if the computer hasn't been initialized yet.
 */
export function isUsingWorker(): boolean {
  return physicsComputerInstance?.isWorkerBased ?? false;
}
