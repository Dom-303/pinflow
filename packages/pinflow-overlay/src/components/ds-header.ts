/**
 * DsHeader - Sidebar header component
 *
 * Minimal header with branding and quick actions.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import { logoSvg } from './logo/index.js';

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
        padding: 14px 16px 10px;
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
        gap: 12px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: var(--ds-space-sm);
        min-width: 0;
      }

      .brand-copy {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .brand-logo-badge {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        border-radius: 12px;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.92), transparent 70%),
          linear-gradient(180deg, rgba(255, 252, 247, 0.94), rgba(242, 234, 224, 0.92));
        border: 1px solid var(--ds-shell-border-soft);
        box-shadow: var(--ds-shadow-sm);
      }

      .brand-logo-badge svg {
        filter: drop-shadow(var(--ds-tab-shadow));
      }

      .brand-wordmark {
        font-size: 1.02rem;
        line-height: 1;
        letter-spacing: -0.04em;
        font-weight: 700;
        color: var(--ds-text-primary);
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

      .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
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
        transform: translateY(-1px);
      }

      .btn-icon svg {
        width: 17px;
        height: 17px;
      }
    `,
  ];

  private handleClose() {
    this.storeController.store.setMode('collapsed');
  }

  private handleOpenSettings() {
    this.dispatchEvent(
      new CustomEvent('open-settings', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`
      <div class="header-row">
        <div class="brand">
          <span class="brand-logo-badge" aria-hidden="true">
            ${logoSvg({ size: 24, variant: 'full' })}
          </span>
          <div class="brand-copy">
            <div class="brand-meta">
              <span class="brand-kicker">Arbeitsbereich</span>
              <span class="brand-status">Session aktiv</span>
            </div>
            <span class="brand-wordmark">PinFlow</span>
          </div>
        </div>

        <div class="header-actions">
          <button
            class="btn-icon"
            @click=${this.handleOpenSettings}
            title="Einstellungen oeffnen"
            aria-label="Einstellungen oeffnen"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M10.5 4.5h3l.8 2.14 2.26.94 2.03-.84 2.12 2.12-.85 2.02.94 2.27 2.2.85v3l-2.13.8-.94 2.26.85 2.03-2.12 2.12-2.02-.85-2.27.94-.85 2.2h-3l-.8-2.13-2.26-.94-2.03.85-2.12-2.12.85-2.02-.94-2.27-2.2-.85v-3l2.13-.8.94-2.26-.85-2.03 2.12-2.12 2.02.85 2.27-.94.85-2.2Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3.2"
                stroke="currentColor"
                stroke-width="1.8"
              />
            </svg>
          </button>

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
              <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-header': DsHeader;
  }
}
