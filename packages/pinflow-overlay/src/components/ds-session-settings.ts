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
      }

      .session-note {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        line-height: 1.45;
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

  override render() {
    const hasSessionOverrides =
      Object.values(this.sessionOverrides ?? {}).filter(Boolean).length > 0;

    return html`
      <div class="section">
        <div class="section-title">Projektstandard</div>
        <div class="section-copy">
          Diese Werte gelten fuer das Projekt, solange du sie nicht aktiv
          aenderst.
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
        <div class="section-title">Session</div>
        <div class="session-note">
          Aktive Kanal- und Versandwechsel gelten zuerst fuer diese laufende
          Session. Die Projektdefaults bleiben erhalten, bis du sie hier oben
          aenderst.
        </div>
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
