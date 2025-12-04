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
 * Web Worker exports for physics computation and export encoding.
 *
 * @module workers
 */

export type {
  PhysicsWorkerMessage,
  PhysicsWorkerResponse,
  PhysicsComputer,
  PhysicsClientConfig,
  PhysicsErrorCode,
  ErrorResponse,
} from './types';

export { createRequestId } from './types';

export {
  createPhysicsComputer,
  getPhysicsComputer,
  terminatePhysicsComputer,
  isWorkerSupported,
  isUsingWorker,
} from './physics-client';

/**
 * Export worker message types for GIF/MP4 encoding.
 */
export type ExportWorkerMessageType = 'INIT' | 'ENCODE_FRAME' | 'FINISH' | 'CANCEL';

/**
 * Export worker response types.
 */
export type ExportWorkerResponseType = 'READY' | 'PROGRESS' | 'COMPLETE' | 'ERROR';

/**
 * Message to send a frame for encoding.
 */
export interface EncodeFrameMessage {
  type: 'ENCODE_FRAME';
  requestId: string;
  frameData: ImageData;
  frameIndex: number;
}

/**
 * Message to finish encoding and get the result.
 */
export interface FinishEncodingMessage {
  type: 'FINISH';
  requestId: string;
}

/**
 * Export encoding progress response.
 */
export interface ExportProgressResponse {
  type: 'PROGRESS';
  requestId: string;
  percent: number;
  framesProcessed: number;
  totalFrames: number;
}

/**
 * Export encoding complete response.
 */
export interface ExportCompleteResponse {
  type: 'COMPLETE';
  requestId: string;
  blob: Blob;
  format: 'gif' | 'mp4';
}

/**
 * Union of export worker messages.
 */
export type ExportWorkerMessage =
  | { type: 'INIT'; format: 'gif' | 'mp4'; width: number; height: number; fps: number; quality?: number }
  | EncodeFrameMessage
  | FinishEncodingMessage
  | { type: 'CANCEL'; requestId: string };

/**
 * Union of export worker responses.
 */
export type ExportWorkerResponse =
  | { type: 'READY' }
  | ExportProgressResponse
  | ExportCompleteResponse
  | { type: 'ERROR'; requestId?: string; message: string };
