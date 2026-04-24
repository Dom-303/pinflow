/**
 * DsSidebar - Main sidebar container
 *
 * Layout structure:
 * - Header (branding + close)
 * - Scrollable annotations list
 * - Fixed action zone (capture, selected element, input, status)
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import child components
import './ds-header.js';
import './ds-element-preview.js';
import './ds-annotation-list.js';
import './ds-annotation-input.js';
import './ds-settings-overlay.js';

/**
 * Main sidebar component
 *
 * @element ds-sidebar
 */
@customElement('ds-sidebar')
export class DsSidebar extends LitElement {
  private storeController = new StoreController(this);
  private static readonly COMPOSER_HEIGHT_KEY = 'pinflow:composer-height';
  private static readonly DEFAULT_COMPOSER_HEIGHT = 200;
  private static readonly MIN_COMPOSER_HEIGHT = 170;
  private static readonly MAX_COMPOSER_HEIGHT = 440;

  @state()
  private isScrolled = false;

  @state()
  private settingsOpen = false;

  @state()
  private composerHeight = DsSidebar.DEFAULT_COMPOSER_HEIGHT;

  private handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    this.updateScrollState(target);
  }

  private updateScrollState(scrollContainer: HTMLElement) {
    this.isScrolled = scrollContainer.scrollTop > 0;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.composerHeight = this.loadComposerHeight();
    this.syncComposerHeight();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('pointermove', this.handleComposerResizeMove);
    window.removeEventListener('pointerup', this.handleComposerResizeEnd);
  }

  override firstUpdated() {
    // Check initial scroll state after first render
    requestAnimationFrame(() => {
      const mainContent = this.shadowRoot?.querySelector('.main-content');
      if (mainContent) {
        this.updateScrollState(mainContent as HTMLElement);
      }
    });
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('composerHeight')) {
      this.syncComposerHeight();
    }
  }

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 12px;
        right: 12px;
        bottom: 12px;
        width: var(--ds-sidebar-width);
        background:
          radial-gradient(circle at top right, var(--ds-shell-glow), transparent 34%),
          var(--ds-shell-gradient);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 24px;
        box-shadow: var(--ds-shadow-xl);
        overflow: hidden;
      }

      .sidebar-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      /* Scrollable annotations area */
      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px 14px 6px;
      }

      .workspace-top {
        display: grid;
        gap: 8px;
      }

      .section-title {
        font-size: 11px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0;
      }

      .context-drawer,
      .queue-drawer {
        border: 1px solid var(--ds-panel-border);
        border-radius: 14px;
        background: color-mix(
          in srgb,
          var(--ds-panel-surface) 88%,
          transparent
        );
        overflow: hidden;
        transition:
          border-color var(--ds-transition-fast),
          background var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast);
      }

      .context-drawer[open] {
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-sm);
      }

      .queue-drawer[open] {
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-sm);
      }

      .context-summary,
      .queue-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 9px 10px;
        cursor: pointer;
      }

      .context-summary::-webkit-details-marker,
      .queue-summary::-webkit-details-marker {
        display: none;
      }

      .summary-label {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .context-copy {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .context-kicker {
        margin: 0;
        font-size: 10px;
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .context-title {
        margin: 0;
        font-size: 11px;
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: -0.01em;
      }

      .context-subtitle {
        margin: 0;
        color: var(--ds-text-secondary);
        font-size: 10px;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .context-copy-text {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .context-meta {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 7px;
        border-radius: 999px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: 10px;
        white-space: nowrap;
      }

      .context-meta strong {
        color: var(--ds-text-primary);
        font-weight: var(--ds-font-weight-medium);
      }

      .context-chevron {
        width: 18px;
        height: 18px;
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--ds-transition-fast);
      }

      .context-drawer[open] .context-chevron {
        transform: rotate(180deg);
      }

      .queue-drawer[open] .context-chevron {
        transform: rotate(180deg);
      }

      .context-body {
        display: grid;
        gap: 8px;
        padding: 0 10px 10px;
      }

      .selection-note {
        display: grid;
        gap: 3px;
        padding: 8px 9px;
        border-radius: 12px;
        background: var(--ds-panel-surface-muted);
        border: 1px solid var(--ds-panel-border);
      }

      .selection-note-title {
        margin: 0;
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
      }

      .selection-note-copy {
        margin: 0;
        color: var(--ds-text-secondary);
        font-size: 10px;
        line-height: 1.35;
      }

      .queue-body {
        padding: 0 8px 9px;
      }

      .composer-resize-handle {
        position: relative;
        height: 5px;
        flex: 0 0 5px;
        border-top: 1px solid var(--ds-shell-border-soft);
        background: var(--ds-bg-primary);
        cursor: ns-resize;
        touch-action: none;
      }

      .composer-resize-handle:hover,
      .composer-resize-handle:focus-visible {
        border-top-color: var(--ds-text-tertiary);
        outline: none;
      }

      .composer-dock {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: var(--composer-height, 200px);
        min-height: 170px;
        max-height: 440px;
        padding: 8px 14px 14px;
        border-top: 1px solid var(--ds-shell-border-soft);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--ds-bg-primary) 82%, transparent),
            var(--ds-bg-primary)
          ),
          radial-gradient(circle at bottom right, var(--ds-shell-glow), transparent 42%);
        backdrop-filter: blur(22px);
        box-shadow: 0 -12px 26px rgba(0, 0, 0, 0.08);
        overflow: visible;
        position: relative;
        z-index: 2;
      }

      :host([theme='dark']) .composer-dock {
        background: #030302;
        border-top-color: rgba(42, 32, 24, 0.72);
        box-shadow: 0 -14px 30px rgba(0, 0, 0, 0.36);
      }

      ds-annotation-input {
        flex: 1;
        min-height: 0;
      }

      .active-run-panel {
        display: grid;
        gap: 7px;
        padding: 9px 10px;
        border-radius: 14px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-panel-surface-muted);
        box-shadow: var(--ds-panel-shadow-soft);
      }

      .active-run-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .active-run-title {
        margin: 0;
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
      }

      .active-run-meta {
        color: var(--ds-text-tertiary);
        font-size: 10px;
      }

      .active-run-list {
        display: grid;
        gap: 5px;
      }

      .active-run-task {
        display: grid;
        grid-template-columns: 14px minmax(0, 1fr) auto;
        align-items: center;
        gap: 7px;
        min-height: 22px;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .active-run-task[data-status='processed'] .active-run-task-label {
        color: var(--ds-text-tertiary);
        text-decoration: line-through;
      }

      .active-run-task-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .active-run-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--ds-text-tertiary);
      }

      .active-run-task[data-status='processing'] .active-run-dot {
        background: var(--ds-brand-primary);
        box-shadow: 0 0 0 4px
          color-mix(in srgb, var(--ds-brand-primary) 16%, transparent);
      }

      .active-run-task[data-status='processed'] .active-run-dot {
        background: var(--ds-success);
      }

      .active-run-status {
        color: var(--ds-text-tertiary);
        font-size: 10px;
        white-space: nowrap;
      }
    `,
  ];

  private handleOpenSettings() {
    this.settingsOpen = true;
  }

  private handleCloseSettings() {
    this.settingsOpen = false;
  }

  private handleProjectDefaultsChange(event: CustomEvent) {
    this.storeController.store.updateDispatchProjectDefaults(event.detail);
  }

  private resetSessionOverrides() {
    this.storeController.store.clearDispatchSessionOverrides();
  }

  private loadComposerHeight() {
    try {
      const stored = window.localStorage.getItem(DsSidebar.COMPOSER_HEIGHT_KEY);
      const parsed = stored ? Number(stored) : DsSidebar.DEFAULT_COMPOSER_HEIGHT;
      return this.clampComposerHeight(parsed);
    } catch {
      return DsSidebar.DEFAULT_COMPOSER_HEIGHT;
    }
  }

  private persistComposerHeight(height: number) {
    try {
      window.localStorage.setItem(DsSidebar.COMPOSER_HEIGHT_KEY, String(height));
    } catch {
      // localStorage unavailable
    }
  }

  private clampComposerHeight(height: number) {
    const hostHeight = this.getBoundingClientRect().height || 760;
    const maxByShell = Math.max(
      DsSidebar.MIN_COMPOSER_HEIGHT,
      Math.min(DsSidebar.MAX_COMPOSER_HEIGHT, Math.round(hostHeight * 0.58)),
    );

    return Math.round(
      Math.max(DsSidebar.MIN_COMPOSER_HEIGHT, Math.min(maxByShell, height)),
    );
  }

  private syncComposerHeight() {
    this.style.setProperty('--composer-height', `${this.composerHeight}px`);
  }

  private handleComposerResizeStart = (event: PointerEvent) => {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handleComposerResizeMove);
    window.addEventListener('pointerup', this.handleComposerResizeEnd, {
      once: true,
    });
  };

  private handleComposerResizeMove = (event: PointerEvent) => {
    const rect = this.getBoundingClientRect();
    const nextHeight = this.clampComposerHeight(rect.bottom - event.clientY);
    this.composerHeight = nextHeight;
    this.syncComposerHeight();
  };

  private handleComposerResizeEnd = () => {
    window.removeEventListener('pointermove', this.handleComposerResizeMove);
    this.persistComposerHeight(this.composerHeight);
  };

  private getAnnotationId(annotation: unknown): string {
    const entry = annotation as {
      id?: string;
      metadata?: { id?: string };
    };
    return entry.metadata?.id ?? entry.id ?? '';
  }

  private getAnnotationStatus(annotation: unknown): string {
    return (
      (annotation as { metadata?: { status?: string } }).metadata?.status ??
      'queued'
    );
  }

  private getAnnotationLabel(annotation: unknown, fallback: string): string {
    const entry = annotation as {
      context?: { userMessage?: string };
      metadata?: { id?: string };
      id?: string;
    };
    return entry.context?.userMessage ?? entry.metadata?.id ?? entry.id ?? fallback;
  }

  private getTaskStatusLabel(status: string) {
    if (status === 'processing') return 'arbeitet';
    if (status === 'processed') return 'fertig';
    if (status === 'failed') return 'Fehler';
    return 'wartet';
  }

  private renderActiveRunPanel() {
    const { annotations, dispatchBatches } = this.storeController.state;
    const latestBatch = dispatchBatches[0];
    const hasProcessing = annotations.some(
      (annotation) => this.getAnnotationStatus(annotation) === 'processing',
    );

    if (!latestBatch || (latestBatch.status !== 'running' && !hasProcessing)) {
      return null;
    }

    const tasks = latestBatch.annotationIds
      .map((id) => {
        const annotation = annotations.find(
          (entry) => this.getAnnotationId(entry) === id,
        );
        return {
          id,
          label: annotation ? this.getAnnotationLabel(annotation, id) : id,
          status: annotation ? this.getAnnotationStatus(annotation) : 'queued',
        };
      })
      .slice(0, 5);
    const activeCount = tasks.filter((task) => task.status === 'processing').length;
    const doneCount = tasks.filter((task) => task.status === 'processed').length;

    return html`
      <div class="active-run-panel">
        <div class="active-run-head">
          <p class="active-run-title">Aktiver Lauf</p>
          <span class="active-run-meta">${doneCount}/${tasks.length} fertig</span>
        </div>
        <div class="active-run-list">
          ${tasks.map(
            (task) => html`
              <div class="active-run-task" data-status=${task.status}>
                <span class="active-run-dot" aria-hidden="true"></span>
                <span class="active-run-task-label">${task.label}</span>
                <span class="active-run-status"
                  >${this.getTaskStatusLabel(task.status)}</span
                >
              </div>
            `,
          )}
        </div>
        ${activeCount === 0
          ? html`<span class="active-run-meta">Wartet auf den naechsten Schritt.</span>`
          : null}
      </div>
    `;
  }

  override render() {
    const { selectedElement } =
      this.storeController.state;
    const selectedLabel = selectedElement
      ? String((selectedElement as { tagName?: string }).tagName ?? 'element').toLowerCase()
      : 'Kein Element';
    const selectedTitle = selectedElement ? `<${selectedLabel}>` : 'Noch kein Element';
    const selectedSubtitle = selectedElement
      ? 'Quelle und Kontext sind verbunden.'
      : 'Element im Canvas markieren.';

    if (this.settingsOpen) {
      return html`
        <div class="sidebar-content">
          <ds-settings-overlay
            .projectDefaults=${this.storeController.state.dispatchProjectDefaults}
            .sessionOverrides=${this.storeController.state.dispatchSession.overrides}
            @close-settings=${this.handleCloseSettings}
            @project-defaults-change=${this.handleProjectDefaultsChange}
            @reset-session-overrides=${this.resetSessionOverrides}
          ></ds-settings-overlay>
        </div>
      `;
    }

    return html`
      <div class="sidebar-content">
        <ds-header
          ?scrolled=${this.isScrolled}
          @open-settings=${this.handleOpenSettings}
        ></ds-header>

        <!-- Scrollable annotations area -->
        <div class="main-content" @scroll=${this.handleScroll}>
          <div class="workspace-top">
            <details class="context-drawer">
              <summary class="context-summary">
                <span class="summary-label">Auswahl</span>
                <svg
                  class="context-chevron"
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
              <div class="context-body">
                <div class="selection-note">
                  <p class="selection-note-title">${selectedTitle}</p>
                  <p class="selection-note-copy">${selectedSubtitle}</p>
                </div>
                <ds-element-preview></ds-element-preview>
              </div>
            </details>

            <details class="queue-drawer">
              <summary class="queue-summary">
                <span class="summary-label">Warteliste</span>
                <svg
                  class="context-chevron"
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
              <div class="queue-body">
                <ds-annotation-list></ds-annotation-list>
              </div>
            </details>

          </div>
        </div>

        <div
          class="composer-resize-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Eingabefeldhoehe anpassen"
          tabindex="0"
          @pointerdown=${this.handleComposerResizeStart}
        ></div>

        <div class="composer-dock">
          ${this.renderActiveRunPanel()}
          <ds-annotation-input
            @open-settings=${this.handleOpenSettings}
          ></ds-annotation-input>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-sidebar': DsSidebar;
  }
}
