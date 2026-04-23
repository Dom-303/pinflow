/**
 * DsHeader - Sidebar header component
 *
 * Minimal header with branding and close button only.
 * Capture and connection status moved to bottom action zone.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import { getThemeIconAsset, getThemeWordmarkAsset } from './logo/index.js';

/**
 * Sidebar header component
 *
 * @element ds-header
 */
@customElement('ds-header')
export class DsHeader extends LitElement {
  private storeController = new StoreController(this);

  @property({ type: Boolean, reflect: true })
  scrolled = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
        padding: 16px 16px 12px;
        background: var(--ds-shell-surface);
        backdrop-filter: var(--ds-shell-blur);
        border-bottom: 1px solid var(--ds-shell-border-muted);
        transition: box-shadow var(--ds-transition-fast);
        position: relative;
        z-index: 1;
      }

      :host([scrolled]) {
        box-shadow: var(--ds-shell-shadow-raise);
      }

      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .brand {
        display: flex;
        align-items: flex-start;
        gap: var(--ds-space-sm);
      }

      .brand-copy {
        display: grid;
        gap: 4px;
      }

      .brand-logo {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        display: block;
        object-fit: contain;
        border-radius: 8px;
        margin-top: 2px;
      }

      .brand-wordmark {
        width: 104px;
        height: auto;
        display: block;
        object-fit: contain;
      }

      .brand-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 14px;
        flex-wrap: wrap;
      }

      .brand-kicker {
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        border-radius: var(--ds-radius-full);
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        color: var(--ds-text-secondary);
        font-size: 10px;
        font-weight: var(--ds-font-weight-medium);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .brand-subtext {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        line-height: 1.45;
        max-width: 220px;
      }

      .brand-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 7px;
        border-radius: var(--ds-radius-full);
        background: var(--ds-note-surface);
        border: 1px solid var(--ds-pill-border);
        color: var(--ds-text-secondary);
        font-size: 10px;
        font-weight: var(--ds-font-weight-medium);
      }

      .brand-status::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ds-brand-primary);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--ds-brand-primary) 18%, transparent);
      }

      .btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        background: var(--ds-shell-surface-quiet);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: var(--ds-radius-md);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
      }

      .btn-icon:hover {
        background: var(--ds-highlight);
        color: var(--ds-text-primary);
      }

      .btn-icon svg {
        width: 18px;
        height: 18px;
      }
    `,
  ];

  private handleClose() {
    this.storeController.store.setMode('collapsed');
  }

  override render() {
    const { theme } = this.storeController.state;

    return html`
      <div class="header-row">
        <div class="brand">
          <img
            class="brand-logo"
            src=${getThemeIconAsset(theme)}
            alt="PinFlow Logo"
          />
          <div class="brand-copy">
            <div class="brand-meta">
              <span class="brand-kicker">Arbeitsbereich</span>
              <span class="brand-status">Session live</span>
            </div>
            <img
              class="brand-wordmark"
              src=${getThemeWordmarkAsset(theme)}
              alt="PinFlow"
            />
            <span class="brand-subtext"
              >Auswahl, Kommentare und Versand im aktuellen Flow</span
            >
          </div>
        </div>

        <button
          class="btn-icon"
          @click=${this.handleClose}
          title="Schliessen (ESC)"
          aria-label="Seitenleiste schliessen"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-header': DsHeader;
  }
}
