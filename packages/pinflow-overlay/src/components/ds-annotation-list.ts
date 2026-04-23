/**
 * DsAnnotationList - Status-grouped accordion with pagination
 *
 * Groups annotations by status (Queued, Processing, Processed, Failed, Archived).
 * Each group is collapsible. Within each group, annotations are paginated (10 per page).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Annotation, AnnotationStatus } from '@pinflow/core';
import { AnnotationStatusEnum } from '@pinflow/core';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import child components
import './ds-annotation-item.js';

const PAGE_SIZE = 10;

/** Status display order */
const STATUS_ORDER: AnnotationStatus[] = [
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
];

const STATUS_LABELS: Record<string, string> = {
  queued: 'Bereit',
  processing: 'Laeuft',
  processed: 'Erledigt',
  failed: 'Fehler',
  archived: 'Archiv',
};

/**
 * Annotation list component with accordion layout
 *
 * @element ds-annotation-list
 */
@customElement('ds-annotation-list')
export class DsAnnotationList extends LitElement {
  private storeController = new StoreController(this);

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
        gap: 10px;
      }

      /* ======== Status group ======== */
      .status-group {
        background: var(--ds-panel-surface-muted);
        border: 1px solid var(--ds-panel-border);
        border-radius: calc(var(--ds-radius-lg) - 2px);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.54);
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
        padding: 12px 14px;
        background: transparent;
        border: none;
        border-radius: calc(var(--ds-radius-lg) - 2px);
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
        border-radius: calc(var(--ds-radius-lg) - 2px)
          calc(var(--ds-radius-lg) - 2px) 0 0;
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
        gap: 10px;
        padding: 10px 10px 12px;
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
        border-radius: calc(var(--ds-radius-lg) - 2px);
        box-shadow: var(--ds-panel-shadow-soft);
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
                ${pageItems.map(
                  (annotation) => html`
                    <ds-annotation-item
                      .annotation=${annotation}
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
          <p class="empty-state-title">Noch keine Anmerkungen in dieser Session</p>
          <p class="empty-state-text">
            Markiere ein Element und starte rechts mit deiner ersten Aenderung.
          </p>
        </div>
      `;
    }

    const groups = this.groupByStatus(annotations);

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
