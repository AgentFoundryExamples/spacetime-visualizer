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

import { useState, useMemo } from 'react';
import type { VisualizationMode } from '../content/strings';
import {
  UI_STRINGS,
  getModeStrings,
  getScenarioStrings,
} from '../content/strings';
import '../styles/panels.css';

/**
 * Props for EducationPanel component.
 */
export interface EducationPanelProps {
  /** Current visualization mode */
  currentMode: VisualizationMode;
  /** Current scenario ID (null for custom) */
  currentScenario: string | null;
  /** Whether the panel starts collapsed */
  defaultCollapsed?: boolean;
}

/**
 * Converts simple markdown to HTML for rendering.
 * Supports: headers, bold, lists, links, code.
 */
function parseMarkdown(text: string): string {
  let html = text;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Code (inline)
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Lists (unordered)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.+<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Paragraphs (wrap remaining text blocks)
  html = html
    .split('\n\n')
    .map((block) => {
      // Don't wrap if already has HTML block element
      if (
        block.startsWith('<h') ||
        block.startsWith('<ul') ||
        block.startsWith('<ol')
      ) {
        return block;
      }
      // Don't wrap empty blocks
      if (!block.trim()) return '';
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * Education panel component for displaying explanatory content.
 * Shows markdown-capable text about the current mode and scenario.
 */
export function EducationPanel({
  currentMode,
  currentScenario,
  defaultCollapsed = false,
}: EducationPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const modeStrings = useMemo(() => getModeStrings(currentMode), [currentMode]);
  const scenarioStrings = useMemo(
    () => (currentScenario ? getScenarioStrings(currentScenario) : null),
    [currentScenario]
  );

  // Combine mode and scenario educational text
  const content = useMemo(() => {
    const parts: string[] = [];

    if (modeStrings?.educationalText) {
      parts.push(modeStrings.educationalText);
    }

    if (scenarioStrings?.educationalText) {
      parts.push(scenarioStrings.educationalText);
    }

    if (parts.length === 0) {
      return '<p>Select a visualization mode and scenario to learn more.</p>';
    }

    return parts.join('\n\n---\n\n');
  }, [modeStrings, scenarioStrings]);

  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="education-panel">
      <div
        className="education-panel__header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        aria-expanded={!isCollapsed}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <h3 className="education-panel__title">{UI_STRINGS.educationTitle}</h3>
        <button
          className="education-panel__toggle"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? UI_STRINGS.educationExpand : UI_STRINGS.educationCollapse}
        </button>
      </div>

      <div
        className={`education-panel__content ${
          isCollapsed ? 'education-panel__content--collapsed' : ''
        }`}
      >
        <div
          className="education-panel__markdown"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        <a
          href="README.md#physics-engine"
          className="education-panel__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {UI_STRINGS.educationReadMore} →
        </a>
      </div>
    </div>
  );
}

export default EducationPanel;
