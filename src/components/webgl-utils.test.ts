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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWebGL2Supported } from '../components/webgl-utils';

describe('isWebGL2Supported', () => {
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.createElement = originalCreateElement;
  });

  it('should return true when WebGL2 is supported', () => {
    // Create a mock canvas with getContext returning a non-null value
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({}),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    expect(isWebGL2Supported()).toBe(true);
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl2');
  });

  it('should return false when WebGL2 is not supported', () => {
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(null),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    expect(isWebGL2Supported()).toBe(false);
  });

  it('should return false when canvas creation throws', () => {
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('Canvas not supported');
    });

    expect(isWebGL2Supported()).toBe(false);
  });
});
