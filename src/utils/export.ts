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
 * Export utilities for capturing PNG screenshots and WebM video recordings
 * from the Three.js canvas visualization.
 */

/**
 * Supported export formats.
 */
export type ExportFormat = 'png' | 'webm';

/**
 * Export resolution configuration.
 */
export interface ExportResolution {
  width: number;
  height: number;
}

/**
 * PNG export options.
 */
export interface PngExportOptions {
  /** Custom resolution (uses canvas size if not specified) */
  resolution?: ExportResolution;
  /** Custom filename (auto-generated if not specified) */
  filename?: string;
}

/**
 * Video export options.
 */
export interface VideoExportOptions {
  /** Duration in seconds */
  duration: number;
  /** Frames per second */
  fps?: number;
  /** Custom resolution (uses canvas size if not specified) */
  resolution?: ExportResolution;
  /** Custom filename (auto-generated if not specified) */
  filename?: string;
  /** Video bitrate in bits per second */
  bitrate?: number;
}

/**
 * Export progress callback.
 */
export type ExportProgressCallback = (progress: number, message: string) => void;

/**
 * Export result.
 */
export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * Export state for tracking ongoing exports.
 */
export interface ExportState {
  isExporting: boolean;
  progress: number;
  message: string;
  format: ExportFormat | null;
  /** Error message if export failed, null otherwise */
  error: string | null;
}

/**
 * Default video export settings.
 */
export const DEFAULT_VIDEO_FPS = 30;
export const DEFAULT_VIDEO_BITRATE = 5_000_000; // 5 Mbps
export const DEFAULT_VIDEO_DURATION = 5; // 5 seconds

/**
 * Maximum allowed export resolution to prevent memory issues.
 */
export const MAX_EXPORT_RESOLUTION = 4096;

/**
 * Maximum video duration in seconds.
 */
export const MAX_VIDEO_DURATION = 30;

/**
 * Generates a timestamped filename for exports.
 */
