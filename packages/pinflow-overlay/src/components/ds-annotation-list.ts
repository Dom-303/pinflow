/**
 * DsAnnotationList - Status-grouped accordion with pagination
 *
 * Groups annotations by status (Queued, Processing, Processed, Failed, Archived).
 * Each group is collapsible. Within each group, annotations are paginated (10 per page).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Annotation, AnnotationStatus } from '@pinflow/core';
import { AnnotationStatusEnum } from '@pinflow/core';
import { StoreController } from '../core/store-controller.js';
import {
  analyzeDispatchQueue,
  mergeDispatchConfig,
} from '../core/dispatch-config.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import child components
import './ds-annotation-item.js';

const PAGE_SIZE = 4;

/** Status display order */
const STATUS_ORDER: AnnotationStatus[] = [
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
];

const STATUS_LABELS: Record<string, string> = {
  queued: 'Warteliste',
  processing: 'In Bearbeitung',
  processed: 'Uebergeben',
  failed: 'Fehlgeschlagen',
  archived: 'Archiviert',
};

/**
 * Annotation list component with accordion layout
 *
 * @element ds-annotation-list
 */
@customElement('ds-annotation-list')
export class DsAnnotationList extends LitElement {
  private storeController = new StoreController(this);

  @property({ reflect: true })
  variant: 'grouped' | 'list' = 'grouped';

  @state()
  private openStatuses: Set<string> = new Set();

  @state()
  private pages: Record<string, number> = {};

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      .accordion {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .plain-list {
        display: grid;
        gap: 9px;
      }

      .plain-item {
        display: grid;
        gap: 6px;
        min-width: 0;
        padding: 10px 11px;
        border: 1px solid var(--ds-panel-border);
        border-radius: 12px;
        background: var(--ds-panel-surface-muted);
        box-sizing: border-box;
        overflow: hidden;
      }

      .plain-item-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        gap: 8px;
        min-width: 0;
      }

