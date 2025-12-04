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

/**
 * Type for the window object with the announcer function.
 */
type WindowWithAnnouncer = Window & { announceToScreenReader?: (text: string) => void };

/**
 * Announce a message to screen readers via the LiveRegion component.
 * This function is safe to call even if no LiveRegion is mounted.
 * @param message - The message to announce
 */
export function announceToScreenReader(message: string): void {
  const announcer = (window as WindowWithAnnouncer).announceToScreenReader;
  if (announcer) {
    announcer(message);
  }
}
