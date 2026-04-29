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
import { getWorkflowAgentAttention } from '../core/agent-summary.js';
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
        gap: 10px;
        padding: 0;
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      .flow-section {
        display: grid;
        border-radius: 13px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-muted);
        overflow: hidden;
      }

      .flow-section[open] {
        background: var(--ds-panel-surface);
        border-color: var(--ds-panel-border-strong);
      }

      .flow-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 50px;
        padding: 12px;
        cursor: pointer;
        transition: background var(--ds-transition-fast);
      }

      .flow-summary::-webkit-details-marker {
        display: none;
      }

      .flow-summary:hover {
        background: var(--ds-bg-hover);
      }

      .flow-summary-copy {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .flow-summary-meta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        white-space: nowrap;
      }

      .flow-chevron {
        width: 17px;
        height: 17px;
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--ds-transition-fast);
      }

      .flow-section[open] .flow-chevron {
        transform: rotate(180deg);
      }

      .flow-section-body {
        display: grid;
        gap: 10px;
        padding: 12px;
        border-top: 1px solid var(--ds-panel-border);
      }

      .header,
      .effective-now,
      .control-stack,
      .batch-summary,
      .flow-note,
      .batch-empty,
      .batch-item {
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-muted);
        border-radius: 13px;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px;
      }

      .title-group {
        display: grid;
        gap: 4px;
      }

      .eyebrow {
        font-size: 10px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .title {
        font-size: 13px;
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
        gap: 7px;
      }

      .effective-now {
        display: grid;
        gap: 6px;
        padding: 10px;
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
        border-radius: 12px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface);
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

      .dispatch-callout {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        padding: 10px;
        border-radius: 13px;
        border: 1px solid
          color-mix(
            in srgb,
            var(--ds-brand-primary) 28%,
            var(--ds-panel-border)
          );
        background: color-mix(
          in srgb,
          var(--ds-brand-primary) 8%,
          var(--ds-panel-surface-muted)
        );
      }

      .dispatch-callout-copy {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .dispatch-callout-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .dispatch-callout-text {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
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
        border-color: var(--ds-panel-border-strong);
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

      .dispatch-btn.primary {
        flex-shrink: 0;
        border-color: transparent;
        background: var(--ds-brand-primary);
        color: var(--ds-bg-tertiary);
        font-weight: var(--ds-font-weight-semibold);
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
        padding: 10px;
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
        padding: 10px;
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
        padding: 10px;
        border: 1px dashed var(--ds-empty-border);
        background: var(--ds-empty-surface);
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
        padding: 10px;
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

      :host([theme='light']) .flow-section {
        background: rgba(255, 253, 250, 0.72);
      }

      :host([theme='light']) .flow-section[open] {
        background: rgba(255, 254, 251, 0.96);
      }

      :host([theme='light']) .header,
      :host([theme='light']) .effective-now,
      :host([theme='light']) .control-stack,
      :host([theme='light']) .dispatch-callout,
      :host([theme='light']) .batch-summary,
      :host([theme='light']) .flow-note,
      :host([theme='light']) .batch-empty,
      :host([theme='light']) .batch-item {
        background: rgba(255, 253, 250, 0.72);
      }

      :host([theme='dark']) .header,
      :host([theme='dark']) .flow-section,
      :host([theme='dark']) .effective-now,
      :host([theme='dark']) .control-stack,
      :host([theme='dark']) .dispatch-callout,
      :host([theme='dark']) .batch-summary,
      :host([theme='dark']) .flow-note,
      :host([theme='dark']) .batch-empty,
      :host([theme='dark']) .batch-item {
        background: #080706;
        border-color: rgba(38, 30, 24, 0.9);
      }

      :host([theme='dark']) .flow-section[open] {
        background: #0d0b09;
        border-color: rgba(62, 47, 35, 0.88);
      }

      :host([theme='dark']) .flow-summary:hover {
        background: #100d0a;
      }

      :host([theme='dark']) .flow-section-body {
        border-top-color: rgba(42, 33, 26, 0.86);
      }

      :host([theme='dark']) .status-card,
      :host([theme='dark']) .channel-btn,
      :host([theme='dark']) .summary-pill,
      :host([theme='dark']) .flow-summary-meta,
      :host([theme='dark']) .control-pill,
      :host([theme='dark']) .pause-btn,
      :host([theme='dark']) .dispatch-btn:not(.primary),
      :host([theme='dark']) .mode-select,
      :host([theme='dark']) .batch-status {
        background: #12100d;
        border-color: rgba(50, 38, 29, 0.76);
      }

      :host([theme='dark']) .channel-btn.active,
      :host([theme='dark']) .pause-btn.active {
        background: #18120d;
        border-color: rgba(72, 53, 37, 0.88);
      }

      :host([theme='dark']) .panel-copy,
      :host([theme='dark']) .effective-now-copy,
      :host([theme='dark']) .status-note,
      :host([theme='dark']) .flow-note-copy,
      :host([theme='dark']) .batch-meta,
      :host([theme='dark']) .batch-summary-meta {
        color: #988878;
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
    return channel === 'auto'
      ? 'Aktueller Agent'
      : channel === 'queue_only'
        ? 'Nur sammeln'
        : channel === 'claude'
          ? 'Claude'
          : 'Codex';
  }

  private getModeLabel(mode: DispatchMode) {
    return mode === 'immediate'
      ? 'Sofort'
      : mode === 'threshold'
        ? 'Ab Anzahl'
        : 'Manuell';
  }

  private getBatchStatusLabel(status: string) {
    if (status === 'running') return 'Lauf gestartet';
    if (status === 'completed') return 'Erledigt';
    if (status === 'failed') return 'Fehler';
    if (status === 'mixed') return 'Teilerfolg';
    if (status === 'queued') return 'Wartet auf Start';
    return status;
  }

  private getBatchStatusCopy(status: string) {
    if (status === 'mixed') {
      return 'Ein Teil des letzten Laufs ist fertig, einzelne Aufgaben brauchen noch Nacharbeit.';
    }
    if (status === 'failed') {
      return 'Der letzte Lauf braucht Aufmerksamkeit, bevor du den naechsten Lauf startest.';
    }
    if (status === 'completed') {
      return 'Der letzte Lauf ist abgeschlossen und bereit fuer den naechsten Schritt.';
    }
    if (status === 'running') {
      return 'Der aktuelle Lauf arbeitet noch und aktualisiert sich waehrend der Verarbeitung.';
    }
    return 'Der Lauf wartet auf Start oder Freigabe.';
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
        copy: 'Fehlerbild pruefen und den Lauf danach bewusst neu starten.',
      };
    }

    if (batch.status === 'completed') {
      return {
        title: 'Naechster Schritt',
        copy: 'Naechsten Lauf freigeben oder den Flow automatisch weiterlaufen lassen.',
      };
    }

    if (batch.status === 'queued') {
      return {
        title: 'Naechster Schritt',
        copy: 'Freigeben, sobald du diesen Lauf bewusst starten willst.',
      };
    }

    return null;
  }

  private getBatchHistoryNote(batch: { status: string; failedCount: number }) {
    if (batch.status === 'failed') {
      return 'Lauf nicht erfolgreich. Fehler pruefen und bewusst erneut starten.';
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
      } Lauf${needsAttention.length === 1 ? '' : 'en'} ${
        failedTasks === 1 ? 'braucht' : 'brauchen'
      } Nacharbeit oder erneuten Versand.`,
    };
  }

  private getContinuationLabel(
    continuation: 'automatic' | 'confirm' | 'manual',
  ) {
    if (continuation === 'automatic') return 'Automatisch starten';
    if (continuation === 'confirm') return 'Erst Freigabe holen';
    return 'Manuell';
  }

  private getContinuationCopy(
    continuation: 'automatic' | 'confirm' | 'manual',
  ) {
    if (continuation === 'automatic') {
      return 'PinFlow startet neue Laeufe automatisch, sobald die Regel greift.';
    }
    if (continuation === 'confirm') {
      return 'PinFlow sammelt den naechsten Lauf und wartet auf deine Freigabe.';
    }
    return 'Neue Aufgaben bleiben gesammelt, bis du den naechsten Lauf bewusst startest.';
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
        copy: 'Waehle ein Uebergabeziel, sobald die ersten Aufgaben starten sollen.',
      };
    }

    if (effective.paused) {
      return {
        title: 'Warteliste bleibt angehalten',
        copy: 'Hebe die Pause auf, sobald neue Aufgaben wieder in den Flow gehen sollen.',
      };
    }

    if (analysis.awaitingConfirmationIds.length > 0) {
      return {
        title: 'Freigabe bereit',
        copy: 'Der naechste Lauf liegt bereit. Pruefe ihn und gib ihn bewusst frei.',
      };
    }

    if (
      effective.mode === 'threshold' &&
      !this.storeController.state.dispatchSession.flowActive &&
      analysis.unreleasedWaitingIds.length > 0 &&
      analysis.unreleasedWaitingIds.length < effective.threshold
    ) {
      const remaining =
        effective.threshold - analysis.unreleasedWaitingIds.length;
      const outcome =
        effective.continuation === 'confirm'
          ? 'den ersten Lauf zur Freigabe bereit'
          : effective.continuation === 'automatic'
            ? 'den ersten Lauf automatisch frei'
            : 'den ersten Lauf fuer deinen manuellen Start vor';

      return {
        title: `Sammelt bis ${effective.threshold}`,
        copy: `Noch ${remaining} Aufgabe${remaining === 1 ? '' : 'n'}, dann stellt PinFlow ${outcome}.`,
      };
    }

    if (
      effective.continuation === 'automatic' &&
      analysis.inFlightIds.length > 0 &&
      analysis.unreleasedWaitingIds.length > 0
    ) {
      return {
        title: 'Automatisch senden aktiv',
        copy: `Sobald Kapazitaet frei wird, zieht PinFlow die naechsten ${
          analysis.releasableIds.length || analysis.unreleasedWaitingIds.length
        } Aufgaben automatisch nach.`,
      };
    }

    if (
      effective.mode === 'manual' &&
      analysis.unreleasedWaitingIds.length > 0
    ) {
      return {
        title: 'Manueller Start',
        copy: `Es warten ${analysis.unreleasedWaitingIds.length} Aufgaben auf deinen naechsten Lauf.`,
      };
    }

    return null;
  }

  private getDispatchCallout(
    effective: EffectiveDispatchConfig,
    analysis: ReturnType<typeof analyzeDispatchQueue>,
    summary: ReturnType<typeof summarizeQueue>,
  ): {
    title: string;
    copy: string;
    actionLabel: string;
    disabled: boolean;
  } | null {
    if (
      summary.waiting === 0 &&
      analysis.awaitingConfirmationIds.length === 0
    ) {
      return null;
    }

    if (effective.channel === 'queue_only') {
      return {
        title: 'Warteliste sammelt nur',
        copy: 'Waehle ein Uebergabeziel, bevor du die Warteliste sendest.',
        actionLabel: 'Nur sammeln',
        disabled: true,
      };
    }

    if (effective.paused) {
      return {
        title: 'Warteliste pausiert',
        copy: 'Hebe die Pause auf, damit du die wartenden Aufgaben senden kannst.',
        actionLabel: 'Pausiert',
        disabled: true,
      };
    }

    if (analysis.awaitingConfirmationIds.length > 0) {
      const count = analysis.awaitingConfirmationIds.length;
      return {
        title: 'Warteliste bereit',
        copy: `${count} Aufgabe${count === 1 ? '' : 'n'} ${count === 1 ? 'wartet' : 'warten'} auf deine Freigabe.`,
        actionLabel: `Freigeben (${count})`,
        disabled: false,
      };
    }

    const dispatchError =
      this.storeController.state.dispatchSession.lastDispatchError;

    if (dispatchError && analysis.releasableIds.length > 0) {
      const count = analysis.releasableIds.length;
      return {
        title: 'Senden fehlgeschlagen',
        copy: dispatchError,
        actionLabel: `Erneut senden (${count})`,
        disabled: false,
      };
    }

    if (analysis.releasableIds.length > 0) {
      const count = analysis.releasableIds.length;
      return {
        title: 'Warteliste bereit',
        copy: `${count} Aufgabe${count === 1 ? '' : 'n'} ${count === 1 ? 'kann' : 'koennen'} jetzt gesendet werden.`,
        actionLabel: `Jetzt senden (${count})`,
        disabled: false,
      };
    }

    if (analysis.unreleasedWaitingIds.length > 0) {
      const { runnerStatus } = this.storeController.state;
      const activeRunner = runnerStatus.sessions.find(
        (session: (typeof runnerStatus.sessions)[number]) =>
          session.status === 'processing',
      );

      if (activeRunner) {
        return {
          title: 'Runner arbeitet',
          copy: `${activeRunner.label} uebernimmt gerade freigegebene Aufgaben.`,
          actionLabel: 'Laeuft',
          disabled: true,
        };
      }

      if (runnerStatus.connected) {
        return {
          title: 'Runner bereit',
          copy: 'Ein lokaler Runner ist verbunden und kann freigegebene Aufgaben uebernehmen.',
          actionLabel: 'Bereit',
          disabled: true,
        };
      }

      return {
        title: 'Runner fehlt',
        copy: 'Starte pinflow runner, damit freigegebene Aufgaben automatisch laufen.',
        actionLabel: 'Nicht verbunden',
        disabled: true,
      };
    }

    return null;
  }

  override render() {
    const {
      annotations,
      dispatchProjectDefaults,
      dispatchSession,
      dispatchBatches,
    } = this.storeController.state;

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
          ? 'Warteliste pausiert'
          : analysis.awaitingConfirmationIds.length > 0
            ? `Freigeben (${analysis.awaitingConfirmationIds.length})`
            : `Jetzt senden (${analysis.releasableIds.length})`;
    const nextActionDisabled =
      effective.channel === 'queue_only' ||
      effective.paused ||
      (analysis.awaitingConfirmationIds.length === 0 &&
        analysis.releasableIds.length === 0);
    const activeStatus = effective.paused
      ? 'Warteliste pausiert'
      : effective.channel === 'queue_only'
        ? 'Sammelt Aufgaben ohne Versand'
        : analysis.awaitingConfirmationIds.length > 0
          ? 'Wartet auf Freigabe'
          : analysis.inFlightIds.length > 0
            ? 'Bearbeitet Aufgaben'
            : summary.waiting > 0
              ? 'Bereit fuer den naechsten Lauf'
              : 'Bereit zum Start';
    const latestBatch = dispatchBatches[0];
    const latestBatchFollowUp = latestBatch
      ? this.getBatchFollowUp(latestBatch)
      : null;
    const attentionSummary = this.getAttentionSummary(
      dispatchBatches.slice(0, 3),
    );
    const nextFlowNote = this.getNextFlowNote(effective, analysis);
    const dispatchCallout = this.getDispatchCallout(
      effective,
      analysis,
      summary,
    );
    const agentAttention = getWorkflowAgentAttention({
      annotations,
      awaitingConfirmationCount: analysis.awaitingConfirmationIds.length,
      inFlightCount: analysis.inFlightIds.length,
      latestBatchChannel: latestBatch?.channel,
      latestBatchStatus: latestBatch?.status,
    });

    return html`
      <div class="panel">
        <details class="flow-section">
          <summary class="flow-summary">
            <span class="flow-summary-copy">
              <span class="eyebrow">Workflow</span>
              <span class="title">Warteliste & Start</span>
              <span class="panel-copy">
                Was gesammelt ist, wann ein Lauf startet und wohin er geht.
              </span>
            </span>
            <span class="flow-summary-meta">
              ${this.getChannelLabel(effective.channel)}
            </span>
            <svg
              class="flow-chevron"
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
          <div class="flow-section-body">
            <div class="channel-group">
              ${(
                [
                  ['auto', 'Aktueller Agent'],
                  ['queue_only', 'Nur sammeln'],
                  ['codex', 'Codex'],
                  ['claude', 'Claude'],
                ] as Array<[DispatchChannel, string]>
              ).map(
                ([channel, label]) => html`
                  <button
                    class="channel-btn ${effective.channel === channel
                      ? 'active'
                      : ''}"
                    @click=${() => this.setChannel(channel)}
                    aria-label="Uebergabe ${label} fuer diese Session aktivieren"
                  >
                    ${label}
                  </button>
                `,
              )}
            </div>

            <div class="status-overview">
              <div class="status-card">
                <div class="status-label">Uebergabeziel</div>
                <div class="status-value">
                  ${this.getChannelLabel(effective.channel)}
                </div>
                <div class="status-note">
                  ${effective.channel === 'queue_only'
                    ? 'Neue Aufgaben bleiben gesammelt, bis du sie bewusst weitergibst.'
                    : effective.channel === 'auto'
                      ? 'PinFlow nutzt den Agent, der diese lokale Session gestartet hat.'
                      : 'Manueller Fallback fuer diese Session.'}
                </div>
              </div>
              <div class="status-card">
                <div class="status-label">Wann senden?</div>
                <div class="status-value">
                  ${this.getModeLabel(effective.mode)}
                </div>
                <div class="status-note">
                  ${effective.mode === 'threshold'
                    ? `Sammelt bis ${effective.threshold} Aufgaben erreicht sind.`
                    : effective.mode === 'immediate'
                      ? 'Neue Aufgaben starten direkt nach dem Kommentar.'
                      : 'Neue Aufgaben bleiben gesammelt, bis du freigibst.'}
                </div>
              </div>
              <div class="status-card">
                <div class="status-label">Live-Status</div>
                <div class="status-value">${activeStatus}</div>
                <div class="status-note">
                  ${effective.channel === 'queue_only'
                    ? 'Sammelt Aufgaben ohne Versand. '
                    : ''}${effective.concurrency}
                  parallel, Startart
                  ${effective.continuation === 'automatic'
                    ? 'automatisch'
                    : effective.continuation === 'confirm'
                      ? 'mit Freigabe'
                      : 'manuell'}
                </div>
              </div>
              <div class="status-card">
                <div class="status-label">Startart</div>
                <div class="status-value">
                  ${this.getContinuationLabel(effective.continuation)}
                </div>
                <div class="status-note">
                  ${this.getContinuationCopy(effective.continuation)}
                </div>
              </div>
            </div>

            ${dispatchCallout
              ? html`
                  <div class="dispatch-callout">
                    <div class="dispatch-callout-copy">
                      <div class="dispatch-callout-title">
                        ${dispatchCallout.title}
                      </div>
                      <div class="dispatch-callout-text">
                        ${dispatchCallout.copy}
                      </div>
                    </div>
                    <button
                      class="dispatch-btn primary"
                      ?disabled=${dispatchCallout.disabled}
                      @click=${this.releaseNextBatch}
                    >
                      ${dispatchCallout.actionLabel}
                    </button>
                  </div>
                `
              : nothing}
            ${agentAttention
              ? html`
                  <div class="flow-note">
                    <div class="flow-note-title">Agent-Status</div>
                    <div class="flow-note-copy">
                      <strong>${agentAttention.title}</strong>
                      ${agentAttention.copy}
                    </div>
                  </div>
                `
              : nothing}
          </div>
        </details>

        <details class="flow-section">
          <summary class="flow-summary">
            <span class="flow-summary-copy">
              <span class="title">Regeln</span>
              <span class="panel-copy">
                Wann senden, Startart und Kapazitaet steuern.
              </span>
            </span>
            <span class="flow-summary-meta"
              >${this.getModeLabel(effective.mode)}</span
            >
            <svg
              class="flow-chevron"
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
          <div class="flow-section-body">
            <div class="effective-now">
              <div class="effective-now-title">Wirksam jetzt</div>
              <div class="effective-now-copy">
                ${this.getChannelLabel(effective.channel)},
                ${this.getModeLabel(effective.mode)}, ${effective.concurrency}
                parallel, Startart
                ${effective.continuation === 'automatic'
                  ? 'automatisch'
                  : effective.continuation === 'confirm'
                    ? 'mit Freigabe'
                    : 'manuell'}.
              </div>
            </div>

            <div class="summary">
              <span class="summary-pill"
                ><strong>${summary.waiting}</strong> Warteliste</span
              >
              <span class="summary-pill"
                ><strong>${summary.active}</strong> In Bearbeitung</span
              >
              <span class="summary-pill"
                ><strong>${summary.completed}</strong> Erledigt</span
              >
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
              <div class="control-stack-title">Steuerung</div>
              <div class="controls">
                <div class="control-pill">
                  Wann senden?
                  <select
                    class="mode-select"
                    .value=${effective.mode}
                    @change=${this.handleModeChange}
                  >
                    <option value="manual">Manuell</option>
                    <option value="immediate">Sofort</option>
                    <option value="threshold">Ab Anzahl</option>
                  </select>
                </div>

                <div class="control-pill">
                  <strong>${effective.concurrency}</strong> parallel
                </div>

                <button
                  class="pause-btn ${effective.paused ? 'active' : ''}"
                  @click=${this.togglePause}
                >
                  ${effective.paused
                    ? 'Warteliste pausiert'
                    : 'Warteliste aktiv'}
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
          </div>
        </details>

        <details class="flow-section">
          <summary class="flow-summary">
            <span class="flow-summary-copy">
              <span class="title">Letzte Laeufe</span>
              <span class="panel-copy"
                >Status und Nacharbeit der letzten Laeufe.</span
              >
            </span>
            <span class="flow-summary-meta">${dispatchBatches.length}</span>
            <svg
              class="flow-chevron"
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
          <div class="flow-section-body">
            ${dispatchBatches.length
              ? html`
                  <div class="batch-log">
                    <div class="batch-summary">
                      <div class="batch-summary-row">
                        <div class="batch-channel">
                          ${this.getChannelLabel(
                            latestBatch.channel as DispatchChannel,
                          )}
                        </div>
                        <div
                          class="batch-status"
                          data-status=${latestBatch.status}
                        >
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
                          ${this.formatBatchReleasedAt(
                            latestBatch.releasedAt,
                          )}</span
                        >
                        <span
                          >${latestBatch.annotationIds.length} Aufgaben</span
                        >
                        <span>${latestBatch.completedCount} fertig</span>
                        ${latestBatch.processingCount
                          ? html`<span
                              >${latestBatch.processingCount} aktiv</span
                            >`
                          : nothing}
                        ${latestBatch.queuedCount
                          ? html`<span
                              >${latestBatch.queuedCount} wartend</span
                            >`
                          : nothing}
                        ${latestBatch.failedCount
                          ? html`<span>${latestBatch.failedCount} Fehler</span>`
                          : nothing}
                      </div>
                    </div>
                    ${attentionSummary
                      ? html`
                          <div class="flow-note">
                            <div class="flow-note-title">
                              ${attentionSummary.title}
                            </div>
                            <div class="flow-note-copy">
                              ${attentionSummary.copy}
                            </div>
                          </div>
                        `
                      : nothing}
                    <div class="batch-list">
                      ${dispatchBatches.slice(0, 3).map(
                        (batch) => html`
                          <div class="batch-item">
                            <div class="batch-row">
                              <div class="batch-channel">
                                ${this.getChannelLabel(
                                  batch.channel as DispatchChannel,
                                )}
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
                                ${this.formatBatchReleasedAt(
                                  batch.releasedAt,
                                )}</span
                              >
                              <span
                                >${batch.annotationIds.length} Aufgaben</span
                              >
                              <span>${batch.completedCount} fertig</span>
                              ${batch.processingCount
                                ? html`<span
                                    >${batch.processingCount} aktiv</span
                                  >`
                                : nothing}
                              ${batch.queuedCount
                                ? html`<span
                                    >${batch.queuedCount} wartend</span
                                  >`
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
                  <div class="batch-empty">
                    <div class="batch-empty-title">
                      Bereit fuer den ersten Lauf
                    </div>
                    <div class="batch-empty-copy">
                      Sobald du die ersten Aufgaben freigibst oder versendest,
                      siehst du hier Uebergabeziel, Status und Fortschritt des
                      letzten Laufs.
                    </div>
                  </div>
                `}
          </div>
        </details>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-workflow-panel': DsWorkflowPanel;
  }
}
