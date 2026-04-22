/**
 * DsTooltip - Floating element info tooltip
 *
 * Displays information about the hovered element during capture mode.
 * Shows tag name, component name (if available), and data-ds ID.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { themeStyles } from '../styles/theme.js';
import { BridgeDispatch } from '@domscribe/runtime';

/**
 * Tooltip component for element info
 *
 * @element ds-tooltip
 */
@customElement('ds-tooltip')
export class DsTooltip extends LitElement {
  @property({ type: Object })
  element: HTMLElement | null = null;

  @property({ type: Number })
  x = 0;

  @property({ type: Number })
  y = 0;

  static override styles = [
    themeStyles,
    css`
      :host {
        display: block;
        position: fixed;
        pointer-events: none;
        z-index: var(--ds-z-picker);
      }

      .tooltip {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: var(--ds-space-xs);
        padding: var(--ds-space-sm) var(--ds-space-md);
        background: var(--ds-tooltip-surface);
        border: 1px solid var(--ds-panel-border);
        border-radius: calc(var(--ds-radius-md) + 2px);
        box-shadow: var(--ds-panel-shadow);
        backdrop-filter: var(--ds-shell-blur);
        font-size: var(--ds-font-size-sm);
        white-space: nowrap;
        transform: translate(12px, 12px);
      }

      .tag {
        display: flex;
        align-items: center;
        gap: var(--ds-space-sm);
      }

      .tag-name {
        font-family: var(--ds-font-mono);
        color: var(--ds-text-accent);
        font-weight: var(--ds-font-weight-medium);
      }

      .component-name {
        color: var(--ds-brand-secondary);
        font-weight: var(--ds-font-weight-medium);
      }

      .element-id {
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
      }

      .no-id {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        font-style: italic;
      }
    `,
  ];

  private getElementInfo() {
    if (!this.element) return null;

    const tagName = this.element.tagName.toLowerCase();
    const dataDs = this.element.getAttribute('data-ds');
    const componentName = this.getComponentName();

    return { tagName, dataDs, componentName };
  }

  private getComponentName(): string | null {
    if (!this.element) return null;
    const entryId = this.element.getAttribute('data-ds');
    if (!entryId) return null;
    try {
      return BridgeDispatch.getInstance().getComponentName(entryId);
    } catch {
      return null;
    }
  }

  override render() {
    const info = this.getElementInfo();
    if (!info) return null;

    const style = `
      left: ${this.x}px;
      top: ${this.y}px;
    `;

    return html`
      <div class="tooltip" style=${style}>
        <div class="tag">
          <span class="tag-name">&lt;${info.tagName}&gt;</span>
          ${info.componentName
            ? html`<span class="component-name">${info.componentName}</span>`
            : null}
        </div>
        ${info.dataDs
          ? html`<span class="element-id">data-ds="${info.dataDs}"</span>`
          : html`<span class="no-id">Kein data-ds-Attribut</span>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tooltip': DsTooltip;
  }
}
