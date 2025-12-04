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
 * Physics Web Worker for offloading curvature computations.
 *
 * This worker handles the CPU-intensive physics calculations off the main thread,
 * keeping the UI responsive during complex simulations.
 *
 * @module workers/physics.worker
 */

import {
  computeCurvatureGrid,
  CurvatureValidationError,
} from '../physics/curvature';
import type {
  PhysicsWorkerMessage,
  PhysicsWorkerResponse,
  ErrorResponse,
} from './types';

/**
 * Sends a typed response to the main thread.
 */
function postResponse(response: PhysicsWorkerResponse): void {
  self.postMessage(response);
}

/**
 * Sends an error response to the main thread.
 */
function postError(
  message: string,
  code: ErrorResponse['code'],
  requestId?: string
): void {
  postResponse({
    type: 'ERROR',
    message,
    code,
    requestId,
  });
}

/**
 * Handles incoming messages from the main thread.
 */
function handleMessage(event: MessageEvent<PhysicsWorkerMessage>): void {
  const message = event.data;

  switch (message.type) {
    case 'INIT':
      // Worker is ready to receive compute requests
      postResponse({ type: 'READY' });
      break;

    case 'COMPUTE': {
      const { requestId, config } = message;
      const startTime = performance.now();

      try {
        // Validate and compute curvature grid
        const result = computeCurvatureGrid(config);
        const computeTimeMs = performance.now() - startTime;

        postResponse({
          type: 'RESULT',
          requestId,
          result,
          computeTimeMs,
        });
      } catch (error) {
        if (error instanceof CurvatureValidationError) {
          postError(error.message, 'VALIDATION_ERROR', requestId);
        } else if (error instanceof Error) {
          postError(error.message, 'COMPUTATION_ERROR', requestId);
        } else {
          postError('Unknown error during computation', 'COMPUTATION_ERROR', requestId);
        }
      }
      break;
    }

    case 'TERMINATE':
      // Clean up and close the worker
      self.close();
      break;

    default: {
      // Type-safe exhaustive check
      const exhaustiveCheck: never = message;
      postError(
        `Unknown message type: ${(exhaustiveCheck as PhysicsWorkerMessage).type}`,
        'WORKER_ERROR'
      );
    }
  }
}

// Set up message listener
self.addEventListener('message', handleMessage);

// Handle uncaught errors in the worker
self.addEventListener('error', (event) => {
  postError(
    event.message || 'Unknown worker error',
    'WORKER_ERROR'
  );
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  postError(
    event.reason?.message || 'Unhandled promise rejection',
    'WORKER_ERROR'
  );
});
