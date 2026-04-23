import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  DispatchProjectDefaults,
  DispatchSessionOverrides,
} from '../core/dispatch-config.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import './ds-session-settings.js';
import './ds-workflow-panel.js';
import './ds-annotation-list.js';

@customElement('ds-settings-overlay')
export class DsSettingsOverlay extends LitElement {
  @property({ type: Object })
  projectDefaults!: DispatchProjectDefaults;

  @property({ type: Object })
  sessionOverrides!: DispatchSessionOverrides;

  @state()
  private activeTab: 'workspace' | 'flow' | 'history' = 'workspace';

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        position: absolute;
        inset: 0;
        display: block;
        z-index: 30;
      }

      .backdrop {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.82), transparent 45%),
          color-mix(in srgb, var(--ds-shell-surface) 88%, rgba(248, 241, 231, 0.92));
        backdrop-filter: blur(18px);
      }

      .sheet {
        position: absolute;
        inset: 14px;
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 10px;
        padding: 16px;
        border-radius: 24px;
        border: 1px solid var(--ds-shell-border-soft);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--ds-shell-surface-strong) 94%, white) 0%,
            color-mix(in srgb, var(--ds-shell-surface) 96%, rgba(255, 255, 255, 0.78)) 100%
          );
        box-shadow: var(--ds-shadow-xl);
        overflow: hidden;
      }

      .sheet-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .sheet-copy {
        display: grid;
        gap: 4px;
        max-width: 300px;
      }

      .eyebrow {
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .title {
        font-size: 20px;
        line-height: 1.05;
        letter-spacing: -0.03em;
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
      }

      .description {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.4;
      }

      .tab-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        border-radius: 16px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface);
        box-shadow: var(--ds-shadow-sm);
      }

      .tab-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-width: 44px;
        height: 40px;
        padding: 0 14px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          color var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .tab-btn:hover {
        color: var(--ds-text-primary);
        background: var(--ds-bg-hover);
      }

      .tab-btn.active {
        background: var(--ds-card-surface-strong);
        color: var(--ds-text-primary);
        box-shadow: var(--ds-shadow-sm);
      }

      .tab-btn svg {
        width: 16px;
        height: 16px;
      }

      .close-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 14px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition:
          transform var(--ds-transition-fast),
          background var(--ds-transition-fast),
          color var(--ds-transition-fast);
      }

      .close-btn:hover {
        transform: translateY(-1px);
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
      }

      .close-btn svg {
        width: 18px;
        height: 18px;
      }

      .sheet-body {
        min-height: 0;
        overflow: hidden;
      }

      .tab-panel {
        display: none;
        min-height: 0;
        height: 100%;
      }

      .tab-panel.active {
        display: block;
      }

      .panel-surface {
        height: 100%;
        min-height: 0;
        padding: 2px;
        overflow: hidden;
      }

      .workspace-stack {
        display: grid;
        gap: 10px;
        height: 100%;
        align-content: start;
      }

      .selection-section {
        display: grid;
        gap: 8px;
        padding: 11px;
        border-radius: 16px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-muted);
      }

      .selection-head {
        display: grid;
        gap: 4px;
      }

      .selection-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .selection-copy {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.4;
      }

      .selection-modes {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .selection-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .selection-pill.active {
        background: var(--ds-card-surface-strong);
        color: var(--ds-text-primary);
        box-shadow: var(--ds-shadow-sm);
      }

      .selection-pill.muted {
        opacity: 0.58;
      }

      .selection-pill strong {
        font-weight: var(--ds-font-weight-semibold);
      }

      .selection-pill small {
        color: var(--ds-text-tertiary);
      }

      .panel-frame {
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
    `,
  ];

  private selectTab(tab: 'workspace' | 'flow' | 'history') {
    this.activeTab = tab;
  }

  private handleClose() {
    this.dispatchEvent(
      new CustomEvent('close-settings', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`
      <div class="backdrop" @click=${this.handleClose}></div>
      <section class="sheet" aria-label="PinFlow Einstellungen">
        <div class="sheet-header">
          <div class="sheet-copy">
            <div class="eyebrow">Einstellungen</div>
            <div class="title">Arbeitsbereich anpassen</div>
            <div class="description">
              Bereich oben waehlen und gezielt anpassen.
            </div>
          </div>
          <button
            class="close-btn"
            @click=${this.handleClose}
            aria-label="Einstellungen schliessen"
            title="Einstellungen schliessen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="sheet-body">
          <div class="tab-bar" role="tablist" aria-label="Einstellungsbereiche">
            <button
              class="tab-btn ${this.activeTab === 'workspace' ? 'active' : ''}"
              @click=${() => this.selectTab('workspace')}
              role="tab"
              aria-selected=${this.activeTab === 'workspace'}
              title="Arbeitsbereich"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7h16M4 12h10M4 17h16"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button
              class="tab-btn ${this.activeTab === 'flow' ? 'active' : ''}"
              @click=${() => this.selectTab('flow')}
              role="tab"
              aria-selected=${this.activeTab === 'flow'}
              title="Flow und Versand"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h5l2-5 3 10 2-5h2"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              class="tab-btn ${this.activeTab === 'history' ? 'active' : ''}"
              @click=${() => this.selectTab('history')}
              role="tab"
              aria-selected=${this.activeTab === 'history'}
              title="Verlauf"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 7v5l3 2m6-2a9 9 0 1 1-2.64-6.36"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          <div
            class="tab-panel ${this.activeTab === 'workspace' ? 'active' : ''}"
            role="tabpanel"
          >
            <div class="panel-surface workspace-stack">
              <div class="selection-section">
                <div class="selection-head">
                  <div class="selection-title">Elementwahl</div>
                  <div class="selection-copy">
                    Rahmenbasierte Elementwahl ist aktiv. Ausschnitt-Modus kann spaeter
                    dazukommen.
                  </div>
                </div>
                <div class="selection-modes">
                  <span class="selection-pill active"><strong>Element</strong></span>
                  <span class="selection-pill muted"
                    ><strong>Ausschnitt</strong><small>später</small></span
                  >
                </div>
              </div>

              <ds-session-settings
                .projectDefaults=${this.projectDefaults}
                .sessionOverrides=${this.sessionOverrides}
              ></ds-session-settings>
            </div>
          </div>

          <div
            class="tab-panel ${this.activeTab === 'flow' ? 'active' : ''}"
            role="tabpanel"
          >
            <div class="panel-frame">
              <ds-workflow-panel></ds-workflow-panel>
            </div>
          </div>

          <div
            class="tab-panel ${this.activeTab === 'history' ? 'active' : ''}"
            role="tabpanel"
          >
            <div class="panel-frame">
              <ds-annotation-list></ds-annotation-list>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-settings-overlay': DsSettingsOverlay;
  }
}
