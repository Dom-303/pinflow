import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import {
  analyzeDispatchQueue,
  mergeDispatchConfig,
  summarizeQueue,
  type DispatchChannel,
  type DispatchMode,
} from '../core/dispatch-config.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import './ds-session-settings.js';

@customElement('ds-workflow-panel')
export class DsWorkflowPanel extends LitElement {
  private storeController = new StoreController(this);

  @state()
  private settingsOpen = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      .panel {
        display: grid;
        gap: 12px;
        padding: 12px;
        background: var(--ds-panel-surface);
        border: 1px solid var(--ds-panel-border);
        border-radius: calc(var(--ds-radius-lg) - 2px);
        box-shadow: var(--ds-shadow-sm);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .title-group {
        display: grid;
        gap: 2px;
      }

      .eyebrow {
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .title {
        font-size: 14px;
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
      }

      .settings-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 1px solid var(--ds-pill-border);
        border-radius: 10px;
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        cursor: pointer;
      }

      .channel-group,
      .summary,
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .channel-btn,
      .summary-pill,
      .control-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        border-radius: 999px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
      }

      .channel-btn {
        cursor: pointer;
      }

      .channel-btn.active {
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
        box-shadow: var(--ds-shadow-sm);
      }

      .summary-pill strong,
      .control-pill strong {
        color: var(--ds-text-primary);
        font-weight: var(--ds-font-weight-semibold);
      }

      .controls {
        justify-content: space-between;
        align-items: center;
      }

      .mode-select {
        min-width: 132px;
        padding: 7px 10px;
        border-radius: 10px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
      }

