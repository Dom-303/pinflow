/**
 * DsHeader - Sidebar header component
 *
 * Minimal header with branding and quick actions.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import { getThemeIconAsset } from './logo/index.js';

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
        padding: 10px 12px 9px;
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
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding-top: 1px;
      }

      .brand-copy {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .brand-logo-badge {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        border-radius: 9px;
        background: transparent;
      }

      .brand-logo-img {
        display: block;
        width: 28px;
        height: 28px;
        object-fit: contain;
        border-radius: 8px;
      }

      .brand-wordmark {
        font-size: 0.98rem;
        line-height: 1;
        letter-spacing: 0;
        font-weight: 700;
        color: var(--ds-text-primary);
      }

      .brand-meta {
        display: inline-flex;
        align-items: center;
      }

      .brand-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 7px;
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
        background: var(--ds-text-tertiary);
      }

      .brand-status.active {
        color: var(--ds-text-primary);
        border-color: color-mix(in srgb, var(--ds-brand-primary) 32%, var(--ds-pill-border));
        background: color-mix(in srgb, var(--ds-brand-primary) 10%, var(--ds-note-surface));
      }

      .brand-status.active::before {
        background: var(--ds-brand-primary);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--ds-brand-primary) 18%, transparent);
      }

      .brand-status.inactive {
        color: var(--ds-text-tertiary);
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 5px;
        padding-top: 0;
      }

      .btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: var(--ds-shell-surface-quiet);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 9px;
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
        width: 15px;
        height: 15px;
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

  private handleMinimize() {
    this.dispatchEvent(
      new CustomEvent('minimize-sidebar', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleToggleTheme() {
    this.storeController.store.toggleTheme();
  }

  override render() {
    const { relayConnected, theme } = this.storeController.state;
    const isDark = theme === 'dark';
    const statusLabel = relayConnected ? 'aktiv' : 'nicht aktiv';

    return html`
      <div class="header-row">
        <div class="brand">
          <span class="brand-logo-badge" aria-hidden="true">
            <img
              class="brand-logo-img"
              src=${getThemeIconAsset(theme)}
              alt=""
              width="28"
              height="28"
            />
          </span>
          <div class="brand-copy">
            <span class="brand-wordmark">PinFlow</span>
            <div class="brand-meta">
              <span
                class="brand-status ${relayConnected ? 'active' : 'inactive'}"
                title=${relayConnected
                  ? 'PinFlow ist mit dem lokalen Relay verbunden'
                  : 'PinFlow wartet auf die lokale Relay-Verbindung'}
                aria-label=${`PinFlow ${statusLabel}`}
              >
                ${statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <button
            class="btn-icon"
            @click=${this.handleMinimize}
            title="Arbeitsbereich minimieren"
            aria-label="Arbeitsbereich minimieren"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 12h12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>

          <button
            class="btn-icon"
            @click=${this.handleToggleTheme}
            title=${isDark ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
            aria-label="Darstellung wechseln"
          >
            ${isDark
              ? html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                  <path
                    d="M12 2.75v2M12 19.25v2M4.45 4.45l1.42 1.42M18.13 18.13l1.42 1.42M2.75 12h2M19.25 12h2M4.45 19.55l1.42-1.42M18.13 5.87l1.42-1.42"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>`
              : html`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M20.25 14.35A7.85 7.85 0 0 1 9.65 3.75 8.25 8.25 0 1 0 20.25 14.35Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>`}
          </button>

          <button
            class="btn-icon"
            @click=${this.handleOpenSettings}
            title="Einstellungen oeffnen"
            aria-label="Einstellungen oeffnen"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                stroke-width="1.7"
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
