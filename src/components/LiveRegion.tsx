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

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Props for LiveRegion component.
 */
export interface LiveRegionProps {
  /** Optional class name for styling */
  className?: string;
}

/**
 * Debounce delay in milliseconds to prevent rapid announcements.
 */
const DEBOUNCE_DELAY_MS = 500;

/**
 * Type for the window object with the announcer function.
 */
type WindowWithAnnouncer = Window & { announceToScreenReader?: (text: string) => void };

/**
 * Live region component for screen reader announcements.
 * Uses ARIA live regions to announce dynamic content changes.
 */
export function LiveRegion({ className = '' }: LiveRegionProps) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced announcement function
  const announce = useCallback((text: string) => {
    // Clear any pending announcements
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce rapid updates
    timeoutRef.current = setTimeout(() => {
      // Clear first to ensure screen readers detect the change
      setMessage('');
      // Use requestAnimationFrame to ensure the DOM update is processed
      requestAnimationFrame(() => {
        setMessage(text);
      });
    }, DEBOUNCE_DELAY_MS);
  }, []);

  // Expose announce function globally for other components
  useEffect(() => {
    (window as WindowWithAnnouncer).announceToScreenReader = announce;
    return () => {
      delete (window as WindowWithAnnouncer).announceToScreenReader;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [announce]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`sr-only ${className}`.trim()}
    >
      {message}
    </div>
  );
}

export default LiveRegion;