      .plain-copy {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .plain-title {
        min-width: 0;
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .plain-message {
        min-width: 0;
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.35;
        overflow: hidden;
        overflow-wrap: anywhere;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .plain-meta {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.4;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .plain-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
        padding: 4px 8px;
        border: 1px solid var(--ds-pill-border);
        border-radius: 999px;
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      /* ======== Status group ======== */
      .status-group {
        background: var(--ds-panel-surface-muted);
        border: 1px solid var(--ds-panel-border);
        border-radius: 13px;
        overflow: hidden;
      }

      .status-group[data-status='queued'] .status-count {
        background: var(--ds-status-ready-surface);
        border-color: var(--ds-status-ready-border);
      }

      .status-group[data-status='processing'] .status-count {
        background: var(--ds-status-running-surface);
        border-color: var(--ds-status-running-border);
        color: var(--ds-text-primary);
      }

      .status-group[data-status='processed'] .status-count {
        background: var(--ds-status-done-surface);
        border-color: var(--ds-status-done-border);
        color: var(--ds-text-primary);
      }

      .status-group[data-status='failed'] .status-count {
        background: var(--ds-status-error-surface);
        border-color: var(--ds-status-error-border);
        color: var(--ds-text-primary);
      }

      .status-group[data-status='archived'] .status-count {
        background: var(--ds-status-archived-surface);
        border-color: var(--ds-status-archived-border);
      }

      .status-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 46px;
        padding: 11px 12px;
        background: transparent;
        border: none;
        border-radius: 13px;
        width: 100%;
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          border-radius var(--ds-transition-fast),
          color var(--ds-transition-fast);
        font-family: inherit;
        color: var(--ds-text-primary);
      }

      .status-header.open {
        border-radius: 13px 13px 0 0;
        border-bottom: 1px solid var(--ds-chrome-divider);
      }

      .status-header:hover {
        background: var(--ds-panel-surface);
      }

      .status-header.empty {
        cursor: default;
        opacity: 0.5;
      }

      .status-header.empty:hover {
        background: var(--ds-bg-tertiary);
      }

      .status-label {
        display: flex;
        align-items: center;
        gap: var(--ds-space-sm);
        min-width: 0;
        font-size: 13px;
        font-weight: var(--ds-font-weight-medium);
      }

      .status-count {
        display: inline-flex;
        align-items: center;
        min-width: 24px;
        padding: 1px 8px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: var(--ds-radius-full);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        font-weight: var(--ds-font-weight-medium);
      }

      .chevron {
        width: 14px;
        height: 14px;
        color: var(--ds-text-tertiary);
        transition: transform var(--ds-transition-fast);
        flex-shrink: 0;
      }

      .chevron.open {
        transform: rotate(90deg);
      }

      /* ======== Group content ======== */
      .group-content {
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 8px 8px 10px;
      }

      .queue-action {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        padding: 9px 10px;
        border: 1px solid
          color-mix(
            in srgb,
            var(--ds-brand-primary) 24%,
            var(--ds-panel-border)
          );
        border-radius: 12px;
        background: color-mix(
          in srgb,
          var(--ds-brand-primary) 7%,
          var(--ds-panel-surface-muted)
        );
      }

      .queue-action-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .queue-action-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
      }

      .queue-action-text {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.32;
        overflow-wrap: anywhere;
      }

      .queue-action-btn,
      .queue-action-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        max-width: 104px;
        min-height: 28px;
        padding: 6px 9px;
        border: 1px solid transparent;
        border-radius: 10px;
        font: inherit;
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        line-height: 1.15;
        text-align: center;
        white-space: normal;
      }

      .queue-action-btn {
        background: var(--ds-brand-primary);
        color: var(--ds-bg-tertiary);
        cursor: pointer;
      }

      .queue-action-btn:disabled {
        opacity: 0.52;
        cursor: default;
      }

      .queue-action-status {
        background: var(--ds-pill-surface);
        border-color: var(--ds-pill-border);
        color: var(--ds-text-secondary);
      }

      /* ======== Pagination ======== */
      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ds-space-sm);
        padding: 2px 0 0;
      }

      .page-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: 10px;
        color: var(--ds-text-secondary);
        cursor: pointer;
        font-family: inherit;
        transition: all var(--ds-transition-fast);
      }

      .page-btn:hover:not(:disabled) {
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
        border-color: var(--ds-panel-border-strong);
      }

      .page-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .page-btn svg {
        width: 12px;
        height: 12px;
      }

      .page-info {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        min-width: 42px;
        text-align: center;
      }

      /* ======== Empty state ======== */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--ds-space-sm);
        padding: var(--ds-space-lg);
        background: var(--ds-empty-surface);
        border: 1px solid var(--ds-empty-border);
        border-radius: 13px;
        color: var(--ds-text-secondary);
        text-align: center;
      }

      .empty-state-icon {
        width: 32px;
        height: 32px;
        margin-bottom: 0;
        opacity: 0.5;
      }

      .empty-state-title {
        margin: 0;
        font-size: var(--ds-font-size-md);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: -0.02em;
        text-align: left;
      }

      .empty-state-text {
        margin: 0;
        font-size: var(--ds-font-size-sm);
        line-height: 1.55;
        text-align: left;
      }

      /* Status-specific dot colors in header */
      .header-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .header-dot.queued {
        background: var(--ds-text-tertiary);
      }
      .header-dot.processing {
        background: var(--ds-warning);
      }
      .header-dot.processed {
        background: var(--ds-success);
      }
      .header-dot.failed {
        background: var(--ds-error);
      }
      .header-dot.archived {
        background: var(--ds-text-tertiary);
      }

      :host([theme='light']) .status-group {
        background: rgba(255, 253, 250, 0.72);
      }

      :host([theme='dark']) .status-group,
      :host([theme='dark']) .empty-state,
      :host([theme='dark']) .plain-item,
      :host([theme='dark']) .queue-action {
        background: #080706;
        border-color: rgba(38, 30, 24, 0.9);
      }

      :host([theme='dark']) .status-header:hover {
        background: #100d0a;
      }

      :host([theme='dark']) .status-header.open {
        border-bottom-color: rgba(42, 33, 26, 0.86);
      }

      :host([theme='dark']) .status-count,
      :host([theme='dark']) .page-btn,
      :host([theme='dark']) .plain-status {
        background: #12100d;
        border-color: rgba(50, 38, 29, 0.76);
      }

      :host([theme='dark']) .empty-state-text,
      :host([theme='dark']) .plain-meta,
      :host([theme='dark']) .queue-action-text {
        color: #988878;
      }
    `,
  ];

  private groupByStatus(
    annotations: Annotation[],
  ): Record<string, Annotation[]> {
    const groups: Record<string, Annotation[]> = {};
    for (const status of STATUS_ORDER) {
      groups[status] = [];
    }
    for (const ann of annotations) {
      const status = ann.metadata.status;
      if (groups[status]) {
        groups[status].push(ann);
      }
    }
    return groups;
  }

  private toggleStatus(status: string) {
    const next = new Set(this.openStatuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    this.openStatuses = next;
  }

  private getPage(status: string): number {
    return this.pages[status] ?? 0;
  }

  private setPage(status: string, page: number) {
    this.pages = { ...this.pages, [status]: page };
  }

  private releaseNextBatch() {
    this.storeController.store.releaseNextDispatchBatch();
  }

  private getQueueAction(): {
    title: string;
    copy: string;
    actionLabel: string;
    disabled: boolean;
  } | null {
    const {
      annotations,
      dispatchProjectDefaults,
      dispatchSession,
      runnerStatus,
    } =
      this.storeController.state;
    const effective = mergeDispatchConfig(
      dispatchProjectDefaults,
      dispatchSession,
    );
    const analysis = analyzeDispatchQueue(annotations, {
      releasedAnnotationIds: dispatchSession.releasedAnnotationIds,
      awaitingConfirmationIds: dispatchSession.awaitingConfirmationIds,
      concurrency: effective.concurrency,
    });

    if (
      analysis.unreleasedWaitingIds.length === 0 &&
      analysis.awaitingConfirmationIds.length === 0
    ) {
      return null;
    }

    if (effective.channel === 'queue_only') {
      return {
        title: 'Warteliste sammelt nur',
        copy: 'Waehle ein Uebergabeziel, wenn du die Warteliste senden moechtest.',
        actionLabel: 'Nur sammeln',
        disabled: true,
      };
    }

    if (effective.paused) {
      return {
        title: 'Warteliste pausiert',
        copy: 'Hebe die Pause auf, damit wartende Aufgaben gesendet werden koennen.',
        actionLabel: 'Pausiert',
        disabled: true,
      };
    }

    if (analysis.awaitingConfirmationIds.length > 0) {
      const count = analysis.awaitingConfirmationIds.length;
      return {
        title: 'Freigabe bereit',
        copy: `${count} Aufgabe${count === 1 ? '' : 'n'} ${count === 1 ? 'wartet' : 'warten'} auf deine Freigabe.`,
        actionLabel: `Freigeben (${count})`,
        disabled: false,
      };
    }

    if (
      dispatchSession.lastDispatchError &&
      analysis.releasableIds.length > 0
    ) {
      const count = analysis.releasableIds.length;
      return {
        title: 'Senden fehlgeschlagen',
        copy: dispatchSession.lastDispatchError,
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

  private renderQueueAction(status: string) {
    if (status !== AnnotationStatusEnum.QUEUED) {
      return nothing;
    }

    const queueAction = this.getQueueAction();
    if (!queueAction) {
      return nothing;
    }

    return html`
      <div class="queue-action">
        <div class="queue-action-copy">
          <div class="queue-action-title">${queueAction.title}</div>
          <div class="queue-action-text">${queueAction.copy}</div>
        </div>
        <button
          class=${queueAction.disabled
            ? 'queue-action-status'
            : 'queue-action-btn'}
          ?disabled=${queueAction.disabled}
          @click=${this.releaseNextBatch}
        >
          ${queueAction.actionLabel}
        </button>
      </div>
    `;
  }

  private renderPagination(status: string, total: number) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return nothing;

    const currentPage = this.getPage(status);

    return html`
      <div class="pagination">
        <button
          class="page-btn"
          ?disabled=${currentPage === 0}
          @click=${() => this.setPage(status, currentPage - 1)}
          title="Vorherige Seite"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <span class="page-info">${currentPage + 1} / ${totalPages}</span>
        <button
          class="page-btn"
          ?disabled=${currentPage >= totalPages - 1}
          @click=${() => this.setPage(status, currentPage + 1)}
          title="Naechste Seite"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    `;
  }

  private renderStatusGroup(status: string, annotations: Annotation[]) {
    const count = annotations.length;
    const isOpen = this.openStatuses.has(status);
    const isEmpty = count === 0;

    const page = this.getPage(status);
    const start = page * PAGE_SIZE;
    const pageItems = annotations.slice(start, start + PAGE_SIZE);
    const { dispatchSession } = this.storeController.state;

    return html`
      <div class="status-group" data-status=${status}>
        <button
          class="status-header ${isEmpty ? 'empty' : ''} ${isOpen
            ? 'open'
            : ''}"
          @click=${() => !isEmpty && this.toggleStatus(status)}
        >
          <div class="status-label">
            <span class="header-dot ${status}"></span>
            ${STATUS_LABELS[status] ?? status}
            <span class="status-count">${count}</span>
          </div>
          ${!isEmpty
            ? html`<svg
                class="chevron ${isOpen ? 'open' : ''}"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>`
            : nothing}
        </button>

        ${isOpen && !isEmpty
          ? html`
              <div class="group-content">
                ${this.renderQueueAction(status)}
                ${pageItems.map(
                  (annotation) => html`
                    <ds-annotation-item
                      .annotation=${annotation}
                      .releasedAnnotationIds=${dispatchSession.releasedAnnotationIds}
                      .awaitingConfirmationIds=${dispatchSession.awaitingConfirmationIds}
                    ></ds-annotation-item>
                  `,
                )}
                ${this.renderPagination(status, count)}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private getAnnotationId(annotation: Annotation): string | null {
    return (
      annotation.metadata?.id ??
      (annotation as Annotation & { id?: string }).id ??
      null
    );
  }

  private getPlainTitle(annotation: Annotation): string {
    const manifestEntry = annotation.context?.manifestSnapshot?.[0];
    const fileName = manifestEntry?.file
      ? manifestEntry.file.split('/').pop()
      : null;
    const tagName = annotation.interaction?.selectedElement?.tagName
      ? `<${annotation.interaction.selectedElement.tagName.toLowerCase()}>`
      : null;

    if (fileName && manifestEntry?.start?.line) {
      return `${fileName}:${manifestEntry.start.line}`;
    }

    return tagName ?? 'Auswahl';
  }

  private getPlainMeta(annotation: Annotation): string {
    const status =
      STATUS_LABELS[annotation.metadata?.status] ??
      annotation.metadata?.status ??
      'Status offen';
    const dataDs = annotation.interaction?.selectedElement?.dataDs;
    const id = this.getAnnotationId(annotation);

    if (dataDs) {
      return `${status} · ${dataDs}`;
    }

    return id ? `${status} · ${id}` : status;
  }

  private getPlainMessage(annotation: Annotation): string {
    return annotation.context?.userMessage?.trim() || 'Ohne Kommentar';
  }

  private renderPlainListItem(annotation: Annotation) {
    const status = annotation.metadata?.status ?? 'queued';

    return html`
      <article class="plain-item">
        <div class="plain-item-row">
          <div class="plain-copy">
            <div class="plain-title">${this.getPlainTitle(annotation)}</div>
            <div class="plain-message">${this.getPlainMessage(annotation)}</div>
            <div class="plain-meta">${this.getPlainMeta(annotation)}</div>
          </div>
          <span class="plain-status">
            <span class="header-dot ${status}"></span>
            ${STATUS_LABELS[status] ?? status}
          </span>
        </div>
      </article>
    `;
  }

  override render() {
    const { annotations } = this.storeController.state;
    if (annotations.length === 0) {
      return html`
        <div class="empty-state">
          <svg
            class="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6.75 7.5h10.5M6.75 12h10.5M6.75 16.5h6"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <path
              d="M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </svg>
          <p class="empty-state-title">
            Noch keine Anmerkungen in dieser Session
          </p>
          <p class="empty-state-text">
            Markiere ein Element und starte rechts mit deiner ersten Aenderung.
          </p>
        </div>
      `;
    }

    const groups = this.groupByStatus(annotations);

    if (this.variant === 'list') {
      return html`
        <div class="plain-list">
          ${annotations.map((annotation) =>
            this.renderPlainListItem(annotation),
          )}
        </div>
      `;
    }

    return html`
      <div class="accordion">
        ${STATUS_ORDER.map((status) =>
          this.renderStatusGroup(status, groups[status]),
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-list': DsAnnotationList;
  }
}
