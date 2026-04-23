import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  DispatchContinuationMode,
  DispatchMode,
  DispatchProjectDefaults,
  DispatchSessionOverrides,
} from '../core/dispatch-config.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

@customElement('ds-session-settings')
export class DsSessionSettings extends LitElement {
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
        padding-top: var(--ds-space-sm);
        border-top: 1px solid var(--ds-chrome-divider);
      }

      .section {
        display: grid;
        gap: 10px;
        padding: 10px;
        border-radius: 16px;
        background: var(--ds-panel-surface-muted);
        border: 1px solid var(--ds-panel-border);
      }

      .section + .section {
        margin-top: 12px;
      }

      .section-title {
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-secondary);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .section-copy {
        color: var(--ds-text-tertiary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .summary-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .summary-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
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
        gap: 6px;
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
      }

      select {
        width: 100%;
        padding: 8px 10px;
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
        outline: 2px solid color-mix(in srgb, var(--ds-brand-primary) 45%, transparent);
        outline-offset: 2px;
      }

      .session-note {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        line-height: 1.45;
      }

      .session-state {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 10px;
        border-radius: 14px;
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

      .session-overrides {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 14px;
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
        ? 'Ab Schwelle'
        : 'Manuell';
  }

  private getContinuationLabel(mode: DispatchContinuationMode) {
    return mode === 'automatic'
      ? 'Automatisch'
      : mode === 'confirm'
        ? 'Freigeben'
        : 'Manuell';
  }

  private getChannelLabel(channel?: 'codex' | 'claude' | 'queue_only') {
    return channel === 'queue_only'
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

    return html`
      <div class="section">
        <div class="section-title">Projektstandard</div>
        <div class="section-copy">
          Diese Werte gelten fuer das Projekt, solange du sie nicht aktiv
          aenderst.
        </div>
        <div class="summary-strip">
          <span class="summary-pill"><strong>${modeLabel}</strong> Versand</span>
          <span class="summary-pill"
            ><strong>${this.projectDefaults.concurrency}</strong> Parallelitaet</span
          >
          <span class="summary-pill"
            ><strong>${this.projectDefaults.threshold}</strong> Schwelle</span
          >
          <span class="summary-pill"
            ><strong>${continuationLabel}</strong> Fortsetzung</span
          >
        </div>
        <div class="grid">
          <label>
            Versand
            <select
              .value=${this.projectDefaults.mode}
              @change=${this.handleProjectModeChange}
            >
              <option value="manual">Manuell</option>
              <option value="immediate">Sofort</option>
              <option value="threshold">Ab Schwelle</option>
            </select>
          </label>

          <label>
            Parallelitaet
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
            Automatik-Schwelle
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
            Naechster Batch
            <select
              .value=${this.projectDefaults.continuation}
              @change=${this.handleProjectContinuationChange}
            >
              <option value="automatic">Automatisch</option>
              <option value="confirm">Freigeben</option>
              <option value="manual">Manuell</option>
            </select>
          </label>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Session-Verhalten</div>
        <div class="session-note">
          Aktive Kanal- und Versandwechsel gelten zuerst fuer diese laufende
          Session. Die Projektdefaults bleiben erhalten, bis du sie hier oben
          aenderst.
        </div>
        <div class="session-state ${hasSessionOverrides ? 'active' : ''}">
          ${hasSessionOverrides
            ? 'Session-Overrides sind aktiv'
            : 'Session folgt Projektstandard'}
        </div>
        <div class="session-note">
          ${hasSessionOverrides
            ? 'Aktive Session-Anpassungen uebersteuern nur diese laufende Sitzung.'
            : 'Keine Session-Anpassungen aktiv.'}
        </div>
        ${hasSessionOverrides
          ? html`
              <div class="session-overrides">
                <div class="session-overrides-title">
                  Aktive Session-Anpassungen
                </div>
                <div class="summary-strip">
                  ${this.sessionOverrides.channel
                    ? html`<span class="summary-pill"
                        ><strong
                          >${this.getChannelLabel(this.sessionOverrides.channel)}</strong
                        >
                        Kanal</span
                      >`
                    : null}
                  ${this.sessionOverrides.mode
                    ? html`<span class="summary-pill"
                        ><strong>${this.getModeLabel(this.sessionOverrides.mode)}</strong>
                        Versand</span
                      >`
                    : null}
                  ${this.sessionOverrides.continuation
                    ? html`<span class="summary-pill"
                        ><strong
                          >${this.getContinuationLabel(this.sessionOverrides.continuation)}</strong
                        >
                        Fortsetzung</span
                      >`
                    : null}
                  ${this.sessionOverrides.threshold
                    ? html`<span class="summary-pill"
                        ><strong>${this.sessionOverrides.threshold}</strong>
                        Schwelle</span
                      >`
                    : null}
                  ${this.sessionOverrides.concurrency
                    ? html`<span class="summary-pill"
                        ><strong>${this.sessionOverrides.concurrency}</strong>
                        Parallelitaet</span
                      >`
                    : null}
                </div>
              </div>
            `
          : null}
        ${hasSessionOverrides
          ? html`
              <button class="reset-btn" @click=${this.handleResetSession}>
                Session-Overrides zuruecksetzen
              </button>
            `
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-session-settings': DsSessionSettings;
  }
}
