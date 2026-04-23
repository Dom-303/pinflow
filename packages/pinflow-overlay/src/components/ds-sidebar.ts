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
import './ds-settings-overlay.js';

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
  private settingsOpen = false;

  private handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    this.updateScrollState(target);
  }

  private updateScrollState(scrollContainer: HTMLElement) {
    this.isScrolled = scrollContainer.scrollTop > 0;
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
        position: relative;
      }

      /* Scrollable annotations area */
      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px 16px 8px;
      }

      .workspace-top {
        display: grid;
        gap: 8px;
      }

      .section-title {
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0;
      }

      .context-drawer {
        border: 1px solid var(--ds-panel-border);
        border-radius: 18px;
        background: color-mix(
          in srgb,
          var(--ds-panel-surface) 88%,
          transparent
        );
        overflow: hidden;
        transition:
          border-color var(--ds-transition-fast),
          background var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast);
      }

      .context-drawer[open] {
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-sm);
      }

      .context-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 11px 13px;
        cursor: pointer;
      }

      .context-summary::-webkit-details-marker {
        display: none;
      }

      .context-copy {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .context-kicker {
        margin: 0;
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .context-title {
        margin: 0;
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: -0.01em;
      }

      .context-subtitle {
        margin: 0;
        color: var(--ds-text-secondary);
        font-size: 11px;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .context-copy-text {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .context-meta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: 11px;
        white-space: nowrap;
      }

      .context-meta strong {
        color: var(--ds-text-primary);
        font-weight: var(--ds-font-weight-medium);
      }

      .context-chevron {
        width: 18px;
        height: 18px;
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--ds-transition-fast);
      }

      .context-drawer[open] .context-chevron {
        transform: rotate(180deg);
      }

      .context-body {
        display: grid;
        gap: 8px;
        padding: 0 13px 13px;
      }

      .composer-dock {
        display: grid;
        gap: 8px;
        padding: 10px 16px 16px;
        border-top: 1px solid var(--ds-shell-border-soft);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--ds-bg-primary) 82%, transparent),
            var(--ds-bg-primary)
          ),
          radial-gradient(circle at bottom right, var(--ds-shell-glow), transparent 42%);
        backdrop-filter: blur(22px);
        box-shadow: 0 -12px 26px rgba(0, 0, 0, 0.08);
      }

      .dock-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .dock-copy {
        min-width: 0;
      }

      .dock-title {
        margin: 0;
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
      }
    `,
  ];

  private handleOpenSettings() {
    this.settingsOpen = true;
  }

  private handleCloseSettings() {
    this.settingsOpen = false;
  }

  private handleProjectDefaultsChange(event: CustomEvent) {
    this.storeController.store.updateDispatchProjectDefaults(event.detail);
  }

  private resetSessionOverrides() {
    this.storeController.store.clearDispatchSessionOverrides();
  }

  override render() {
    const { selectedElement } =
      this.storeController.state;
    const selectedLabel = selectedElement
      ? String((selectedElement as { tagName?: string }).tagName ?? 'element').toLowerCase()
      : 'Kein Element';
    const selectedTitle = selectedElement ? `<${selectedLabel}>` : 'Noch kein Element';
    const selectedSubtitle = selectedElement
      ? 'Quelle und Kontext sind verbunden.'
      : 'Element im Canvas markieren.';

    return html`
      <div class="sidebar-content">
        ${this.settingsOpen
          ? html`
              <ds-settings-overlay
                .projectDefaults=${this.storeController.state.dispatchProjectDefaults}
                .sessionOverrides=${this.storeController.state.dispatchSession.overrides}
                @close-settings=${this.handleCloseSettings}
                @project-defaults-change=${this.handleProjectDefaultsChange}
                @reset-session-overrides=${this.resetSessionOverrides}
              ></ds-settings-overlay>
            `
          : null}
        <ds-header
          ?scrolled=${this.isScrolled}
          @open-settings=${this.handleOpenSettings}
        ></ds-header>

        <!-- Scrollable annotations area -->
        <div class="main-content" @scroll=${this.handleScroll}>
          <div class="workspace-top">
            <details class="context-drawer" open>
              <summary class="context-summary">
                <div class="context-copy">
                  <div class="context-copy-text">
                    <div class="context-kicker">Auswahl</div>
                    <h2 class="context-title">${selectedTitle}</h2>
                    <p class="context-subtitle">${selectedSubtitle}</p>
                  </div>
                </div>
                <div class="context-copy">
                  <span class="context-meta"
                    ><strong>${selectedElement ? 'verbunden' : 'offen'}</strong></span
                  >
                  <svg
                    class="context-chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 10l5 5 5-5"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </summary>
              <div class="context-body">
                <ds-element-preview></ds-element-preview>
              </div>
            </details>
          </div>
        </div>

        <div class="composer-dock">
          <div class="dock-head">
            <div class="dock-copy">
              <h2 class="dock-title">Kommentar und Auftrag</h2>
            </div>
          </div>

          <ds-annotation-input
            @open-settings=${this.handleOpenSettings}
          ></ds-annotation-input>
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
