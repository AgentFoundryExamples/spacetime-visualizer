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
 * Maximum message length to prevent potential abuse.
 */
const MAX_MESSAGE_LENGTH = 500;

/**
 * Type for the window object with the announcer function.
 */
type WindowWithAnnouncer = Window & { announceToScreenReader?: (text: string) => void };

/**
 * Sanitizes a message string by trimming and limiting length.
 * @param text - The input text to sanitize
 * @returns Sanitized text safe for display
 */
function sanitizeMessage(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.trim().slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Live region component for screen reader announcements.
 * Uses ARIA live regions to announce dynamic content changes.
 */
export function LiveRegion({ className = '' }: LiveRegionProps) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Debounced announcement function
  const announce = useCallback((text: string) => {
    // Sanitize input
    const sanitizedText = sanitizeMessage(text);
    if (!sanitizedText) {
      return;
    }

    // Clear any pending announcements (both timeout and RAF)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Debounce rapid updates
    timeoutRef.current = setTimeout(() => {
      // Clear first to ensure screen readers detect the change
      setMessage('');
      // Use requestAnimationFrame to ensure the DOM update is processed
      rafRef.current = requestAnimationFrame(() => {
        setMessage(sanitizedText);
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
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
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
