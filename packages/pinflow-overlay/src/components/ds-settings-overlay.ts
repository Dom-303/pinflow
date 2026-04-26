import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  DispatchProjectDefaults,
  DispatchSessionOverrides,
} from '../core/dispatch-config.js';
import { StoreController } from '../core/store-controller.js';
import type { OverlayTheme, PickerMode } from '../core/types.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import './ds-session-settings.js';
import './ds-workflow-panel.js';
import './ds-annotation-list.js';

@customElement('ds-settings-overlay')
export class DsSettingsOverlay extends LitElement {
  private storeController = new StoreController(this);

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
        width: auto;
        display: block;
        z-index: 4;
        border-radius: 24px;
        overflow: hidden;
      }

      .backdrop {
        position: absolute;
        inset: 0;
        z-index: 0;
        background: var(--ds-bg-primary);
        backdrop-filter: blur(10px);
      }

      .sheet {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        gap: 10px;
        padding: 18px 22px 20px;
        border-radius: 24px;
        border: 0;
        background: var(--ds-bg-primary);
        box-shadow: none;
        overflow: hidden;
      }

      .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .sheet-copy {
        display: grid;
        gap: 3px;
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
        font-size: 18px;
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

      .settings-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 7px;
        padding: 5px;
        border-radius: 15px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-muted);
      }

      .tab-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 1 1 0;
        min-width: 0;
        height: 36px;
        padding: 0 14px;
        border: 1px solid transparent;
        border-radius: 10px;
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
        border-color: var(--ds-panel-border);
      }

      .tab-btn.active {
        background: var(--ds-card-surface-strong);
        color: var(--ds-text-primary);
        border-color: var(--ds-panel-border-strong);
      }

      .tab-btn.active::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 5px;
        width: 14px;
        height: 2px;
        border-radius: 999px;
        background: var(--ds-text-primary);
        transform: translateX(-50%);
      }

      .tab-btn svg {
        width: 17px;
        height: 17px;
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
        overflow-y: auto;
        padding: 2px 2px 0 0;
        scrollbar-width: thin;
        scrollbar-color: color-mix(in srgb, var(--ds-text-tertiary) 34%, transparent)
          transparent;
      }

      .sheet-body::-webkit-scrollbar {
        width: 4px;
      }

      .sheet-body::-webkit-scrollbar-track {
        background: transparent;
      }

      .sheet-body::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--ds-text-tertiary) 30%, transparent);
        border-radius: 999px;
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
        overflow: visible;
      }

      .workspace-stack {
        display: grid;
        gap: 9px;
        height: 100%;
        align-content: start;
      }

      .settings-card {
        display: grid;
        border-radius: 13px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-muted);
        overflow: hidden;
      }

      .settings-card[open] {
        background: var(--ds-panel-surface);
        border-color: var(--ds-panel-border-strong);
      }

      .settings-card-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 46px;
        padding: 11px 12px;
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          color var(--ds-transition-fast);
      }

      .settings-card-summary:hover {
        background: var(--ds-bg-hover);
      }

      .settings-card-summary::-webkit-details-marker {
        display: none;
      }

      .settings-card-copy {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .settings-card-title {
        color: var(--ds-text-primary);
        font-size: 13px;
        font-weight: var(--ds-font-weight-semibold);
      }

      .settings-card-note {
        color: var(--ds-text-secondary);
        font-size: 10.5px;
        line-height: 1.35;
      }

      .settings-card-chevron {
        width: 17px;
        height: 17px;
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--ds-transition-fast);
      }

      .settings-card[open] .settings-card-chevron {
        transform: rotate(180deg);
      }

      .settings-card-body {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid var(--ds-panel-border);
      }

      .settings-card:not([open]) .settings-card-title {
        color: var(--ds-text-secondary);
      }

      .settings-card:not([open]) .settings-card-note {
        color: var(--ds-text-tertiary);
      }

      .segmented-control {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        padding: 4px;
        border-radius: 14px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-pill-surface);
      }

      .segmented-control.picker-mode-control {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .segment-option {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 32px;
        padding: 0 10px;
        border-radius: 10px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        font-family: inherit;
        cursor: default;
      }

      button.segment-option {
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          border-color var(--ds-transition-fast),
          color var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      button.segment-option:hover {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
      }

      button.segment-option:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--ds-brand-primary) 42%, transparent);
        outline-offset: 2px;
      }

      .segment-option.active {
        background: var(--ds-card-surface-strong);
        border-color: var(--ds-panel-border-strong);
        color: var(--ds-text-primary);
      }

      .segment-option.muted {
        opacity: 0.58;
      }

      .segment-option strong {
        font-weight: var(--ds-font-weight-semibold);
      }

      .segment-option small {
        color: var(--ds-text-tertiary);
      }

      .theme-toggle {
        display: grid;
      }

      .theme-option {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        height: 32px;
        border: 1px solid transparent;
        border-radius: 10px;
        background: transparent;
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          border-color var(--ds-transition-fast),
          color var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast);
      }

      .theme-option.active {
        background: var(--ds-card-surface-strong);
        border-color: var(--ds-panel-border-strong);
        color: var(--ds-text-primary);
        box-shadow: var(--ds-shadow-sm);
      }

      .theme-option svg {
        width: 15px;
        height: 15px;
      }

      .panel-frame {
        height: 100%;
        min-height: 0;
        overflow: visible;
      }

      :host([theme='light']) .settings-card,
      :host([theme='light']) .settings-nav {
        background: rgba(255, 253, 250, 0.72);
      }

      :host([theme='light']) .settings-card[open],
      :host([theme='light']) .tab-btn.active {
        background: rgba(255, 254, 251, 0.96);
      }

      :host([theme='dark']) .sheet {
        background: #050403;
      }

      :host([theme='dark']) .settings-nav {
        background: #070605;
        border-color: rgba(36, 28, 22, 0.92);
      }

      :host([theme='dark']) .tab-btn {
        color: #817366;
      }

      :host([theme='dark']) .tab-btn:hover {
        background: #0e0b09;
        border-color: rgba(48, 37, 29, 0.82);
        color: #d7cabc;
      }

      :host([theme='dark']) .tab-btn.active {
        background: #12100d;
        border-color: rgba(72, 53, 37, 0.88);
        color: #fff7eb;
      }

      :host([theme='dark']) .settings-card {
        background: #080706;
        border-color: rgba(38, 30, 24, 0.9);
      }

      :host([theme='dark']) .settings-card[open] {
        background: #0d0b09;
        border-color: rgba(62, 47, 35, 0.88);
      }

      :host([theme='dark']) .settings-card-summary:hover {
        background: #100d0a;
      }

      :host([theme='dark']) .settings-card-body {
        border-top-color: rgba(42, 33, 26, 0.86);
      }

      :host([theme='dark']) .segmented-control {
        background: #0b0907;
        border-color: rgba(42, 33, 26, 0.86);
      }

      :host([theme='dark']) .segment-option.active,
      :host([theme='dark']) .theme-option.active {
        background: #17120d;
        border-color: rgba(72, 53, 37, 0.88);
      }

      :host([theme='dark']) .settings-card-title {
        color: #f6ecdf;
      }

      :host([theme='dark']) .settings-card-note {
        color: #988878;
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

  private setTheme(theme: OverlayTheme) {
    this.storeController.store.setTheme(theme);
  }

  private setPickerMode(pickerMode: PickerMode) {
    this.storeController.store.setPickerMode(pickerMode);
  }

  private getPickerModeNote(pickerMode: PickerMode): string {
    if (pickerMode === 'region') {
      return 'Bereiche werden per Ziehen markiert und mit Koordinaten uebergeben.';
    }
    if (pickerMode === 'multi') {
      return 'Mehrere Elemente werden gesammelt und gemeinsam bestaetigt.';
    }
    return 'Ein Klick waehlt ein einzelnes Element mit Quellkontext.';
  }

  override render() {
    const { theme, pickerMode } = this.storeController.state;

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

        <nav class="settings-nav" role="tablist" aria-label="Einstellungsbereiche">
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
        </nav>

        <div class="sheet-body scrollable">
          <div
            class="tab-panel ${this.activeTab === 'workspace' ? 'active' : ''}"
            role="tabpanel"
          >
            <div class="panel-surface workspace-stack">
              <details class="settings-card">
                <summary class="settings-card-summary">
                  <span class="settings-card-copy">
                    <span class="settings-card-title">Elementwahl</span>
                    <span class="settings-card-note">
                      ${this.getPickerModeNote(pickerMode)}
                    </span>
                  </span>
                  <svg class="settings-card-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </summary>
                <div class="settings-card-body">
                  <div
                    class="segmented-control picker-mode-control"
                    role="group"
                    aria-label="Picker-Modus"
                  >
                    ${[
                      ['element', 'Element'],
                      ['region', 'Bereich'],
                      ['multi', 'Mehrfach'],
                    ].map(
                      ([value, label]) => html`
                        <button
                          type="button"
                          class="segment-option ${pickerMode === value ? 'active' : ''}"
                          @click=${() => this.setPickerMode(value as PickerMode)}
                          aria-pressed=${pickerMode === value}
                        >
                          <strong>${label}</strong>
                        </button>
                      `,
                    )}
                  </div>
                </div>
              </details>

              <details class="settings-card">
                <summary class="settings-card-summary">
                  <span class="settings-card-copy">
                    <span class="settings-card-title">Darstellung</span>
                    <span class="settings-card-note">
                      Helle oder dunkle Arbeitsflaeche.
                    </span>
                  </span>
                  <svg class="settings-card-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </summary>
                <div class="settings-card-body">
                  <div class="segmented-control theme-toggle" role="group" aria-label="Darstellung">
                    <button
                      class="theme-option ${theme === 'light' ? 'active' : ''}"
                      @click=${() => this.setTheme('light')}
                      aria-pressed=${theme === 'light'}
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
                          d="M12 3v2M12 19v2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M3 12h2M19 12h2M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                      </svg>
                      Hell
                    </button>
                    <button
                      class="theme-option ${theme === 'dark' ? 'active' : ''}"
                      @click=${() => this.setTheme('dark')}
                      aria-pressed=${theme === 'dark'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M20.25 14.35A7.85 7.85 0 0 1 9.65 3.75 8.25 8.25 0 1 0 20.25 14.35Z"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      Dunkel
                    </button>
                  </div>
                </div>
              </details>

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
              <ds-annotation-list variant="list"></ds-annotation-list>
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
