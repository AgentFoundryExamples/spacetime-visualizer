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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateExportFilename,
  clampExportResolution,
  clampVideoDuration,
  isVideoExportSupported,
  getSupportedVideoMimeType,
  downloadBlob,
  getInitialExportState,
  ExportQueueManager,
  MAX_EXPORT_RESOLUTION,
  MAX_VIDEO_DURATION,
  DEFAULT_VIDEO_FPS,
  DEFAULT_VIDEO_BITRATE,
  DEFAULT_VIDEO_DURATION,
} from './export';

describe('Export Utilities', () => {
  describe('generateExportFilename', () => {
    it('generates PNG filename with timestamp', () => {
      const filename = generateExportFilename('png');
      expect(filename).toMatch(/^spacetime-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/);
    });

    it('generates WebM filename with timestamp', () => {
      const filename = generateExportFilename('webm');
      expect(filename).toMatch(/^spacetime-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.webm$/);
    });

    it('uses custom prefix', () => {
      const filename = generateExportFilename('png', 'custom');
      expect(filename).toMatch(/^custom-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/);
    });
  });

  describe('clampExportResolution', () => {
    it('passes through valid resolution', () => {
      const result = clampExportResolution({ width: 1920, height: 1080 });
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('clamps width to MAX_EXPORT_RESOLUTION', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = clampExportResolution({ width: 5000, height: 1080 });
      expect(result.width).toBe(MAX_EXPORT_RESOLUTION);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('clamps height to MAX_EXPORT_RESOLUTION', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = clampExportResolution({ width: 1920, height: 5000 });
      expect(result.height).toBe(MAX_EXPORT_RESOLUTION);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('clamps minimum resolution to 1', () => {
      const result = clampExportResolution({ width: 0, height: -10 });
      expect(result).toEqual({ width: 1, height: 1 });
    });
  });

  describe('clampVideoDuration', () => {
    it('passes through valid duration', () => {
      expect(clampVideoDuration(10)).toBe(10);
    });

    it('clamps minimum duration to 1', () => {
      expect(clampVideoDuration(0)).toBe(1);
      expect(clampVideoDuration(-5)).toBe(1);
    });

    it('clamps maximum duration to MAX_VIDEO_DURATION', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(clampVideoDuration(60)).toBe(MAX_VIDEO_DURATION);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('isVideoExportSupported', () => {
    it('returns false when MediaRecorder is not available', () => {
      const originalMediaRecorder = globalThis.MediaRecorder;
      // @ts-expect-error - intentionally removing MediaRecorder
      delete globalThis.MediaRecorder;
      expect(isVideoExportSupported()).toBe(false);
      globalThis.MediaRecorder = originalMediaRecorder;
    });
  });

  describe('getSupportedVideoMimeType', () => {
    it('returns null when MediaRecorder is not available', () => {
      const originalMediaRecorder = globalThis.MediaRecorder;
      // @ts-expect-error - intentionally removing MediaRecorder
      delete globalThis.MediaRecorder;
      expect(getSupportedVideoMimeType()).toBeNull();
      globalThis.MediaRecorder = originalMediaRecorder;
    });
  });

  describe('downloadBlob', () => {
    let mockLink: Partial<HTMLAnchorElement>;
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as HTMLAnchorElement);
      
      // Store originals and mock URL methods
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
      URL.revokeObjectURL = vi.fn();
      
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as Node);
    });

    afterEach(() => {
      // Restore URL methods
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it('creates download link with correct attributes', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      downloadBlob(blob, 'test.png');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:test');
      expect(mockLink.download).toBe('test.png');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('revokes object URL after download', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      downloadBlob(blob, 'test.png');

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
  });

  describe('getInitialExportState', () => {
    it('returns correct initial state', () => {
      const state = getInitialExportState();
      expect(state).toEqual({
        isExporting: false,
        progress: 0,
        message: '',
        format: null,
        error: null,
      });
    });
  });

  describe('ExportQueueManager', () => {
    it('executes single export immediately', async () => {
      const manager = new ExportQueueManager();
      const exportFn = vi.fn().mockResolvedValue(undefined);

      await manager.enqueue(exportFn);

      expect(exportFn).toHaveBeenCalledTimes(1);
    });

    it('reports processing state correctly', async () => {
      const manager = new ExportQueueManager();
      let resolveExport: () => void;
      const exportPromise = new Promise<void>((resolve) => {
        resolveExport = resolve;
      });
      const exportFn = vi.fn().mockImplementation(() => exportPromise);

      expect(manager.isProcessing()).toBe(false);

      const enqueuePromise = manager.enqueue(exportFn);
      expect(manager.isProcessing()).toBe(true);

      resolveExport!();
      await enqueuePromise;

      expect(manager.isProcessing()).toBe(false);
    });

    it('queues second export while first is running', async () => {
      const manager = new ExportQueueManager();
      const results: number[] = [];

      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      const firstFn = vi.fn().mockImplementation(() => {
        results.push(1);
        return firstPromise;
      });
      const secondFn = vi.fn().mockImplementation(async () => {
        results.push(2);
      });

      const firstEnqueue = manager.enqueue(firstFn);
      const secondEnqueue = manager.enqueue(secondFn);

      // Second should be queued, not executed yet
      expect(results).toEqual([1]);
      expect(secondFn).not.toHaveBeenCalled();

      // Complete first export
      resolveFirst!();
      await firstEnqueue;
      await secondEnqueue;

      // Now second should have run
      expect(results).toEqual([1, 2]);
    });

    it('replaces queued export with newer one', async () => {
      const manager = new ExportQueueManager();
      const results: number[] = [];

      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      const firstFn = vi.fn().mockImplementation(() => {
        results.push(1);
        return firstPromise;
      });
      const secondFn = vi.fn().mockImplementation(async () => {
        results.push(2);
      });
      const thirdFn = vi.fn().mockImplementation(async () => {
        results.push(3);
      });

      const firstEnqueue = manager.enqueue(firstFn);
      manager.enqueue(secondFn);
      const thirdEnqueue = manager.enqueue(thirdFn);

      // Only first should be running, second queued then replaced by third
      expect(results).toEqual([1]);

      resolveFirst!();
      await firstEnqueue;
      await thirdEnqueue;

      // Second should have been replaced
      expect(results).toEqual([1, 3]);
      expect(secondFn).not.toHaveBeenCalled();
    });
  });

  describe('Constants', () => {
    it('has valid default values', () => {
      expect(MAX_EXPORT_RESOLUTION).toBe(4096);
      expect(MAX_VIDEO_DURATION).toBe(30);
      expect(DEFAULT_VIDEO_FPS).toBe(30);
      expect(DEFAULT_VIDEO_BITRATE).toBe(5_000_000);
      expect(DEFAULT_VIDEO_DURATION).toBe(5);
    });
  });
});
