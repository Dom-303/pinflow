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
import { logoSvg } from './logo/index.js';

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

      .workspace-grip {
        position: absolute;
        left: -20px;
        top: 50%;
        transform: translateY(-50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 60px;
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 20px 0 0 20px;
        background: var(--ds-shell-surface-strong);
        box-shadow: var(--ds-shadow-lg);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition:
          color var(--ds-transition-fast),
          transform var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast);
        z-index: 2;
      }

      .workspace-grip:hover {
        color: var(--ds-text-primary);
        transform: translateY(-50%) translateX(-2px);
        box-shadow: var(--ds-shadow-xl);
      }

      .workspace-grip svg {
        width: 22px;
        height: 22px;
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
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--ds-space-md);
        margin-bottom: 14px;
      }

      .title-group {
        display: grid;
        gap: 4px;
      }

      .content-title {
        font-size: var(--ds-font-size-lg);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: -0.03em;
        margin: 0;
      }

      .content-copy {
        margin: 0;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
        max-width: 220px;
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

      .composer-intro {
        display: grid;
        gap: 4px;
      }

      .composer-title {
        margin: 0;
        font-size: var(--ds-font-size-md);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: -0.02em;
      }

      .composer-copy {
        margin: 0;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      /* Status bar - right-aligned */
      .status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.01em;
      }

      .status-connection {
        display: inline-flex;
        align-items: center;
        gap: var(--ds-space-xs);
      }

      .status-shortcut {
        color: var(--ds-text-tertiary);
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

  private handleCollapse() {
    this.storeController.store.setMode('collapsed');
  }

  override render() {
    const { selectedElement, annotations, relayConnected, theme } =
      this.storeController.state;
    const gripColor = theme === 'dark' ? '#f3ede2' : '#b45309';

    return html`
      <div class="sidebar-content">
        <button
          class="workspace-grip"
          @click=${this.handleCollapse}
          title="PinFlow einklappen"
          aria-label="PinFlow einklappen"
        >
          ${logoSvg({ size: 22, color: gripColor, variant: 'full' })}
        </button>
        <ds-header ?scrolled=${this.isScrolled}></ds-header>

        <!-- Scrollable annotations area -->
        <div class="main-content" @scroll=${this.handleScroll}>
          <div class="content-header">
            <div class="title-group">
              <div class="section-title">Arbeitsverlauf</div>
              <h2 class="content-title">Anmerkungen (${annotations.length})</h2>
              <p class="content-copy">
                Letzte Hinweise, Status und Antworten
              </p>
            </div>
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

          <div class="composer-intro">
            <div class="section-title">Naechster Schritt</div>
            <h3 class="composer-title">Aenderung formulieren</h3>
            <p class="composer-copy">
              Markiere ein Element, beschreibe die Aenderung und sende sie
              direkt in deinen Arbeitsfluss.
            </p>
          </div>

          <ds-workflow-panel></ds-workflow-panel>

          <!-- Annotation input with integrated capture button -->
          <ds-annotation-input></ds-annotation-input>

          <!-- Status bar -->
          <div class="status-bar">
            <span class="status-connection">
              <span
                class="status-dot ${relayConnected
                  ? 'connected'
                  : 'disconnected'}"
              ></span>
              <span>${relayConnected ? 'Verbunden' : 'Nicht verbunden'}</span>
            </span>
            <span class="status-shortcut">Strg+Enter senden</span>
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
