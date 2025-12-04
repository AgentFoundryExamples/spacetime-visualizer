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
 * Props for SkipLink component.
 */
export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string;
  /** Skip link text */
  children: React.ReactNode;
}

/**
 * Validates that a target ID is safe to use.
 * @param id - The element ID to validate
 * @returns true if the ID is safe to use
 */
function isValidElementId(id: string): boolean {
  // Check for empty or non-string values
  if (typeof id !== 'string' || !id.trim()) {
    return false;
  }
  // Only allow alphanumeric characters, hyphens, and underscores
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
}

/**
 * Skip link component for keyboard navigation.
 * Allows users to skip repetitive navigation and jump to main content.
 */
export function SkipLink({ targetId, children }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Validate the target ID before using it
    if (!isValidElementId(targetId)) {
      console.warn('SkipLink: Invalid target ID provided');
      return;
    }
    
    const target = document.getElementById(targetId);
    if (target && target instanceof HTMLElement) {
      // Focus the first focusable element within the target, or the target itself
      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const firstFocusable = target.querySelector<HTMLElement>(focusableSelectors);
      
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        target.focus();
      }
      
      // Only scroll if scrollIntoView is available
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Validate targetId before rendering
  const safeTargetId = isValidElementId(targetId) ? targetId : '';

  return (
    <a href={`#${safeTargetId}`} className="skip-link" onClick={handleClick}>
      {children}
    </a>
  );
}

export default SkipLink;
