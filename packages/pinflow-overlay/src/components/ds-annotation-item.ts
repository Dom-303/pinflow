/**
 * DsAnnotationItem - Single annotation card
 *
 * Supports collapsed (single-line) and expanded views.
 * Expanded view shows full content, agent response, context panel, and action buttons.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Annotation } from '@pinflow/core';
import type { AnnotationRunEvidence } from '@pinflow/relay/client';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import { OverlayStore } from '../core/overlay-store.js';
import { RelayService } from '../services/relay-service.js';
import { getAnnotationAgentSummary } from '../core/agent-summary.js';
import { getAnnotationDispatchView } from '../core/dispatch-config.js';

// Import shared context panel component
import './ds-context-panel.js';

/**
 * Annotation item component
 *
 * @element ds-annotation-item
 */
@customElement('ds-annotation-item')
export class DsAnnotationItem extends LitElement {
  @property({ type: Object })
  annotation: Annotation | null = null;

  @property({ type: Array })
  releasedAnnotationIds: string[] = [];

  @property({ type: Array })
  awaitingConfirmationIds: string[] = [];

  @state()
  private expanded = false;

  @state()
  private editing = false;

  @state()
  private editValue = '';

  @state()
  private confirmingDelete = false;

  @state()
  private confirmingUndo = false;

  @state()
  private copied = false;

  @state()
  private runEvidence: AnnotationRunEvidence | null = null;

  @state()
  private runEvidenceLoading = false;

  @state()
  private runEvidenceLoadedFor: string | null = null;

