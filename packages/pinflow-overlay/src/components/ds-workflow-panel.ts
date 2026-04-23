import { LitElement, html, css, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import {
  analyzeDispatchQueue,
  type EffectiveDispatchConfig,
  mergeDispatchConfig,
  summarizeQueue,
  type DispatchChannel,
  type DispatchMode,
} from '../core/dispatch-config.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

@customElement('ds-workflow-panel')
export class DsWorkflowPanel extends LitElement {
  private storeController = new StoreController(this);

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
        padding: 13px;
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
        gap: 4px;
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

      .panel-copy {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
        max-width: 240px;
      }

      .channel-group,
      .summary,
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .effective-now {
        display: grid;
        gap: 6px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-sm);
      }

      .effective-now-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .effective-now-copy {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      .status-overview {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .control-stack {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 16px;
        background: var(--ds-panel-surface-muted);
        border: 1px solid var(--ds-panel-border);
      }

      .control-stack-title {
        color: var(--ds-text-tertiary);
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .status-card {
        display: grid;
        gap: 4px;
        padding: 10px;
        border-radius: 14px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface);
        box-shadow: var(--ds-shadow-sm);
      }

      .status-label {
        color: var(--ds-text-tertiary);
        font-size: var(--ds-font-size-xs);
        letter-spacing: 0.02em;
      }

      .status-value {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .status-note {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.4;
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

      .batch-summary {
        display: grid;
        gap: 6px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-sm);
      }

      .batch-summary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .batch-summary-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .flow-note {
        display: grid;
        gap: 4px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid var(--ds-empty-border);
        background: var(--ds-empty-surface);
        box-shadow: var(--ds-panel-shadow-soft);
      }

      .flow-note-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .flow-note-copy {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      .batch-empty {
        display: grid;
        gap: 6px;
        padding: 12px;
        border-radius: 14px;
        border: 1px dashed var(--ds-empty-border);
        background: var(--ds-empty-surface);
        box-shadow: var(--ds-panel-shadow-soft);
      }

      .batch-empty-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .batch-empty-copy {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
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

      .batch-status[data-status='running'] {
        color: var(--ds-text-primary);
        border-color: rgba(199, 149, 100, 0.4);
      }

      .batch-status[data-status='completed'] {
        color: var(--ds-success);
      }

      .batch-status[data-status='failed'] {
        color: var(--ds-error);
      }

      .batch-status[data-status='mixed'] {
        color: var(--ds-warning);
        border-color: rgba(233, 189, 112, 0.55);
      }

      .batch-status[data-status='queued'] {
        color: var(--ds-warning);
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

  private togglePause() {
    this.storeController.store.toggleDispatchPaused();
  }

  private releaseNextBatch() {
    this.storeController.store.releaseNextDispatchBatch();
  }

  private getChannelLabel(channel: DispatchChannel) {
    return channel === 'queue_only'
      ? 'Nur sammeln'
      : channel === 'claude'
        ? 'Claude'
        : 'Codex';
  }

  private getModeLabel(mode: DispatchMode) {
    return mode === 'immediate'
      ? 'Sofort'
      : mode === 'threshold'
        ? 'Ab Schwelle'
        : 'Manuell';
  }

  private getBatchStatusLabel(status: string) {
    if (status === 'running') return 'Laeuft';
    if (status === 'completed') return 'Fertig';
    if (status === 'failed') return 'Fehler';
    if (status === 'mixed') return 'Teilerfolg';
    if (status === 'queued') return 'Bereit';
    return status;
  }

  private getBatchStatusCopy(status: string) {
    if (status === 'mixed') {
      return 'Ein Teil des letzten Laufs ist fertig, einzelne Aufgaben brauchen noch Nacharbeit.';
    }
    if (status === 'failed') {
      return 'Der letzte Lauf braucht Aufmerksamkeit, bevor du den naechsten Batch weiterziehst.';
    }
    if (status === 'completed') {
      return 'Der letzte Lauf ist abgeschlossen und bereit fuer den naechsten Schritt.';
    }
    if (status === 'running') {
      return 'Der aktuelle Lauf arbeitet noch und aktualisiert sich waehrend der Verarbeitung.';
    }
    return 'Der letzte Lauf steht bereit und wartet auf seinen naechsten Schritt.';
  }

  private getBatchFollowUp(batch: {
    status: string;
    failedCount: number;
    queuedCount: number;
    processingCount: number;
  }): { title: string; copy: string } | null {
    if (batch.status === 'running') {
      return {
        title: 'Naechster Schritt',
        copy: 'Lauf beobachten, bis neue Kapazitaet oder Ergebnisse sichtbar werden.',
      };
    }

    if (batch.status === 'mixed') {
      return {
        title: 'Naechster Schritt',
        copy: 'Fehler pruefen und verbleibende Aufgaben erneut anstossen.',
      };
    }

    if (batch.status === 'failed') {
      return {
        title: 'Naechster Schritt',
        copy: 'Fehlerbild pruefen und den Batch danach bewusst neu starten.',
      };
    }

    if (batch.status === 'completed') {
      return {
        title: 'Naechster Schritt',
        copy: 'Naechsten Batch freigeben oder den Flow automatisch weiterlaufen lassen.',
      };
    }

    if (batch.status === 'queued') {
      return {
        title: 'Naechster Schritt',
        copy: 'Batch freigeben, sobald du ihn bewusst starten willst.',
      };
    }

    return null;
  }

  private getBatchHistoryNote(batch: {
    status: string;
    failedCount: number;
  }) {
    if (batch.status === 'failed') {
      return 'Batch nicht erfolgreich. Fehler pruefen und bewusst erneut starten.';
    }

    if (batch.status === 'mixed') {
      return 'Teilerfolg. Offene Fehler und verbleibende Aufgaben nachziehen.';
    }

    if (batch.status === 'completed') {
      return 'Ohne offene Nacharbeit abgeschlossen.';
    }

    if (batch.status === 'running') {
      return 'Verarbeitung laeuft aktuell.';
    }

    if (batch.status === 'queued') {
      return 'Bereit zur bewussten Freigabe.';
    }

    return null;
  }

  private getAttentionSummary(
    batches: Array<{
      status: string;
      failedCount: number;
    }>,
  ): { title: string; copy: string } | null {
    const needsAttention = batches.filter(
      (batch) => batch.status === 'failed' || batch.status === 'mixed',
    );

    if (needsAttention.length === 0) {
      return null;
    }

    const failedTasks = needsAttention.reduce(
      (sum, batch) => sum + batch.failedCount,
      0,
    );

    return {
      title: 'Nacharbeit im Blick',
      copy: `${failedTasks} Aufgabe${failedTasks === 1 ? '' : 'n'} aus den letzten ${
        needsAttention.length
      } Batch${needsAttention.length === 1 ? '' : 'es'} ${
        failedTasks === 1 ? 'braucht' : 'brauchen'
      } Nacharbeit oder erneuten Versand.`,
    };
  }

  private getContinuationLabel(continuation: 'automatic' | 'confirm' | 'manual') {
    if (continuation === 'automatic') return 'Automatisch';
    if (continuation === 'confirm') return 'Mit Freigabe';
    return 'Manuell';
  }

  private getContinuationCopy(continuation: 'automatic' | 'confirm' | 'manual') {
    if (continuation === 'automatic') {
      return 'PinFlow zieht neue Batches nach, sobald wieder Platz frei wird.';
    }
    if (continuation === 'confirm') {
      return 'PinFlow stellt den naechsten Batch bereit und wartet auf deine Freigabe.';
    }
    return 'Neue Aufgaben bleiben gesammelt, bis du den naechsten Batch bewusst ausloest.';
  }

  private formatBatchReleasedAt(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Zeit unbekannt';
    }

    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(date);
  }

  private getNextFlowNote(
    effective: EffectiveDispatchConfig,
    analysis: ReturnType<typeof analyzeDispatchQueue>,
  ): { title: string; copy: string } | null {
    if (effective.channel === 'queue_only') {
      return {
        title: 'Sammelt weiter',
        copy: 'Wechsle auf Codex oder Claude, sobald die ersten Aufgaben rausgehen sollen.',
      };
    }

    if (effective.paused) {
      return {
        title: 'Queue bleibt angehalten',
        copy: 'Hebe die Pause auf, sobald neue Aufgaben wieder in den Flow gehen sollen.',
      };
    }

    if (analysis.awaitingConfirmationIds.length > 0) {
      return {
        title: 'Naechster Batch bereit',
        copy: 'Der naechste Batch liegt bereit. Pruefe ihn und gib ihn bewusst frei.',
      };
    }

    if (
      effective.mode === 'threshold' &&
      !this.storeController.state.dispatchSession.flowActive &&
      analysis.unreleasedWaitingIds.length > 0 &&
      analysis.unreleasedWaitingIds.length < effective.threshold
    ) {
      const remaining = effective.threshold - analysis.unreleasedWaitingIds.length;
      const outcome =
        effective.continuation === 'confirm'
          ? 'den ersten Batch zur Freigabe bereit'
          : effective.continuation === 'automatic'
            ? 'den ersten Batch automatisch frei'
            : 'den ersten Batch fuer deinen manuellen Start vor';

      return {
        title: 'Schwelle fast erreicht',
        copy: `Noch ${remaining} Aufgabe${remaining === 1 ? '' : 'n'}, dann stellt PinFlow ${outcome}.`,
      };
    }

    if (
      effective.continuation === 'automatic' &&
      analysis.inFlightIds.length > 0 &&
      analysis.unreleasedWaitingIds.length > 0
    ) {
      return {
        title: 'Auto-Fortsetzung aktiv',
        copy: `Sobald Kapazitaet frei wird, zieht PinFlow die naechsten ${
          analysis.releasableIds.length || analysis.unreleasedWaitingIds.length
        } Aufgaben automatisch nach.`,
      };
    }

    if (effective.mode === 'manual' && analysis.unreleasedWaitingIds.length > 0) {
      return {
        title: 'Manueller Start',
        copy: `Es warten ${analysis.unreleasedWaitingIds.length} Aufgaben auf deinen naechsten Batch.`,
      };
    }

    return null;
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
      effective.channel === 'queue_only'
        ? 'Sammelmodus aktiv'
        : effective.paused
          ? 'Queue pausiert'
          : analysis.awaitingConfirmationIds.length > 0
            ? `Batch freigeben (${analysis.awaitingConfirmationIds.length})`
            : `Naechsten Batch senden (${analysis.releasableIds.length})`;
    const nextActionDisabled =
      effective.channel === 'queue_only' ||
      effective.paused ||
      (analysis.awaitingConfirmationIds.length === 0 &&
        analysis.releasableIds.length === 0);
    const activeStatus = effective.paused
      ? 'Queue pausiert'
      : effective.channel === 'queue_only'
        ? 'Sammelt Aufgaben ohne Versand'
      : analysis.awaitingConfirmationIds.length > 0
        ? 'Wartet auf Freigabe'
        : analysis.inFlightIds.length > 0
          ? 'Bearbeitet Aufgaben'
          : summary.waiting > 0
            ? 'Bereit fuer den naechsten Versand'
            : 'Bereit zum Start';
    const latestBatch = dispatchBatches[0];
    const latestBatchFollowUp = latestBatch
      ? this.getBatchFollowUp(latestBatch)
      : null;
    const attentionSummary = this.getAttentionSummary(dispatchBatches.slice(0, 3));
    const nextFlowNote = this.getNextFlowNote(effective, analysis);

    return html`
      <div class="panel">
        <div class="header">
          <div class="title-group">
            <div class="eyebrow">Workflow</div>
            <div class="title">Flow-Steuerung</div>
            <div class="panel-copy">
              Halte Session-Kanal, Queue-Status und Freigabe an einer Stelle im Blick.
            </div>
          </div>
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

        <div class="status-overview">
          <div class="status-card">
            <div class="status-label">Session-Kanal</div>
            <div class="status-value">${this.getChannelLabel(effective.channel)}</div>
            <div class="status-note">
              ${effective.channel === 'queue_only'
                ? 'Neue Aufgaben bleiben gesammelt, bis du einen aktiven Kanal waehlst.'
                : 'Session-weit aktiv fuer neue Annotationen und den naechsten Batch.'}
            </div>
          </div>
          <div class="status-card">
            <div class="status-label">Queue-Status</div>
            <div class="status-value">${this.getModeLabel(effective.mode)}</div>
            <div class="status-note">
              ${effective.mode === 'threshold'
                ? `Automatisch ab ${effective.threshold} offenen Aufgaben.`
                : effective.mode === 'immediate'
                  ? 'Neue Aufgaben werden direkt in die Queue gegeben.'
                  : 'Neue Aufgaben bleiben gesammelt, bis du freigibst.'}
            </div>
          </div>
          <div class="status-card">
            <div class="status-label">Live-Status</div>
            <div class="status-value">${activeStatus}</div>
            <div class="status-note">
              ${effective.channel === 'queue_only'
                ? 'Sammelt Aufgaben ohne Versand. '
                : ''}${effective.concurrency} parallel, Fortsetzung ${effective.continuation ===
              'automatic'
                ? 'automatisch'
                : effective.continuation === 'confirm'
                  ? 'mit Freigabe'
                  : 'manuell'}
            </div>
          </div>
          <div class="status-card">
            <div class="status-label">Fortsetzung</div>
            <div class="status-value">
              ${this.getContinuationLabel(effective.continuation)}
            </div>
            <div class="status-note">
              ${this.getContinuationCopy(effective.continuation)}
            </div>
          </div>
        </div>

        <div class="effective-now">
          <div class="effective-now-title">Wirksam jetzt</div>
          <div class="effective-now-copy">
            ${this.getChannelLabel(effective.channel)}, ${this.getModeLabel(effective.mode)}, ${effective.concurrency}
            parallel, Fortsetzung ${effective.continuation === 'automatic'
              ? 'automatisch'
              : effective.continuation === 'confirm'
                ? 'mit Freigabe'
                : 'manuell'}.
          </div>
        </div>

        <div class="summary">
          <span class="summary-pill"><strong>${summary.waiting}</strong> Bereit</span>
          <span class="summary-pill"><strong>${summary.active}</strong> In Arbeit</span>
          <span class="summary-pill"><strong>${summary.completed}</strong> Erledigt</span>
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

        <div class="control-stack">
          <div class="control-stack-title">Freigabe & Automatik</div>
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
        </div>

        ${nextFlowNote
          ? html`
              <div class="flow-note">
                <div class="flow-note-title">${nextFlowNote.title}</div>
                <div class="flow-note-copy">${nextFlowNote.copy}</div>
              </div>
            `
          : nothing}

        ${dispatchBatches.length
          ? html`
              <div class="batch-log">
                <div class="eyebrow">Letzter Lauf</div>
                <div class="batch-summary">
                  <div class="batch-summary-row">
                    <div class="batch-channel">
                      ${this.getChannelLabel(latestBatch.channel as DispatchChannel)}
                    </div>
                    <div class="batch-status" data-status=${latestBatch.status}>
                      ${this.getBatchStatusLabel(latestBatch.status)}
                    </div>
                  </div>
                  <div class="flow-note-copy">
                    ${this.getBatchStatusCopy(latestBatch.status)}
                  </div>
                  ${latestBatchFollowUp
                    ? html`
                        <div class="flow-note">
                          <div class="flow-note-title">
                            ${latestBatchFollowUp.title}
                          </div>
                          <div class="flow-note-copy">
                            ${latestBatchFollowUp.copy}
                          </div>
                        </div>
                      `
                    : nothing}
                  <div class="batch-summary-meta">
                    <span
                      >Freigegeben
                      ${this.formatBatchReleasedAt(latestBatch.releasedAt)}</span
                    >
                    <span>${latestBatch.annotationIds.length} Aufgaben</span>
                    <span>${latestBatch.completedCount} fertig</span>
                    ${latestBatch.processingCount
                      ? html`<span>${latestBatch.processingCount} aktiv</span>`
                      : nothing}
                    ${latestBatch.queuedCount
                      ? html`<span>${latestBatch.queuedCount} wartend</span>`
                      : nothing}
                    ${latestBatch.failedCount
                      ? html`<span>${latestBatch.failedCount} Fehler</span>`
                      : nothing}
                  </div>
                </div>
                ${attentionSummary
                  ? html`
                      <div class="flow-note">
                        <div class="flow-note-title">${attentionSummary.title}</div>
                        <div class="flow-note-copy">${attentionSummary.copy}</div>
                      </div>
                    `
                  : nothing}
                <div class="eyebrow">Letzte Batches</div>
                <div class="batch-list">
                  ${dispatchBatches.slice(0, 3).map(
                    (batch) => html`
                      <div class="batch-item">
                        <div class="batch-row">
                          <div class="batch-channel">
                            ${this.getChannelLabel(batch.channel as DispatchChannel)}
                          </div>
                          <div
                            class="batch-status"
                            data-status=${batch.status}
                          >
                            ${this.getBatchStatusLabel(batch.status)}
                          </div>
                        </div>
                        <div class="batch-meta">
                          <span
                            >Freigegeben
                            ${this.formatBatchReleasedAt(batch.releasedAt)}</span
                          >
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
                        ${this.getBatchHistoryNote(batch)
                          ? html`
                              <div class="status-note">
                                ${this.getBatchHistoryNote(batch)}
                              </div>
                            `
                          : nothing}
                      </div>
                    `,
                  )}
                </div>
              </div>
            `
          : html`
              <div class="batch-log">
                <div class="eyebrow">Letzte Batches</div>
                <div class="batch-empty">
                  <div class="batch-empty-title">Bereit fuer den ersten Batch</div>
                  <div class="batch-empty-copy">
                    Sobald du die ersten Aufgaben freigibst oder versendest,
                    siehst du hier Kanal, Status und Fortschritt des letzten Laufs.
                  </div>
                </div>
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-workflow-panel': DsWorkflowPanel;
  }
}
