import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  DispatchContinuationMode,
  DispatchChannel,
  DispatchMode,
  DispatchProjectDefaults,
  DispatchSessionOverrides,
} from '../core/dispatch-config.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

@customElement('ds-session-settings')
export class DsSessionSettings extends LitElement {
  private storeController = new StoreController(this);

  @property({ type: Object })
  projectDefaults!: DispatchProjectDefaults;

  @property({ type: Object })
  sessionOverrides!: DispatchSessionOverrides;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      .section {
        display: grid;
        gap: 8px;
        border-radius: 13px;
        background: var(--ds-panel-surface-muted);
        border: 1px solid var(--ds-panel-border);
        overflow: hidden;
      }

      .section + .section {
        margin-top: 8px;
      }

      .section[open] {
        background: var(--ds-panel-surface);
        border-color: var(--ds-panel-border-strong);
      }

      .section-summary {
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

      .section-summary:hover {
        background: var(--ds-bg-hover);
      }

      .section-summary::-webkit-details-marker {
        display: none;
      }

      .summary-copy {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .section-title {
        font-size: 13px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-primary);
        letter-spacing: 0;
        text-transform: none;
      }

      .section-copy {
        color: var(--ds-text-tertiary);
        font-size: 10.5px;
        line-height: 1.35;
      }

      .section-chevron {
        width: 17px;
        height: 17px;
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--ds-transition-fast);
      }

      .section[open] .section-chevron {
        transform: rotate(180deg);
      }

      .section-body {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid var(--ds-panel-border);
      }

      .section:not([open]) .section-title {
        color: var(--ds-text-secondary);
      }

      .section:not([open]) .section-copy {
        color: var(--ds-text-tertiary);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .summary-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .summary-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: 999px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .summary-pill strong {
        color: var(--ds-text-primary);
        font-weight: var(--ds-font-weight-semibold);
      }

      label {
        display: grid;
        gap: 5px;
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
      }

      select {
        width: 100%;
        padding: 7px 9px;
        background: var(--ds-panel-surface);
        border: 1px solid var(--ds-panel-border);
        border-radius: 10px;
        color: var(--ds-text-primary);
        font: inherit;
        transition:
          border-color var(--ds-transition-fast),
          background var(--ds-transition-fast);
      }

      select:hover {
        border-color: var(--ds-panel-border-strong);
      }

      select:focus-visible {
        outline: 2px solid
          color-mix(in srgb, var(--ds-brand-primary) 45%, transparent);
        outline-offset: 2px;
      }

      .session-note {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        line-height: 1.35;
      }

      .session-state {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 9px;
        border-radius: 12px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .session-state::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--ds-text-tertiary);
      }

      .session-state.active::before {
        background: var(--ds-brand-primary);
      }