export function generateExportFilename(format: ExportFormat, prefix = 'spacetime'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}.${format}`;
}

/**
 * Validates and clamps export resolution to safe bounds.
 */
export function clampExportResolution(resolution: ExportResolution): ExportResolution {
  const width = Math.min(Math.max(1, resolution.width), MAX_EXPORT_RESOLUTION);
  const height = Math.min(Math.max(1, resolution.height), MAX_EXPORT_RESOLUTION);

  // Warn if resolution was clamped
  if (resolution.width > MAX_EXPORT_RESOLUTION || resolution.height > MAX_EXPORT_RESOLUTION) {
    console.warn(
      `Export resolution clamped from ${resolution.width}x${resolution.height} to ${width}x${height}`
    );
  }

  return { width, height };
}

/**
 * Validates video duration and returns clamped value.
 */
export function clampVideoDuration(duration: number): number {
  const clamped = Math.min(Math.max(1, duration), MAX_VIDEO_DURATION);
  if (duration > MAX_VIDEO_DURATION) {
    console.warn(`Video duration clamped from ${duration}s to ${clamped}s`);
  }
  return clamped;
}

/**
 * Checks if MediaRecorder API is available for video recording.
 */
export function isVideoExportSupported(): boolean {
  return getSupportedVideoMimeType() !== null;
}

/**
 * Gets the best supported video MIME type.
 */
export function getSupportedVideoMimeType(): string | null {
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const mimeType of mimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return null;
}

/**
 * Triggers a download of a Blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Captures a PNG screenshot from a canvas element.
 * Uses preserveDrawingBuffer: true or toDataURL fallback.
 */
export async function capturePng(
  canvas: HTMLCanvasElement,
  options: PngExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const filename = options.filename ?? generateExportFilename('png');

  try {
    onProgress?.(0, 'Starting screenshot capture...');

    // Get resolution (use canvas size if not specified)
    const targetWidth = options.resolution?.width ?? canvas.width;
    const targetHeight = options.resolution?.height ?? canvas.height;

    // Validate resolution
    const resolution = clampExportResolution({ width: targetWidth, height: targetHeight });

    onProgress?.(25, 'Capturing canvas...');

    let dataUrl: string;

    // If we need to resize, create an offscreen canvas
    if (resolution.width !== canvas.width || resolution.height !== canvas.height) {
      onProgress?.(50, 'Scaling image...');
      const offscreen = document.createElement('canvas');
      offscreen.width = resolution.width;
      offscreen.height = resolution.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create 2D context for image scaling');
      }
      ctx.drawImage(canvas, 0, 0, resolution.width, resolution.height);
      dataUrl = offscreen.toDataURL('image/png');
    } else {
      // Use canvas directly
      dataUrl = canvas.toDataURL('image/png');
    }

    onProgress?.(75, 'Preparing download...');

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    onProgress?.(90, 'Downloading...');

    // Trigger download
    downloadBlob(blob, filename);

    onProgress?.(100, 'Screenshot saved!');

    return { success: true, filename };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during PNG export';
    console.error('PNG export failed:', error);
    return { success: false, error: message };
  }
}

/**
 * Video recording state for managing recording lifecycle.
 */
interface VideoRecordingState {
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  isRecording: boolean;
  startTime: number;
}

/**
 * Creates a video recording state object.
 */
function createVideoRecordingState(): VideoRecordingState {
  return {
    mediaRecorder: null,
    chunks: [],
    isRecording: false,
    startTime: 0,
  };
}

/**
 * Captures a WebM video from a canvas element.
 * Uses MediaRecorder API with canvas.captureStream().
 */
export async function captureVideo(
  canvas: HTMLCanvasElement,
  options: VideoExportOptions,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const filename = options.filename ?? generateExportFilename('webm');
  const duration = clampVideoDuration(options.duration);
  const fps = Math.min(Math.max(1, options.fps ?? DEFAULT_VIDEO_FPS), 60);

  // Check browser support
  const mimeType = getSupportedVideoMimeType();
  if (!mimeType) {
    return {
      success: false,
      error: 'Video recording is not supported in this browser. Try Chrome or Firefox.',
    };
  }

  let progressInterval: ReturnType<typeof setInterval> | null = null;

  try {
    onProgress?.(0, 'Initializing video recording...');

    // Capture stream from canvas
    const stream = canvas.captureStream(fps);
    const state = createVideoRecordingState();

    // Create MediaRecorder with appropriate settings
    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: options.bitrate ?? DEFAULT_VIDEO_BITRATE,
    };

    try {
      state.mediaRecorder = new MediaRecorder(stream, recorderOptions);
    } catch (recorderError) {
      const message =
        recorderError instanceof Error
          ? recorderError.message
          : 'Failed to initialize MediaRecorder';
      return { success: false, error: message };
    }

    // Collect recorded chunks
    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.chunks.push(event.data);
      }
    };

    // Create promise that resolves when recording is complete
    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      if (!state.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.chunks, { type: mimeType });
        resolve(blob);
      };

      state.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording error: ${event.type}`));
      };
    });

    onProgress?.(5, 'Recording started...');

    // Start recording
    state.mediaRecorder.start(100); // Collect data every 100ms
    state.isRecording = true;
    state.startTime = Date.now();

    // Update progress during recording
    progressInterval = setInterval(() => {
      const elapsed = (Date.now() - state.startTime) / 1000;
      const progress = Math.min(5 + (elapsed / duration) * 85, 90);
      const remaining = Math.max(0, duration - elapsed);
      onProgress?.(progress, `Recording... ${remaining.toFixed(1)}s remaining`);
    }, 100);

    // Wait for specified duration
    await new Promise((resolve) => setTimeout(resolve, duration * 1000));

    // Stop recording
    clearInterval(progressInterval);
    progressInterval = null;
    state.mediaRecorder.stop();
    state.isRecording = false;

    onProgress?.(92, 'Processing video...');

    // Wait for recording to finish processing
    const blob = await recordingPromise;

    onProgress?.(96, 'Preparing download...');

    // Trigger download
    downloadBlob(blob, filename);

    onProgress?.(100, 'Video saved!');

    return { success: true, filename };
  } catch (error) {
    // Ensure interval is cleaned up on error
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    const message = error instanceof Error ? error.message : 'Unknown error during video export';
    console.error('Video export failed:', error);
    return { success: false, error: message };
  }
}

/**
 * Initial export state.
 */
export function getInitialExportState(): ExportState {
  return {
    isExporting: false,
    progress: 0,
    message: '',
    format: null,
    error: null,
  };
}

/**
 * Export queue manager to prevent overlapping exports.
 */
export class ExportQueueManager {
  private isExporting = false;
  private queuedExport: (() => Promise<void>) | null = null;

  /**
   * Checks if an export is currently in progress.
   */
  isProcessing(): boolean {
    return this.isExporting;
  }

  /**
   * Queues or executes an export operation.
   * If an export is already running, the new export will be queued.
   * Only one export can be queued at a time (new queue requests replace previous).
   */
  async enqueue(exportFn: () => Promise<void>): Promise<void> {
    if (this.isExporting) {
      // Queue for later, replacing any existing queued export
      this.queuedExport = exportFn;
      console.info('Export queued - previous export still in progress');
      return;
    }

    this.isExporting = true;

    try {
      await exportFn();
    } finally {
      this.isExporting = false;

      // Execute queued export if one exists
      if (this.queuedExport) {
        const queued = this.queuedExport;
        this.queuedExport = null;
        await this.enqueue(queued);
      }
    }
  }
}
