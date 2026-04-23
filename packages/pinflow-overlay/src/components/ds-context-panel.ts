/**
 * DsContextPanel - Collapsible props/state display
 *
 * A reusable component for displaying component props and state
 * in collapsible sections. Used by both element preview and annotation cards.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

/**
 * Context panel component for props/state display
 *
 * @element ds-context-panel
 */
@customElement('ds-context-panel')
export class DsContextPanel extends LitElement {
  @property({ type: Object })
  props: Record<string, unknown> = {};

  @property({ type: Object })
  state: Record<string, unknown> = {};

  @state()
  private propsExpanded = false;

  @state()
  private stateExpanded = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      .section {
        padding-top: var(--ds-space-sm);
        border-top: 1px solid var(--ds-chrome-divider);
      }

      .section + .section {
        margin-top: var(--ds-space-md);
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: 10px;
        cursor: pointer;
        transition:
          color var(--ds-transition-fast),
          background var(--ds-transition-fast),
          border-color var(--ds-transition-fast);
      }

      .section-header:hover {
        color: var(--ds-text-primary);
        background: var(--ds-panel-surface-muted);
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-secondary);
        letter-spacing: 0.01em;
      }

      .section-count {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        padding: 1px 7px;
        border-radius: var(--ds-radius-full);
      }

      .chevron {
        width: 12px;
        height: 12px;
        color: var(--ds-text-tertiary);
        transition: transform var(--ds-transition-fast);
      }

      .chevron.expanded {
        transform: rotate(90deg);
      }

      .section-content {
        display: grid;
        gap: 6px;
        margin-top: 6px;
        padding-top: var(--ds-space-sm);
        border-top: 1px solid var(--ds-chrome-divider);
        max-height: 164px;
        overflow-y: auto;
      }

      .property {
        display: grid;
        grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
        gap: var(--ds-space-sm);
        align-items: start;
        padding: 7px 10px;
        background: var(--ds-card-surface);
        border: 1px solid var(--ds-panel-border-strong);
        border-radius: 10px;
        box-shadow: var(--ds-shadow-sm);
        font-size: var(--ds-font-size-xs);
      }

      .property-name {
        font-family: var(--ds-font-mono);
        color: var(--ds-text-secondary);
        white-space: nowrap;
      }

      .property-value {
        min-width: 0;
        font-family: var(--ds-font-mono);
        color: var(--ds-text-primary);
        overflow-wrap: anywhere;
      }
    `,
  ];

  private formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return 'ƒ()';
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
    }
    return String(value);
  }

  private toggleProps() {
    this.propsExpanded = !this.propsExpanded;
  }

  private toggleState() {
    this.stateExpanded = !this.stateExpanded;
  }

  private renderSection(
    title: string,
    data: Record<string, unknown>,
    expanded: boolean,
    onToggle: () => void,
  ) {
    const count = Object.keys(data).length;
    if (count === 0) return null;

    return html`
      <div class="section">
        <div class="section-header" @click=${onToggle}>
          <div class="section-title">
            ${title}
            <span class="section-count">${count}</span>
          </div>
          <svg
            class="chevron ${expanded ? 'expanded' : ''}"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        ${expanded
          ? html`
              <div class="section-content">
                ${Object.entries(data).map(
                  ([key, value]) => html`
                    <div class="property">
                      <span class="property-name">${key}:</span>
                      <span class="property-value"
                        >${this.formatValue(value)}</span
                      >
                    </div>
                  `,
                )}
              </div>
            `
          : null}
      </div>
    `;
  }

  override render() {
    const propsCount = Object.keys(this.props).length;
    const stateCount = Object.keys(this.state).length;

    // Don't render anything if no data
    if (propsCount === 0 && stateCount === 0) {
      return null;
    }

    return html`
      ${this.renderSection('Eigenschaften', this.props, this.propsExpanded, () =>
        this.toggleProps(),
      )}
      ${this.renderSection('Status', this.state, this.stateExpanded, () =>
        this.toggleState(),
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-context-panel': DsContextPanel;
  }
}
