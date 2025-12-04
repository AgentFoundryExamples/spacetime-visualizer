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
 * Skip link component for keyboard navigation.
 * Allows users to skip repetitive navigation and jump to main content.
 */
export function SkipLink({ targetId, children }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a href={`#${targetId}`} className="skip-link" onClick={handleClick}>
      {children}
    </a>
  );
}

export default SkipLink;
