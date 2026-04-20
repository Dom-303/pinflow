/**
 * DsSidebar - Main sidebar container
 *
 * Layout structure:
 * - Header (branding + close)
 * - Scrollable annotations list
 * - Fixed action zone (capture, selected element, input, status)
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import child components
import './ds-header.js';
import './ds-element-preview.js';
import './ds-annotation-input.js';
import './ds-annotation-list.js';
import './ds-workflow-panel.js';

/**
 * Main sidebar component
 *
 * @element ds-sidebar
 */
@customElement('ds-sidebar')
export class DsSidebar extends LitElement {
  private storeController = new StoreController(this);

  @state()
  private isScrolled = false;

  @state()
  private hasMoreBelow = false;

  private handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    this.updateScrollState(target);
  }

  private updateScrollState(scrollContainer: HTMLElement) {
    // Header shadow: content scrolled down (content behind header)
    this.isScrolled = scrollContainer.scrollTop > 0;
    // Action zone shadow: more content below (content behind action zone)
    this.hasMoreBelow =
      scrollContainer.scrollTop + scrollContainer.clientHeight <
      scrollContainer.scrollHeight - 1;
  }

  override firstUpdated() {
    // Check initial scroll state after first render
    requestAnimationFrame(() => {
      const mainContent = this.shadowRoot?.querySelector('.main-content');
      if (mainContent) {
        this.updateScrollState(mainContent as HTMLElement);
      }
    });
  }

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 12px;
        right: 12px;
        bottom: 12px;
        width: var(--ds-sidebar-width);
        background:
          radial-gradient(circle at top right, var(--ds-shell-glow), transparent 34%),
          var(--ds-shell-gradient);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 24px;
        box-shadow: var(--ds-shadow-xl);
        overflow: hidden;
      }

      .sidebar-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }

      /* Scrollable annotations area */
      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px 16px 12px;
      }

      .section-title {
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0;
      }

      .content-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-space-md);
        margin-bottom: 14px;
      }

      .theme-switch {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 2px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: var(--ds-radius-full);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .theme-option {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 9px;
        background: transparent;
        border: none;
        border-radius: var(--ds-radius-full);
        color: var(--ds-text-secondary);
        font-family: inherit;
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-medium);
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          color var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .theme-option:hover {
        color: var(--ds-text-primary);
      }

      .theme-option.active {
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
        box-shadow: var(--ds-shadow-sm);
      }

      .theme-option svg {
        width: 12px;
        height: 12px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--ds-space-xl);
        color: var(--ds-text-tertiary);
        text-align: center;
      }

      .empty-state-icon {
        width: 48px;
        height: 48px;
        margin-bottom: var(--ds-space-md);
        opacity: 0.5;
      }

      /* Fixed action zone at bottom */
      .action-zone {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: var(--ds-space-md);
        padding: 16px;
        background: var(--ds-shell-surface-soft);
        backdrop-filter: var(--ds-shell-blur);
        border-top: 1px solid var(--ds-shell-border-soft);
        transition: box-shadow var(--ds-transition-fast);
      }

      .action-zone.has-more {
        box-shadow: var(--ds-shell-shadow-float);
      }

      /* Status bar - right-aligned */
      .status-bar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.01em;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .status-dot.connected {
        background: var(--ds-success);
      }

      .status-dot.disconnected {
        background: var(--ds-error);
      }
    `,
  ];

  private handleThemeChange(theme: 'light' | 'dark') {
    this.storeController.store.setTheme(theme);
  }

  override render() {
    const { selectedElement, annotations, relayConnected, theme } =
      this.storeController.state;

    return html`
      <div class="sidebar-content">
        <ds-header ?scrolled=${this.isScrolled}></ds-header>

        <!-- Scrollable annotations area -->
        <div class="main-content" @scroll=${this.handleScroll}>
          <div class="content-header">
            <div class="section-title">Anmerkungen (${annotations.length})</div>
            <div class="theme-switch" aria-label="Farbschema">
              <button
                class="theme-option ${theme === 'light' ? 'active' : ''}"
                @click=${() => this.handleThemeChange('light')}
                aria-label="Hellmodus aktivieren"
                title="Hellmodus aktivieren"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                  <path
                    d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  />
                </svg>
                Hell
              </button>
              <button
                class="theme-option ${theme === 'dark' ? 'active' : ''}"
                @click=${() => this.handleThemeChange('dark')}
                aria-label="Dunkelmodus aktivieren"
                title="Dunkelmodus aktivieren"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M20 15.5A8.5 8.5 0 118.5 4a7 7 0 0011.5 11.5z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linejoin="round"
                  />
                </svg>
                Dunkel
              </button>
            </div>
          </div>
          ${html`<ds-annotation-list></ds-annotation-list>`}
        </div>

        <!-- Fixed action zone -->
        <div class="action-zone ${this.hasMoreBelow ? 'has-more' : ''}">
          <!-- Selected element (only shown when element is selected) -->
          ${selectedElement
            ? html`<ds-element-preview></ds-element-preview>`
            : null}

          <ds-workflow-panel></ds-workflow-panel>

          <!-- Annotation input with integrated capture button -->
          <ds-annotation-input></ds-annotation-input>

          <!-- Status bar -->
          <div class="status-bar">
            <span
              class="status-dot ${relayConnected
                ? 'connected'
                : 'disconnected'}"
            ></span>
            <span>${relayConnected ? 'Verbunden' : 'Nicht verbunden'}</span>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-sidebar': DsSidebar;
  }
}