  @state()
  private runPathCopied = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      /* ======== Collapsed row ======== */
      .collapsed-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--ds-space-sm);
        padding: 12px 13px;
        background: var(--ds-card-surface);
        border: 1px solid var(--ds-panel-border);
        border-radius: calc(var(--ds-radius-lg) - 2px);
        box-shadow: var(--ds-panel-shadow-soft);
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          border-color var(--ds-transition-fast),
          transform var(--ds-transition-fast);
        min-width: 0;
      }

      .collapsed-row:hover {
        background: var(--ds-card-surface-strong);
        border-color: var(--ds-panel-border-strong);
        transform: translateY(-1px);
      }

      .collapsed-inner {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        gap: 2px;
      }

      .collapsed-text {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ======== Expanded card ======== */
      .card {
        background: var(--ds-card-surface);
        border: 1px solid var(--ds-panel-border);
        border-radius: calc(var(--ds-radius-lg) - 2px);
        box-shadow: var(--ds-panel-shadow);
        overflow: hidden;
        transition:
          background var(--ds-transition-fast),
          border-color var(--ds-transition-fast);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 13px 10px;
        cursor: pointer;
        border-bottom: 1px solid var(--ds-chrome-divider);
      }

      .card-header:hover {
        background: var(--ds-panel-surface);
      }

      .element-info {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        min-width: 0;
      }

      .file-name {
        color: var(--ds-text-accent);
        font-weight: var(--ds-font-weight-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .separator {
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
      }

      .tag-name {
        font-family: var(--ds-font-mono);
        color: var(--ds-text-accent);
        flex-shrink: 0;
      }

      /* ======== Header actions (copy + status group) ======== */
      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        flex-shrink: 0;
        min-width: 0;
      }

      .copy-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 10px;
        color: var(--ds-text-tertiary);
        cursor: pointer;
        flex-shrink: 0;
        transition: all var(--ds-transition-fast);
      }

      .copy-btn:hover {
        color: var(--ds-text-primary);
        background: var(--ds-panel-surface-strong);
      }

      .copy-btn.copied {
        color: var(--ds-success);
      }

      .copy-btn svg {
        width: 13px;
        height: 13px;
      }

      /* ======== Status ======== */
      .status {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        padding: 2px 8px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: var(--ds-radius-full);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        flex-shrink: 0;
        font-weight: var(--ds-font-weight-medium);
        max-width: 104px;
        min-width: 0;
        white-space: nowrap;
      }

      .status-label-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status[data-status='queued'] {
        background: var(--ds-status-ready-surface);
        border-color: var(--ds-status-ready-border);
      }

      .status[data-status='awaiting_confirmation'],
      .status[data-status='dispatching'],
      .status[data-status='claimed'],
      .status[data-status='processing'] {
        background: var(--ds-status-running-surface);
        border-color: var(--ds-status-running-border);
        color: var(--ds-text-primary);
      }

      .status[data-status='processed'] {
        background: var(--ds-status-done-surface);
        border-color: var(--ds-status-done-border);
        color: var(--ds-text-primary);
      }

      .status[data-status='failed'] {
        background: var(--ds-status-error-surface);
        border-color: var(--ds-status-error-border);
        color: var(--ds-text-primary);
      }

      .status[data-status='archived'] {
        background: var(--ds-status-archived-surface);
        border-color: var(--ds-status-archived-border);
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .status-dot.queued {
        background: var(--ds-text-tertiary);
      }
      .status-dot.awaiting_confirmation,
      .status-dot.dispatching,
      .status-dot.claimed,
      .status-dot.processing {
        background: var(--ds-warning);
      }
      .status-dot.processed {
        background: var(--ds-success);
      }
      .status-dot.failed {
        background: var(--ds-error);
      }
      .status-dot.archived {
        background: var(--ds-text-tertiary);
      }

      /* ======== Card body ======== */
      .card-body {
        padding: 12px 13px;
        padding-top: 0;
      }

      .content {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        line-height: 1.5;
        word-wrap: break-word;
        cursor: default;
      }

      /* ======== Inline edit ======== */
      .edit-textarea {
        width: 100%;
        min-height: 40px;
        max-height: 120px;
        padding: var(--ds-space-xs);
        background: var(--ds-bg-tertiary);
        border: 1px solid var(--ds-border-focus);
        border-radius: var(--ds-radius-sm);
        font-family: inherit;
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        resize: vertical;
        outline: none;
        line-height: 1.5;
      }

      .edit-hint {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        margin-top: var(--ds-space-xs);
      }

      /* ======== Agent response ======== */
      .agent-summary {
        display: grid;
        gap: 8px;
        margin-top: var(--ds-space-sm);
        padding: 10px 12px;
        background: var(--ds-note-surface);
        border: 1px solid var(--ds-chrome-divider);
        border-radius: 12px;
      }

      .agent-summary-title {
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
      }

      .agent-summary-grid {
        display: grid;
        gap: 6px;
      }

      .agent-summary-row {
        display: grid;
        grid-template-columns: minmax(84px, max-content) minmax(0, 1fr);
        gap: 8px;
        align-items: start;
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      .agent-summary-label {
        color: var(--ds-text-tertiary);
      }

      .agent-summary-value {
        min-width: 0;
        color: var(--ds-text-secondary);
        word-break: break-word;
      }

      .agent-response {
        margin-top: var(--ds-space-sm);
        padding: 10px 12px;
        background: var(--ds-response-surface);
        border: 1px solid var(--ds-response-border);
        border-radius: 14px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
      }

      .agent-label {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-brand-primary);
        margin-bottom: var(--ds-space-xs);
        letter-spacing: 0.01em;
      }

      .agent-label svg {
        width: 12px;
        height: 12px;
      }

      .agent-message {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        line-height: 1.5;
        word-wrap: break-word;
      }

      .patch-summary {
        margin-top: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        font-family: var(--ds-font-mono);
      }

      .run-evidence {
        display: grid;
        gap: 8px;
        margin-top: var(--ds-space-sm);
        padding: 10px 12px;
        background: var(--ds-panel-surface);
        border: 1px solid var(--ds-chrome-divider);
        border-radius: 12px;
      }

      .run-evidence-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
      }

      .run-proof {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--ds-success);
        font-weight: var(--ds-font-weight-medium);
        white-space: nowrap;
      }

      .run-proof-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .run-evidence-grid {
        display: grid;
        gap: 6px;
      }

      .run-file-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        min-width: 0;
      }

      .run-file {
        max-width: 100%;
        padding: 2px 6px;
        border: 1px solid var(--ds-pill-border);
        border-radius: 8px;
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-xs);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .run-path {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        min-width: 0;
      }

      .run-path-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--ds-font-mono);
      }

      .run-path-copy {
        flex-shrink: 0;
        padding: 2px 6px;
        border: 1px solid var(--ds-pill-border);
        border-radius: 8px;
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
      }

      .run-path-copy:hover {
        color: var(--ds-text-primary);
        border-color: var(--ds-panel-border-strong);
      }

      /* Context panel spacing */
      ds-context-panel {
        margin-top: var(--ds-space-sm);
      }

      /* ======== Action bar ======== */
      .action-bar {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: var(--ds-space-xs);
        padding: 10px 13px;
        background: var(--ds-note-surface);
        border-top: 1px solid var(--ds-chrome-divider);
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--ds-space-xs);
        padding: 3px 8px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: 10px;
        font-family: inherit;
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
        white-space: nowrap;
      }

      .action-btn:hover {
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
        border-color: var(--ds-panel-border-strong);
      }

      .action-btn svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
      }

      .action-btn.locate:hover {
        color: var(--ds-brand-primary);
        border-color: var(--ds-brand-primary);
      }

      .action-btn.refresh:hover {
        color: var(--ds-success);
        border-color: var(--ds-success);
      }

      .action-btn.archive:hover {
        color: var(--ds-warning);
        border-color: var(--ds-warning);
      }

      .action-btn.undo:hover {
        color: var(--ds-brand-primary);
        border-color: var(--ds-brand-primary);
      }

      .action-btn.danger:hover {
        color: var(--ds-error);
        border-color: var(--ds-error);
      }

      .action-spacer {
        flex: 1;
      }

      /* ======== Footer ======== */
      .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-space-sm);
        padding: 10px 13px 12px;
        border-top: 1px solid var(--ds-chrome-divider);
        background: var(--ds-panel-surface-muted);
      }

      .footer-meta {
        display: flex;
        align-items: center;
        gap: var(--ds-space-sm);
        min-width: 0;
      }

      .timestamp {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        white-space: nowrap;
      }

      .lifecycle-note {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .source {
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffMins < 1440) return `vor ${Math.floor(diffMins / 60)} Std.`;
    return date.toLocaleDateString();
  }

  private getDispatchView() {
    if (!this.annotation) {
      return null;
    }

    return getAnnotationDispatchView(this.annotation, {
      releasedAnnotationIds: this.releasedAnnotationIds,
      awaitingConfirmationIds: this.awaitingConfirmationIds,
    });
  }

  private getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }

  private stripExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) {
      return fileName.substring(0, lastDot);
    }
    return fileName;
  }

  private toggleExpanded() {
    this.expanded = !this.expanded;
    if (!this.expanded) {
      this.editing = false;
      this.confirmingDelete = false;
      this.confirmingUndo = false;
    } else {
      void this.loadRunEvidence();
    }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('annotation')) {
      this.runEvidence = null;
      this.runEvidenceLoadedFor = null;
      this.runEvidenceLoading = false;
      if (this.expanded) {
        void this.loadRunEvidence();
      }
    }
  }

  private handleContentDblClick(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    this.editing = true;
    this.editValue = this.annotation.context.userMessage ?? '';
  }

  private handleEditKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.cancelEdit();
    }
  }

  private async saveEdit() {
    if (!this.annotation || !this.editValue.trim()) return;
    const relay = RelayService.getInstance();
    await relay.patchAnnotation(this.annotation.metadata.id, {
      context: { userMessage: this.editValue.trim() },
    });
    this.editing = false;
  }

  private cancelEdit() {
    this.editing = false;
    this.editValue = '';
  }

  private async handleCopy(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const json = JSON.stringify(this.annotation, null, 2);
    await navigator.clipboard.writeText(json);
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 1500);
  }

  private canShowRunEvidence(): boolean {
    const status = this.annotation?.metadata.status;
    return status === 'processed' || status === 'failed';
  }

  private async loadRunEvidence(): Promise<void> {
    if (!this.annotation || !this.canShowRunEvidence()) return;

    const annotationId = this.annotation.metadata.id;
    if (this.runEvidenceLoading || this.runEvidenceLoadedFor === annotationId) {
      return;
    }

    this.runEvidenceLoading = true;
    try {
      const relay = RelayService.getInstance();
      const response = await relay.getAnnotationRunEvidence(annotationId);
      this.runEvidence = response?.evidence ?? null;
      this.runEvidenceLoadedFor = annotationId;
    } catch {
      this.runEvidence = null;
      this.runEvidenceLoadedFor = annotationId;
    } finally {
      this.runEvidenceLoading = false;
    }
  }

  private async handleCopyRunPath(e: Event) {
    e.stopPropagation();
    if (!this.runEvidence) return;
    await navigator.clipboard.writeText(this.runEvidence.runDir);
    this.runPathCopied = true;
    setTimeout(() => {
      this.runPathCopied = false;
    }, 1500);
  }

  private handleLocate(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const store = OverlayStore.getInstance();
    store.locateElement(this.annotation);
  }

  private async handleRefresh(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const store = OverlayStore.getInstance();
    const element = await store.refreshAnnotationMetadata(this.annotation);
    if (element) {
      store.locateElement(this.annotation);
    }
  }

  private async handleArchive(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const relay = RelayService.getInstance();
    await relay.archiveAnnotation(this.annotation.metadata.id);
  }

  private handleDeleteClick(e: Event) {
    e.stopPropagation();
    if (this.confirmingDelete) {
      this.confirmDelete();
    } else {
      this.confirmingDelete = true;
      // Auto-cancel after 3s
      setTimeout(() => {
        this.confirmingDelete = false;
      }, 3000);
    }
  }

  private async confirmDelete() {
    if (!this.annotation) return;
    const relay = RelayService.getInstance();
    await relay.deleteAnnotation(this.annotation.metadata.id);
    this.confirmingDelete = false;
  }

  private canShowUndoAction(): boolean {
    const status = this.annotation?.metadata.status;
    return status === 'queued' || status === 'processed' || status === 'failed';
  }

  private getUndoActionLabel(): string {
    const status = this.annotation?.metadata.status;
    if (status === 'queued') {
      return this.confirmingUndo ? 'Bestaetigen' : 'Zurueckholen';
    }

    return this.confirmingUndo ? 'Bestaetigen' : 'Ruecknahme';
  }

  private getUndoActionTitle(): string {
    const status = this.annotation?.metadata.status;
    if (this.confirmingUndo) {
      return 'Zum Bestaetigen erneut klicken';
    }
    if (status === 'queued') {
      return 'Auftrag aus der Warteliste entfernen';
    }
    return 'Neuen Ruecknahme-Auftrag fuer diese Aenderung erstellen';
  }

  private async handleUndoAction(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;

    if (!this.confirmingUndo) {
      this.confirmingUndo = true;
      setTimeout(() => {
        this.confirmingUndo = false;
      }, 3000);
      return;
    }

    const store = OverlayStore.getInstance();
    await store.undoAnnotation(this.annotation);
    this.confirmingUndo = false;
  }

  private renderCopyButton() {
    return html`
      <button
        class="copy-btn ${this.copied ? 'copied' : ''}"
        @click=${this.handleCopy}
        title=${this.copied ? 'Kopiert!' : 'Anmerkung als JSON kopieren'}
      >
        ${this.copied
          ? html`<svg viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>`
          : html`<svg viewBox="0 0 24 24" fill="none">
              <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>`}
      </button>
    `;
  }

  private renderStatus() {
    const view = this.getDispatchView();
    if (!view) {
      return nothing;
    }

    return html`
      <div class="status" data-status=${view.stage}>
        <span class="status-dot ${view.stage}"></span>
        <span class="status-label-text">${view.statusLabel}</span>
      </div>
    `;
  }

  private renderAgentResponse() {
    if (!this.annotation?.agentResponse) return nothing;

    const { message } = this.annotation.agentResponse;
    if (!message) return nothing;

    return html`
      <div class="agent-response">
        <div class="agent-label">
          <!-- Bot icon -->
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1a2 2 0 01-2 2h-1v1a2 2 0 01-2 2H8a2 2 0 01-2-2v-1H5a2 2 0 01-2-2v-1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
            />
            <circle cx="9" cy="13" r="1" fill="currentColor" />
            <circle cx="15" cy="13" r="1" fill="currentColor" />
          </svg>
          Assistent
        </div>
        ${message ? html`<div class="agent-message">${message}</div>` : nothing}
      </div>
    `;
  }

  private renderAgentSummary() {
    if (!this.annotation) return nothing;

    const summary = getAnnotationAgentSummary(this.annotation, {
      releasedAnnotationIds: this.releasedAnnotationIds,
      awaitingConfirmationIds: this.awaitingConfirmationIds,
    });

    return html`
      <div class="agent-summary">
        <div class="agent-summary-title">Agent-Zusammenfassung</div>
        <div class="agent-summary-grid">
          ${summary.channelLabel
            ? this.renderAgentSummaryRow('Agent', summary.channelLabel)
            : nothing}
          ${this.renderAgentSummaryRow(
            'Status',
            summary.statusDetail || summary.statusLabel,
          )}
          ${summary.verificationLabel
            ? this.renderAgentSummaryRow('Pruefung', summary.verificationLabel)
            : nothing}
          ${summary.verificationDetail
            ? this.renderAgentSummaryRow('Grund', summary.verificationDetail)
            : nothing}
          ${summary.responseExcerpt
            ? this.renderAgentSummaryRow('Antwort', summary.responseExcerpt)
            : nothing}
          ${this.renderAgentSummaryRow('Naechster Schritt', summary.nextAction)}
        </div>
      </div>
    `;
  }

  private renderAgentSummaryRow(label: string, value: string) {
    return html`
      <div class="agent-summary-row">
        <span class="agent-summary-label">${label}</span>
        <span class="agent-summary-value">${value}</span>
      </div>
    `;
  }

  private renderRunEvidence() {
    if (!this.canShowRunEvidence()) return nothing;

    if (this.runEvidenceLoading) {
      return html`
        <div class="run-evidence">
          <div class="run-evidence-title">Repo-Beweis</div>
          ${this.renderAgentSummaryRow('Status', 'Run-Beweis wird geladen')}
        </div>
      `;
    }

    if (!this.runEvidence) {
      return html`
        <div class="run-evidence">
          <div class="run-evidence-title">Repo-Beweis</div>
          ${this.renderAgentSummaryRow(
            'Status',
            'Noch kein Run-Beweis gefunden',
          )}
        </div>
      `;
    }

    const evidence = this.runEvidence;
    const diffLabel = evidence.hasDiff
      ? `${evidence.changedFiles.length} Datei${
          evidence.changedFiles.length === 1 ? '' : 'en'
        }, +${evidence.additions}/-${evidence.deletions}`
      : 'Kein Diff gefunden';
    const modelLabel = evidence.model
      ? `${evidence.provider} · ${evidence.model}`
      : evidence.provider;

    return html`
      <div class="run-evidence">
        <div class="run-evidence-title">
          <span>Repo-Beweis</span>
          ${evidence.hasDiff
            ? html`<span class="run-proof"
                ><span class="run-proof-dot"></span>Diff vorhanden</span
              >`
            : nothing}
        </div>
        <div class="run-evidence-grid">
          ${this.renderAgentSummaryRow('Modell', modelLabel)}
          ${this.renderAgentSummaryRow('Diff', diffLabel)}
          ${evidence.changedFiles.length
            ? html`
                <div class="agent-summary-row">
                  <span class="agent-summary-label">Geaendert</span>
                  <span class="agent-summary-value">
                    <span class="run-file-list">
                      ${evidence.changedFiles.map(
                        (file: { path: string }) =>
                          html`<span class="run-file" title=${file.path}
                            >${file.path}</span
                          >`,
                      )}
                    </span>
                  </span>
                </div>
              `
            : nothing}
          <div class="agent-summary-row">
            <span class="agent-summary-label">Run</span>
            <span class="agent-summary-value run-path">
              <span class="run-path-text" title=${evidence.runDir}
                >${evidence.runDir}</span
              >
              <button
                class="run-path-copy"
                @click=${this.handleCopyRunPath}
                title="Run-Pfad kopieren"
              >
                ${this.runPathCopied ? 'Kopiert' : 'Kopieren'}
              </button>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  private renderActionBar() {
    const isArchived = this.annotation?.metadata.status === 'archived';

    return html`
      <div class="action-bar">
        <!-- Locate -->
        <button
          class="action-btn locate"
          @click=${this.handleLocate}
          title="Zum Element springen"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M12 2v4m0 12v4M2 12h4m12 0h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Finden
        </button>

        <!-- Refresh -->
        <button
          class="action-btn refresh"
          @click=${this.handleRefresh}
          title="Elementdaten neu erfassen"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4v5h5M20 20v-5h-5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 013.51 15"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Aktualisieren
        </button>

        <span class="action-spacer"></span>

        ${this.canShowUndoAction()
          ? html`
              <button
                class="action-btn undo"
                @click=${this.handleUndoAction}
                title=${this.getUndoActionTitle()}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 7H4v5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M5 11a7 7 0 1 0 2.05-4.95L4 9"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                ${this.getUndoActionLabel()}
              </button>
            `
          : nothing}

        <!-- Archive (hide if already archived) -->
        ${!isArchived
          ? html`
              <button
                class="action-btn archive"
                @click=${this.handleArchive}
                title="Anmerkung archivieren"
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Archivieren
              </button>
            `
          : nothing}

        <!-- Delete -->
        <button
          class="action-btn danger"
          @click=${this.handleDeleteClick}
          title=${this.confirmingDelete
            ? 'Zum Bestaetigen erneut klicken'
            : 'Anmerkung loeschen'}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          ${this.confirmingDelete ? 'Wirklich?' : 'Loeschen'}
        </button>
      </div>
    `;
  }

  override render() {
    if (!this.annotation) {
      return null;
    }

    const { metadata, interaction, context } = this.annotation;
    const { timestamp } = metadata;
    const dispatchView = this.getDispatchView();
    const content = context.userMessage ?? '';
    const tagName = interaction.selectedElement?.tagName?.toLowerCase() ?? null;

    const manifestEntry = context.manifestSnapshot?.[0];
    const runtimeContext = context.runtimeContext;
    const props = (runtimeContext?.componentProps ?? {}) as Record<
      string,
      unknown
    >;
    const state = (runtimeContext?.componentState ?? {}) as Record<
      string,
      unknown
    >;

    const rawFileName = manifestEntry
      ? this.getFileName(manifestEntry.file)
      : null;
    const displayName = rawFileName ? this.stripExtension(rawFileName) : null;
    const displayTag = `<${tagName ?? 'element'}>`;

    const sourceDisplay = manifestEntry
      ? `${this.getFileName(manifestEntry.file)}:${manifestEntry.start.line}`
      : null;
    const sourceTooltip = manifestEntry
      ? `${manifestEntry.file}:${manifestEntry.start.line}`
      : null;
    const statusNote = dispatchView?.statusDetail;

    // Collapsed: component info + truncated text preview
    if (!this.expanded) {
      return html`
        <div class="collapsed-row" @click=${this.toggleExpanded}>
          <div class="collapsed-inner">
            <div class="element-info">
              ${displayName
                ? html`<span class="file-name">${displayName}</span>
                    <span class="separator">&middot;</span>
                    <span class="tag-name">${displayTag}</span>`
                : html`<span class="tag-name">${displayTag}</span>`}
            </div>
            ${content
              ? html`<span class="collapsed-text">${content}</span>`
              : nothing}
          </div>
          <div class="header-actions">
            ${this.renderCopyButton()} ${this.renderStatus()}
          </div>
        </div>
      `;
    }

    // Expanded: full card
    return html`
      <div class="card">
        <div class="card-header" @click=${this.toggleExpanded}>
          <div class="element-info">
            ${displayName
              ? html`<span class="file-name">${displayName}</span>
                  <span class="separator">&middot;</span>
                  <span class="tag-name">${displayTag}</span>`
              : html`<span class="tag-name">${displayTag}</span>`}
          </div>
          <div class="header-actions">
            ${this.renderCopyButton()} ${this.renderStatus()}
          </div>
        </div>

        <div class="card-body">
          ${this.editing
            ? html`
                <textarea
                  class="edit-textarea"
                  .value=${this.editValue}
                  @input=${(e: Event) => {
                    this.editValue = (e.target as HTMLTextAreaElement).value;
                  }}
                  @keydown=${this.handleEditKeyDown}
                  @blur=${this.saveEdit}
                ></textarea>
                <div class="edit-hint">
                  Enter zum Speichern, Esc zum Abbrechen
                </div>
              `
            : html`
                <p
                  class="content"
                  @dblclick=${this.handleContentDblClick}
                  title="Zum Bearbeiten doppelklicken"
                >
                  ${content}
                </p>
              `}
          ${this.renderAgentSummary()} ${this.renderRunEvidence()}
          ${this.renderAgentResponse()}

          <ds-context-panel .props=${props} .state=${state}></ds-context-panel>
        </div>

        ${this.renderActionBar()}

        <div class="card-footer">
          <div class="footer-meta">
            <span class="timestamp">${this.formatTimestamp(timestamp)}</span>
            ${statusNote
              ? html`<span class="lifecycle-note">${statusNote}</span>`
              : nothing}
          </div>
          ${sourceDisplay
            ? html`<span class="source" title=${sourceTooltip}
                >${sourceDisplay}</span
              >`
            : null}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-item': DsAnnotationItem;
  }
}
