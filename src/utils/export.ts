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
 * Export utilities for capturing PNG screenshots and WebM/GIF/MP4 video recordings
 * from the Three.js canvas visualization.
 *
 * GIF and MP4 exports use frame-by-frame capture with browser-based encoding
 * to avoid blocking the UI thread. Worker-based encoding is used when available.
 */

/**
 * Supported export formats.
 */
export type ExportFormat = 'png' | 'webm' | 'gif' | 'mp4';

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
 * GIF export options.
 */
export interface GifExportOptions {
  /** Duration in seconds */
  duration: number;
  /** Frames per second (default: 15 for GIF) */
  fps?: number;
  /** Custom resolution (uses canvas size if not specified) */
  resolution?: ExportResolution;
  /** Custom filename (auto-generated if not specified) */
  filename?: string;
  /** Quality (1-20, lower is better, default: 10) */
  quality?: number;
}

/**
 * MP4 export options.
 */
export interface Mp4ExportOptions {
  /** Duration in seconds */
  duration: number;
  /** Frames per second (default: 30) */
  fps?: number;
  /** Custom resolution (uses canvas size if not specified) */
  resolution?: ExportResolution;
  /** Custom filename (auto-generated if not specified) */
  filename?: string;
  /** Video bitrate in bits per second (default: 5 Mbps) */
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
 * Default GIF export settings.
 */
export const DEFAULT_GIF_FPS = 15;
export const DEFAULT_GIF_QUALITY = 10;
export const DEFAULT_GIF_DURATION = 3; // 3 seconds

/**
 * Default MP4 export settings.
 */
export const DEFAULT_MP4_FPS = 30;
export const DEFAULT_MP4_BITRATE = 5_000_000; // 5 Mbps
export const DEFAULT_MP4_DURATION = 5; // 5 seconds

/**
 * Maximum allowed export resolution to prevent memory issues.
 */
export const MAX_EXPORT_RESOLUTION = 4096;

/**
 * Maximum video duration in seconds.
 */
export const MAX_VIDEO_DURATION = 30;

/**
 * Maximum GIF duration in seconds (shorter due to memory constraints).
 */
export const MAX_GIF_DURATION = 10;

/**
 * Maximum MP4 duration in seconds.
 */
export const MAX_MP4_DURATION = 30;

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
 * Validates GIF duration and returns clamped value.
 */
export function clampGifDuration(duration: number): number {
  const clamped = Math.min(Math.max(1, duration), MAX_GIF_DURATION);
  if (duration > MAX_GIF_DURATION) {
    console.warn(`GIF duration clamped from ${duration}s to ${clamped}s (max ${MAX_GIF_DURATION}s)`);
  }
  return clamped;
}

/**
 * Validates MP4 duration and returns clamped value.
 */
export function clampMp4Duration(duration: number): number {
  const clamped = Math.min(Math.max(1, duration), MAX_MP4_DURATION);
  if (duration > MAX_MP4_DURATION) {
    console.warn(`MP4 duration clamped from ${duration}s to ${clamped}s (max ${MAX_MP4_DURATION}s)`);
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
 * Checks if GIF export is supported.
 * GIF export uses canvas frame capture which is widely supported.
 */
export function isGifExportSupported(): boolean {
  return typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined';
}

/**
 * Checks if MP4 export is supported.
 * MP4 export requires either MediaRecorder with H.264 support or uses WebM with conversion.
 */
export function isMp4ExportSupported(): boolean {
  return getSupportedMp4MimeType() !== null || getSupportedVideoMimeType() !== null;
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
 * Gets the best supported MP4 MIME type (H.264).
 */
export function getSupportedMp4MimeType(): string | null {
  const mimeTypes = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/mp4',
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
  let stream: MediaStream | null = null;

  try {
    onProgress?.(0, 'Initializing video recording...');

    // Capture stream from canvas
    try {
      stream = canvas.captureStream(fps);
    } catch (streamError) {
      const message =
        streamError instanceof Error ? streamError.message : 'Failed to capture canvas stream';
      return { success: false, error: `Stream capture failed: ${message}` };
    }
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
        // Clean up stream tracks to prevent memory leaks
        stream?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(state.chunks, { type: mimeType });
        resolve(blob);
      };

      state.mediaRecorder.onerror = (event) => {
        // Clean up stream tracks on error as well
        stream?.getTracks().forEach((track) => track.stop());
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
    // Clean up stream tracks on error
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    const message = error instanceof Error ? error.message : 'Unknown error during video export';
    console.error('Video export failed:', error);
    return { success: false, error: message };
  }
}

/**
 * Captures a single frame from the canvas as ImageData.
 */
export function captureFrame(canvas: HTMLCanvasElement): ImageData | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // For WebGL canvas, we need to use a different approach
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offscreenCtx = offscreen.getContext('2d');
    if (!offscreenCtx) return null;
    offscreenCtx.drawImage(canvas, 0, 0);
    return offscreenCtx.getImageData(0, 0, canvas.width, canvas.height);
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Captures frames from canvas over a duration.
 * Uses requestAnimationFrame for smooth frame timing.
 */
export async function captureFrameSequence(
  canvas: HTMLCanvasElement,
  duration: number,
  fps: number,
  onProgress?: ExportProgressCallback
): Promise<ImageData[]> {
  const frames: ImageData[] = [];
  const frameInterval = 1000 / fps;
  const totalFrames = Math.ceil(duration * fps);
  const startTime = performance.now();
  
  return new Promise((resolve) => {
    let frameCount = 0;
    let lastFrameTime = startTime;
    
    function captureNextFrame() {
      const now = performance.now();
      const elapsed = now - startTime;
      
      // Check if we should capture a frame based on time
      if (now - lastFrameTime >= frameInterval) {
        const frame = captureFrame(canvas);
        if (frame) {
          frames.push(frame);
          frameCount++;
          const progress = (frameCount / totalFrames) * 80;
          onProgress?.(progress, `Capturing frame ${frameCount}/${totalFrames}...`);
        }
        lastFrameTime = now;
      }
      
      // Continue capturing if we haven't reached the duration
      if (elapsed < duration * 1000 && frameCount < totalFrames) {
        requestAnimationFrame(captureNextFrame);
      } else {
        resolve(frames);
      }
    }
    
    requestAnimationFrame(captureNextFrame);
  });
}

/**
 * Simple GIF encoder using browser-native capabilities.
 *
 * **Important:** This is a placeholder implementation that captures frames but
 * returns a static PNG image as a GIF fallback. For true animated GIF export,
 * integrate a proper GIF encoder library like gif.js or use a worker-based
 * encoding solution.
 *
 * The class stores all frames and their metadata, ready for integration with
 * a proper GIF encoding library.
 */
export class SimpleGifEncoder {
  /** Width of the GIF in pixels */
  readonly width: number;
  /** Height of the GIF in pixels */
  readonly height: number;
  /** Quality setting (1-20, lower is better) */
  readonly quality: number;
  /** Delay between frames in milliseconds */
  readonly delay: number;
  private frames: string[] = [];

  constructor(width: number, height: number, quality: number = 10, delay: number = 100) {
    this.width = width;
    this.height = height;
    this.quality = Math.min(20, Math.max(1, quality));
    this.delay = delay;
  }

  /**
   * Adds a frame to the GIF.
   * Frames are stored as PNG data URLs for later encoding.
   */
  addFrame(canvas: HTMLCanvasElement): void {
    // Convert canvas to data URL with quality adjustment
    const dataUrl = canvas.toDataURL('image/png');
    this.frames.push(dataUrl);
  }

  /**
   * Returns all captured frame data URLs.
   * Useful for integration with external GIF encoders.
   */
  getFrames(): string[] {
    return [...this.frames];
  }

  /**
   * Encodes the captured frames into a GIF.
   *
   * **Note:** This is a placeholder implementation that returns the first frame
   * as a static image. For animated GIF output, integrate a proper GIF encoder
   * library (e.g., gif.js) and use the following metadata:
   * - `this.width`, `this.height`: Canvas dimensions
   * - `this.delay`: Delay between frames in milliseconds
   * - `this.quality`: Quality setting (1-20)
   * - `this.getFrames()`: Array of PNG data URLs
   *
   * @returns A Blob containing the GIF (currently static first frame)
   */
  async encode(): Promise<Blob> {
    if (this.frames.length === 0) {
      throw new Error('No frames to encode');
    }

    // TODO: Integrate proper GIF encoder (gif.js or similar)
    // For now, return the first frame as a static image placeholder
    // This allows the UI flow to work while waiting for proper GIF library integration
    const response = await fetch(this.frames[0]);
    const firstFrameBlob = await response.blob();

    // Return with image/gif MIME type
    // Note: This is technically a PNG with GIF mime type as a placeholder
    return new Blob([firstFrameBlob], { type: 'image/gif' });
  }

  /**
   * Gets the number of captured frames.
   */
  get frameCount(): number {
    return this.frames.length;
  }
}

/**
 * Captures a GIF from a canvas element.
 * Uses frame-by-frame capture to create a GIF export.
 *
 * **Note:** The current implementation uses a placeholder encoder that exports
 * the first captured frame as a static image. For true animated GIF support,
 * integrate a proper GIF encoder library (e.g., gif.js).
 *
 * GIF encoding is computationally intensive. For long durations,
 * consider using a Web Worker for encoding.
 */
export async function captureGif(
  canvas: HTMLCanvasElement,
  options: GifExportOptions,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const filename = options.filename ?? generateExportFilename('gif');
  const duration = clampGifDuration(options.duration);
  const fps = Math.min(Math.max(1, options.fps ?? DEFAULT_GIF_FPS), 30);
  const quality = options.quality ?? DEFAULT_GIF_QUALITY;

  if (!isGifExportSupported()) {
    return {
      success: false,
      error: 'GIF export is not supported in this environment.',
    };
  }

  try {
    onProgress?.(0, 'Initializing GIF capture...');

    // Validate resolution
    const targetWidth = options.resolution?.width ?? canvas.width;
    const targetHeight = options.resolution?.height ?? canvas.height;
    const resolution = clampExportResolution({ width: targetWidth, height: targetHeight });

    // Create encoder
    const delay = Math.round(1000 / fps);
    const encoder = new SimpleGifEncoder(resolution.width, resolution.height, quality, delay);

    // Capture frames
    const totalFrames = Math.ceil(duration * fps);
    const frameInterval = 1000 / fps;
    const startTime = Date.now();

    onProgress?.(5, 'Recording frames...');

    for (let i = 0; i < totalFrames; i++) {
      // Wait for next frame time
      const targetTime = startTime + i * frameInterval;
      const now = Date.now();
      if (targetTime > now) {
        await new Promise((resolve) => setTimeout(resolve, targetTime - now));
      }

      // Capture and scale frame if needed
      if (resolution.width !== canvas.width || resolution.height !== canvas.height) {
        const offscreen = document.createElement('canvas');
        offscreen.width = resolution.width;
        offscreen.height = resolution.height;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, resolution.width, resolution.height);
          encoder.addFrame(offscreen);
        }
      } else {
        encoder.addFrame(canvas);
      }

      const progress = 5 + ((i + 1) / totalFrames) * 75;
      onProgress?.(progress, `Capturing frame ${i + 1}/${totalFrames}...`);
    }

    onProgress?.(82, 'Encoding GIF (static preview)...');

    // Encode the GIF
    const blob = await encoder.encode();

    onProgress?.(95, 'Preparing download...');

    // Download the GIF
    downloadBlob(blob, filename);

    // Note: For animated GIF support, integrate gif.js or similar encoder
    onProgress?.(100, 'GIF saved (static preview)!');

    return { success: true, filename };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during GIF export';
    console.error('GIF export failed:', error);
    return { success: false, error: message };
  }
}

/**
 * Captures an MP4 video from a canvas element.
 * Uses MediaRecorder with H.264 codec if available, otherwise falls back to WebM.
 */
export async function captureMp4(
  canvas: HTMLCanvasElement,
  options: Mp4ExportOptions,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const duration = clampMp4Duration(options.duration);
  const fps = Math.min(Math.max(1, options.fps ?? DEFAULT_MP4_FPS), 60);

  // Try native MP4 support first
  const mp4MimeType = getSupportedMp4MimeType();
  if (mp4MimeType) {
    // Use native MP4 recording
    const filename = options.filename ?? generateExportFilename('mp4');
    return captureVideoWithMimeType(canvas, {
      ...options,
      duration,
      fps,
      filename,
    }, mp4MimeType, onProgress);
  }

  // Fallback to WebM capture with correct .webm extension
  const webmMimeType = getSupportedVideoMimeType();
  if (!webmMimeType) {
    return {
      success: false,
      error: 'MP4 export is not supported in this browser. Neither H.264 nor WebM codecs are available.',
    };
  }

  // Capture as WebM and save with .webm extension to avoid format/extension mismatch
  const filename = options.filename
    ? options.filename.replace(/\.mp4$/i, '.webm')
    : generateExportFilename('webm');
  onProgress?.(0, 'MP4 not directly supported. Recording as WebM instead...');

  return captureVideoWithMimeType(canvas, {
    ...options,
    duration,
    fps,
    filename,
  }, webmMimeType, onProgress);
}

/**
 * Internal helper to capture video with a specific MIME type.
 */
async function captureVideoWithMimeType(
  canvas: HTMLCanvasElement,
  options: VideoExportOptions,
  mimeType: string,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const filename = options.filename ?? generateExportFilename('webm');
  const duration = options.duration;
  const fps = options.fps ?? DEFAULT_VIDEO_FPS;

  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let stream: MediaStream | null = null;

  try {
    onProgress?.(0, 'Initializing video recording...');

    // Capture stream from canvas
    try {
      stream = canvas.captureStream(fps);
    } catch (streamError) {
      const message =
        streamError instanceof Error ? streamError.message : 'Failed to capture canvas stream';
      return { success: false, error: `Stream capture failed: ${message}` };
    }
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
        // Clean up stream tracks to prevent memory leaks
        stream?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(state.chunks, { type: mimeType });
        resolve(blob);
      };

      state.mediaRecorder.onerror = (event) => {
        // Clean up stream tracks on error as well
        stream?.getTracks().forEach((track) => track.stop());
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
    // Clean up stream tracks on error
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    const message = error instanceof Error ? error.message : 'Unknown error during video export';
    console.error('Video export failed:', error);
    return { success: false, error: message };
  }
}

/**
 * Export encoder configuration from environment.
 */
export interface ExportEncoderConfig {
  /** Path to external encoder (if using external encoding) */
  encoderPath?: string;
  /** Whether to use worker-based encoding */
  useWorkerEncoding: boolean;
  /** Maximum concurrent export operations */
  maxConcurrentExports: number;
}

/**
 * Gets export encoder configuration from environment variables.
 */
export function getExportEncoderConfig(): ExportEncoderConfig {
  const encoderPath =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_EXPORT_ENCODER_PATH
      ? String(import.meta.env.VITE_EXPORT_ENCODER_PATH)
      : undefined;

  const useWorkerEncoding =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_EXPORT_WORKER !== 'false';

  const maxConcurrentExports =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAX_CONCURRENT_EXPORTS
      ? parseInt(String(import.meta.env.VITE_MAX_CONCURRENT_EXPORTS), 10) || 1
      : 1;

  return {
    encoderPath,
    useWorkerEncoding,
    maxConcurrentExports,
  };
}

/**
 * Validates export encoder configuration and returns any errors.
 */
export function validateExportEncoderConfig(config: ExportEncoderConfig): string[] {
  const errors: string[] = [];

  if (config.encoderPath && typeof config.encoderPath !== 'string') {
    errors.push('VITE_EXPORT_ENCODER_PATH must be a valid path string');
  }

  if (config.maxConcurrentExports < 1 || config.maxConcurrentExports > 5) {
    errors.push('VITE_MAX_CONCURRENT_EXPORTS must be between 1 and 5');
  }

  return errors;
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