      .pause-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 10px;
        border-radius: 10px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
      }

      .pause-btn.active {
        color: var(--ds-text-primary);
        background: var(--ds-panel-surface-strong);
      }

      .dispatch-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 10px;
        border-radius: 10px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
      }

      .dispatch-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .batch-log {
        display: grid;
        gap: 8px;
      }

      .batch-list {
        display: grid;
        gap: 8px;
      }

      .batch-item {
        display: grid;
        gap: 6px;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface);
        box-shadow: var(--ds-shadow-sm);
      }

      .batch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .batch-channel {
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .batch-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .batch-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }
    `,
  ];

  private setChannel(channel: DispatchChannel) {
    this.storeController.store.setDispatchSessionOverrides({ channel });
  }

  private handleModeChange(event: Event) {
    this.storeController.store.setDispatchSessionOverrides({
      mode: (event.target as HTMLSelectElement).value as DispatchMode,
    });
  }

  private handleProjectDefaultsChange(event: CustomEvent) {
    this.storeController.store.updateDispatchProjectDefaults(event.detail);
  }

  private togglePause() {
    this.storeController.store.toggleDispatchPaused();
  }

  private releaseNextBatch() {
    this.storeController.store.releaseNextDispatchBatch();
  }

  private toggleSettings() {
    this.settingsOpen = !this.settingsOpen;
  }

  private resetSessionOverrides() {
    this.storeController.store.clearDispatchSessionOverrides();
  }

  override render() {
    const { annotations, dispatchProjectDefaults, dispatchSession, dispatchBatches } =
      this.storeController.state;

    const effective = mergeDispatchConfig(
      dispatchProjectDefaults,
      dispatchSession,
    );
    const summary = summarizeQueue(annotations);
    const analysis = analyzeDispatchQueue(annotations, {
      releasedAnnotationIds: dispatchSession.releasedAnnotationIds,
      awaitingConfirmationIds: dispatchSession.awaitingConfirmationIds,
      concurrency: effective.concurrency,
    });
    const nextActionLabel =
      analysis.awaitingConfirmationIds.length > 0
        ? `Batch freigeben (${analysis.awaitingConfirmationIds.length})`
        : `Naechsten Batch senden (${analysis.releasableIds.length})`;
    const nextActionDisabled =
      analysis.awaitingConfirmationIds.length === 0 &&
      analysis.releasableIds.length === 0;

    return html`
      <div class="panel">
        <div class="header">
          <div class="title-group">
            <div class="eyebrow">Workflow</div>
            <div class="title">Queue und Versand</div>
          </div>
          <button
            class="settings-btn"
            @click=${this.toggleSettings}
            aria-label="Workflow-Einstellungen"
            title="Workflow-Einstellungen"
          >
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <path
                d="M12 3v3m0 12v3M4.93 4.93l2.12 2.12m9.9 9.9l2.12 2.12M3 12h3m12 0h3M4.93 19.07l2.12-2.12m9.9-9.9l2.12-2.12"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
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
        </div>

        <div class="channel-group">
          ${([
            ['codex', 'Codex'],
            ['claude', 'Claude'],
            ['queue_only', 'Nur sammeln'],
          ] as Array<[DispatchChannel, string]>).map(
            ([channel, label]) => html`
              <button
                class="channel-btn ${effective.channel === channel
                  ? 'active'
                  : ''}"
                @click=${() => this.setChannel(channel)}
                aria-label="Kanal ${label} fuer diese Session aktivieren"
              >
                ${label}
              </button>
            `,
          )}
        </div>

        <div class="summary">
          <span class="summary-pill"><strong>${summary.waiting}</strong> Wartend</span>
          <span class="summary-pill"><strong>${summary.active}</strong> Aktiv</span>
          <span class="summary-pill"><strong>${summary.completed}</strong> Fertig</span>
          ${analysis.awaitingConfirmationIds.length
            ? html`<span class="summary-pill"
                ><strong>${analysis.awaitingConfirmationIds.length}</strong>
                Freigabe</span
              >`
            : nothing}
          ${summary.failed
            ? html`<span class="summary-pill"
                ><strong>${summary.failed}</strong> Fehler</span
              >`
            : nothing}
        </div>

        <div class="controls">
          <div class="control-pill">
            Versand
            <select class="mode-select" .value=${effective.mode} @change=${this.handleModeChange}>
              <option value="manual">Manuell</option>
              <option value="immediate">Sofort</option>
              <option value="threshold">Ab Schwelle</option>
            </select>
          </div>

          <div class="control-pill">
            <strong>${effective.concurrency}</strong> parallel
          </div>

          <button
            class="pause-btn ${effective.paused ? 'active' : ''}"
            @click=${this.togglePause}
          >
            ${effective.paused ? 'Queue pausiert' : 'Queue aktiv'}
          </button>

          <button
            class="dispatch-btn"
            ?disabled=${nextActionDisabled}
            @click=${this.releaseNextBatch}
          >
            ${nextActionLabel}
          </button>
        </div>

        ${this.settingsOpen
          ? html`
              <ds-session-settings
                .projectDefaults=${dispatchProjectDefaults}
                .sessionOverrides=${dispatchSession.overrides}
                @project-defaults-change=${this.handleProjectDefaultsChange}
                @reset-session-overrides=${this.resetSessionOverrides}
              ></ds-session-settings>
            `
          : nothing}

        ${dispatchBatches.length
          ? html`
              <div class="batch-log">
                <div class="eyebrow">Letzte Batches</div>
                <div class="batch-list">
                  ${dispatchBatches.slice(0, 3).map(
                    (batch) => html`
                      <div class="batch-item">
                        <div class="batch-row">
                          <div class="batch-channel">${batch.channel}</div>
                          <div class="batch-status">${batch.status}</div>
                        </div>
                        <div class="batch-meta">
                          <span>${batch.annotationIds.length} Aufgaben</span>
                          <span>${batch.completedCount} fertig</span>
                          ${batch.processingCount
                            ? html`<span>${batch.processingCount} aktiv</span>`
                            : nothing}
                          ${batch.queuedCount
                            ? html`<span>${batch.queuedCount} wartend</span>`
                            : nothing}
                          ${batch.failedCount
                            ? html`<span>${batch.failedCount} Fehler</span>`
                            : nothing}
                        </div>
                      </div>
                    `,
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-workflow-panel': DsWorkflowPanel;
  }
}