      .effective-state {
        display: grid;
        gap: 7px;
        padding: 9px;
        border-radius: 12px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface);
      }

      .effective-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .session-overrides {
        display: grid;
        gap: 7px;
        padding: 9px;
        border-radius: 12px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface);
      }

      .session-overrides-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .reset-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 10px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: 10px;
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
        transition:
          border-color var(--ds-transition-fast),
          color var(--ds-transition-fast),
          background var(--ds-transition-fast);
      }

      .reset-btn:hover {
        color: var(--ds-text-primary);
        background: var(--ds-panel-surface-strong);
        border-color: var(--ds-panel-border-strong);
      }

      :host([theme='light']) .section {
        background: rgba(255, 253, 250, 0.72);
      }

      :host([theme='light']) .section[open] {
        background: rgba(255, 254, 251, 0.96);
      }

      :host([theme='dark']) .section {
        background: #080706;
        border-color: rgba(38, 30, 24, 0.9);
      }

      :host([theme='dark']) .section[open] {
        background: #0d0b09;
        border-color: rgba(62, 47, 35, 0.88);
      }

      :host([theme='dark']) .section-summary:hover {
        background: #100d0a;
      }

      :host([theme='dark']) .section-body {
        border-top-color: rgba(42, 33, 26, 0.86);
      }

      :host([theme='dark']) .section-title {
        color: #f6ecdf;
      }

      :host([theme='dark']) .section-copy,
      :host([theme='dark']) .session-note {
        color: #988878;
      }

      :host([theme='dark']) .section:not([open]) .section-title {
        color: #b5a696;
      }

      :host([theme='dark']) .summary-pill,
      :host([theme='dark']) .session-state {
        background: #12100d;
        border-color: rgba(50, 38, 29, 0.76);
      }

      :host([theme='dark']) select,
      :host([theme='dark']) .effective-state,
      :host([theme='dark']) .session-overrides {
        background: #0a0807;
        border-color: rgba(48, 37, 29, 0.84);
      }
    `,
  ];

  private handleProjectModeChange(event: Event) {
    this.dispatchEvent(
      new CustomEvent('project-defaults-change', {
        detail: {
          mode: (event.target as HTMLSelectElement).value as DispatchMode,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleProjectThresholdChange(event: Event) {
    this.dispatchEvent(
      new CustomEvent('project-defaults-change', {
        detail: {
          threshold: Number((event.target as HTMLSelectElement).value),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleProjectConcurrencyChange(event: Event) {
    this.dispatchEvent(
      new CustomEvent('project-defaults-change', {
        detail: {
          concurrency: Number((event.target as HTMLSelectElement).value),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleProjectContinuationChange(event: Event) {
    this.dispatchEvent(
      new CustomEvent('project-defaults-change', {
        detail: {
          continuation: (event.target as HTMLSelectElement)
            .value as DispatchContinuationMode,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleResetSession() {
    this.dispatchEvent(
      new CustomEvent('reset-session-overrides', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private getModeLabel(mode: DispatchMode) {
    return mode === 'immediate'
      ? 'Sofort'
      : mode === 'threshold'
        ? 'Ab Menge'
        : 'Manuell';
  }

  private getContinuationLabel(mode: DispatchContinuationMode) {
    return mode === 'automatic'
      ? 'Automatisch starten'
      : mode === 'confirm'
        ? 'Erst Freigabe holen'
        : 'Manuell';
  }

  private getChannelLabel(channel?: DispatchChannel) {
    return channel === 'auto'
      ? 'Aktueller Agent'
      : channel === 'queue_only'
        ? 'Nur sammeln'
        : channel === 'claude'
          ? 'Claude'
          : 'Codex';
  }

  override render() {
    const hasSessionOverrides =
      Object.values(this.sessionOverrides ?? {}).filter(Boolean).length > 0;
    const modeLabel = this.getModeLabel(this.projectDefaults.mode);
    const continuationLabel = this.getContinuationLabel(
      this.projectDefaults.continuation,
    );
    const effectiveChannel =
      this.sessionOverrides.channel ?? this.projectDefaults.channel;
    const effectiveMode =
      this.sessionOverrides.mode ?? this.projectDefaults.mode;
    const effectiveContinuation =
      this.sessionOverrides.continuation ?? this.projectDefaults.continuation;
    const effectiveThreshold =
      this.sessionOverrides.threshold ?? this.projectDefaults.threshold;
    const effectiveConcurrency =
      this.sessionOverrides.concurrency ?? this.projectDefaults.concurrency;
    const theme = this.storeController.state.theme;

    return html`
      <details class="section" data-theme=${theme}>
        <summary class="section-summary">
          <span class="summary-copy">
            <span class="section-title">Standard fuer dieses Projekt</span>
            <span class="section-copy"
              >Gilt fuer neue Aufgaben in diesem Projekt.</span
            >
          </span>
          <svg
            class="section-chevron"
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
        </summary>
        <div class="section-body">
          <div class="summary-strip">
            <span class="summary-pill"
              ><strong>${modeLabel}</strong> Senden</span
            >
            <span class="summary-pill"
              ><strong>${this.projectDefaults.concurrency}</strong>
              gleichzeitig</span
            >
            <span class="summary-pill"
              ><strong>Senden ab ${this.projectDefaults.threshold}</strong></span
            >
            <span class="summary-pill"
              ><strong>${continuationLabel}</strong> Startart</span
            >
          </div>
          <div class="grid">
            <label>
              Wann senden?
              <select
                .value=${this.projectDefaults.mode}
                @change=${this.handleProjectModeChange}
              >
                <option value="manual">Manuell</option>
                <option value="immediate">Sofort</option>
                <option value="threshold">Ab Anzahl</option>
              </select>
            </label>

            <label>
              Gleichzeitig
              <select
                .value=${String(this.projectDefaults.concurrency)}
                @change=${this.handleProjectConcurrencyChange}
              >
                ${Array.from({ length: 10 }, (_, index) => index + 1).map(
                  (value) =>
                    html`<option value=${String(value)}>${value}</option>`,
                )}
              </select>
            </label>

            <label>
              Senden ab
              <select
                .value=${String(this.projectDefaults.threshold)}
                @change=${this.handleProjectThresholdChange}
              >
                ${Array.from({ length: 10 }, (_, index) => index + 1).map(
                  (value) =>
                    html`<option value=${String(value)}>${value}</option>`,
                )}
              </select>
            </label>

            <label>
              Startart
              <select
                .value=${this.projectDefaults.continuation}
                @change=${this.handleProjectContinuationChange}
              >
                <option value="automatic">Automatisch starten</option>
                <option value="confirm">Erst Freigabe holen</option>
                <option value="manual">Manuell</option>
              </select>
            </label>
          </div>
        </div>
      </details>

      <details class="section" data-theme=${theme}>
        <summary class="section-summary">
          <span class="summary-copy">
            <span class="section-title">Nur diese Sitzung</span>
            <span class="section-copy">
              ${hasSessionOverrides
                ? 'Eigene Regeln gelten nur bis zum Schliessen.'
                : 'Diese Sitzung nutzt den Projektstandard.'}
            </span>
          </span>
          <svg
            class="section-chevron"
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
        </summary>
        <div class="section-body">
          <div class="session-state ${hasSessionOverrides ? 'active' : ''}">
            ${hasSessionOverrides
              ? 'Eigene Sitzungsregeln aktiv'
              : 'Nutzt Projektstandard'}
          </div>
          <div class="session-note">
            ${hasSessionOverrides
              ? 'Diese Regeln gelten nur fuer die laufende Sitzung.'
              : 'Keine eigenen Regeln aktiv.'}
          </div>
          <div class="effective-state">
            <div class="effective-title">Aktuell aktiv</div>
            <div class="summary-strip">
              <span class="summary-pill">
                <strong
                  >${hasSessionOverrides
                    ? 'Sitzungsregeln aktiv'
                    : 'Projektstandard aktiv'}</strong
                >
              </span>
              <span class="summary-pill"
                ><strong>${this.getChannelLabel(effectiveChannel)}</strong>
                Uebergabe</span
              >
              <span class="summary-pill"
                ><strong>${this.getModeLabel(effectiveMode)}</strong>
                Senden</span
              >
              <span class="summary-pill"
                ><strong>${effectiveConcurrency}</strong> gleichzeitig</span
              >
              <span class="summary-pill"
                ><strong>Senden ab ${effectiveThreshold}</strong></span
              >
              <span class="summary-pill"
                ><strong
                  >${this.getContinuationLabel(effectiveContinuation)}</strong
                >
                Startart</span
              >
            </div>
          </div>
          ${hasSessionOverrides
            ? html`
                <div class="session-overrides">
                  <div class="session-overrides-title">
                    Eigene Regeln fuer diese Sitzung
                  </div>
                  <div class="summary-strip">
                    ${this.sessionOverrides.channel
                      ? html`<span class="summary-pill"
                          ><strong
                            >${this.getChannelLabel(
                              this.sessionOverrides.channel,
                            )}</strong
                          >
                          Uebergabe</span
                        >`
                      : null}
                    ${this.sessionOverrides.mode
                      ? html`<span class="summary-pill"
                          ><strong
                            >${this.getModeLabel(
                              this.sessionOverrides.mode,
                            )}</strong
                          >
                          Senden</span
                        >`
                      : null}
                    ${this.sessionOverrides.continuation
                      ? html`<span class="summary-pill"
                          ><strong
                            >${this.getContinuationLabel(
                              this.sessionOverrides.continuation,
                            )}</strong
                          >
                          Startart</span
                        >`
                      : null}
                    ${this.sessionOverrides.threshold
                      ? html`<span class="summary-pill"
                          ><strong
                            >Senden ab
                            ${this.sessionOverrides.threshold}</strong
                          ></span
                        >`
                      : null}
                    ${this.sessionOverrides.concurrency
                      ? html`<span class="summary-pill"
                          ><strong>${this.sessionOverrides.concurrency}</strong>
                          gleichzeitig</span
                        >`
                      : null}
                  </div>
                </div>
              `
            : null}
          ${hasSessionOverrides
            ? html`
                <button class="reset-btn" @click=${this.handleResetSession}>
                  Sitzungsregeln zuruecksetzen
                </button>
              `
            : null}
        </div>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-session-settings': DsSessionSettings;
  }
}
