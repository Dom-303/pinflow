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
import { getThemeIconAsset } from './logo/index.js';

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
  private static readonly MIN_COMPOSER_HEIGHT = 190;
  private static readonly MAX_COMPOSER_HEIGHT = 320;

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
    this.syncHostAttributes();
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
    this.syncHostAttributes();
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
          radial-gradient(
            circle at top right,
            var(--ds-shell-glow),
            transparent 34%
          ),
          var(--ds-shell-gradient);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 24px;
        box-shadow: var(--ds-shadow-xl);
        overflow: hidden;
      }

      :host([mini]) {
        top: auto;
        height: min(310px, calc(100vh - 24px));
      }

      .sidebar-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .mini-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        padding: 10px;
        gap: 9px;
        background: var(--ds-bg-primary);
      }

      :host([theme='dark']) .mini-content {
        background: #030302;
      }

      .mini-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 30px;
        padding: 0 2px;
      }

      .mini-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .mini-logo {
        display: block;
        width: 22px;
        height: 22px;
        object-fit: contain;
        border-radius: 7px;
        flex: 0 0 auto;
      }

      .mini-title {
        color: var(--ds-text-primary);
        font-size: 13px;
        font-weight: var(--ds-font-weight-semibold);
      }

      .mini-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 7px;
        border: 1px solid var(--ds-pill-border);
        border-radius: var(--ds-radius-full);
        background: var(--ds-note-surface);
        color: var(--ds-text-secondary);
        font-size: 10px;
        font-weight: var(--ds-font-weight-medium);
        white-space: nowrap;
      }

      .mini-status::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ds-text-tertiary);
      }

      .mini-status.active {
        color: var(--ds-text-primary);
        border-color: color-mix(
          in srgb,
          var(--ds-brand-primary) 32%,
          var(--ds-pill-border)
        );
        background: color-mix(
          in srgb,
          var(--ds-brand-primary) 10%,
          var(--ds-note-surface)
        );
      }

      .mini-status.active::before {
        background: var(--ds-brand-primary);
        box-shadow: 0 0 0 4px
          color-mix(in srgb, var(--ds-brand-primary) 18%, transparent);
      }

      .mini-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .mini-btn {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 9px;
        background: var(--ds-shell-surface-quiet);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          color var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .mini-btn:hover {
        background: var(--ds-highlight);
        color: var(--ds-text-primary);
        transform: translateY(-1px);
      }

      .mini-btn svg {
        width: 15px;
        height: 15px;
      }

      .mini-composer {
        flex: 1;
        min-height: 0;
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
        height: var(--composer-height, 200px);
        min-height: 190px;
        max-height: 320px;
        padding: 8px 14px 14px;
        border-top: 1px solid var(--ds-shell-border-soft);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--ds-bg-primary) 82%, transparent),
            var(--ds-bg-primary)
          ),
          radial-gradient(
            circle at bottom right,
            var(--ds-shell-glow),
            transparent 42%
          );
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
        flex: 0 0 auto;
        margin: 8px 14px 0;
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
        border: 1.5px solid var(--ds-text-tertiary);
        background: transparent;
        box-sizing: border-box;
      }

      .active-run-task[data-status='claimed'] .active-run-dot,
      .active-run-task[data-status='processing'] .active-run-dot {
        border-color: var(--ds-brand-primary);
        background: transparent;
        box-shadow: 0 0 0 4px
          color-mix(in srgb, var(--ds-brand-primary) 16%, transparent);
      }

      .active-run-task[data-status='processed'] .active-run-dot {
        position: relative;
        display: grid;
        place-items: center;
        width: 11px;
        height: 11px;
        margin-left: -1.5px;
        border-color: var(--ds-success);
        background: var(--ds-success);
      }

      .active-run-task[data-status='processed'] .active-run-dot::after {
        content: '';
        width: 5px;
        height: 3px;
        border-left: 1.3px solid var(--ds-bg-primary);
        border-bottom: 1.3px solid var(--ds-bg-primary);
        transform: rotate(-45deg) translateY(-0.5px);
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

  private handleMinimizeSidebar() {
    this.settingsOpen = false;
    this.storeController.store.setMode('mini');
  }

  private handleExpandSidebar() {
    this.storeController.store.setMode('expanded');
  }

  private handleCloseSidebar() {
    this.storeController.store.setMode('collapsed');
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
      const parsed = stored
        ? Number(stored)
        : DsSidebar.DEFAULT_COMPOSER_HEIGHT;
      return this.clampComposerHeight(parsed);
    } catch {
      return DsSidebar.DEFAULT_COMPOSER_HEIGHT;
    }
  }

  private persistComposerHeight(height: number) {
    try {
      window.localStorage.setItem(
        DsSidebar.COMPOSER_HEIGHT_KEY,
        String(height),
      );
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

  private syncHostAttributes() {
    const { mode, theme } = this.storeController.state;
    this.toggleAttribute('mini', mode === 'mini');
    this.setAttribute('theme', theme);
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
    return (
      entry.context?.userMessage ?? entry.metadata?.id ?? entry.id ?? fallback
    );
  }

  private getTaskStatusLabel(status: string) {
    if (status === 'claimed') return 'uebernommen';
    if (status === 'processing') return 'arbeitet';
    if (status === 'processed') return 'fertig';
    if (status === 'failed') return 'Fehler';
    return 'wartet';
  }

  private renderActiveRunPanel() {
    const { annotations, dispatchBatches, runnerStatus } =
      this.storeController.state;
    const latestBatch = dispatchBatches[0];
    const activeAnnotations = annotations.filter((annotation) =>
      ['claimed', 'processing'].includes(this.getAnnotationStatus(annotation)),
    );
    const hasActiveAnnotations = activeAnnotations.length > 0;

    if (
      (!latestBatch || latestBatch.status !== 'running') &&
      !hasActiveAnnotations
    ) {
      return null;
    }

    const tasks = (
      latestBatch?.status === 'running'
        ? latestBatch.annotationIds.map((id) => {
            const annotation = annotations.find(
              (entry) => this.getAnnotationId(entry) === id,
            );
            return {
              id,
              label: annotation ? this.getAnnotationLabel(annotation, id) : id,
              status: annotation
                ? this.getAnnotationStatus(annotation)
                : 'queued',
            };
          })
        : activeAnnotations.map((annotation) => {
            const id = this.getAnnotationId(annotation);
            return {
              id,
              label: this.getAnnotationLabel(annotation, id),
              status: this.getAnnotationStatus(annotation),
            };
          })
    ).slice(0, 5);
    const agentStartedCount = tasks.filter(
      (task) => task.status === 'claimed' || task.status === 'processing',
    ).length;
    const doneCount = tasks.filter(
      (task) => task.status === 'processed',
    ).length;

    return html`
      <div class="active-run-panel">
        <div class="active-run-head">
          <p class="active-run-title">Aktiver Lauf</p>
          <span class="active-run-meta"
            >${doneCount}/${tasks.length} fertig</span
          >
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
        ${agentStartedCount === 0
          ? html`<span class="active-run-meta"
              >${runnerStatus.connected
                ? 'Runner bereit. Wartet auf den naechsten Schritt.'
                : 'Kein Runner verbunden.'}</span
            >`
          : null}
      </div>
    `;
  }

  override render() {
    const {
      relayConnected,
      selectedElement,
      selectedElements,
      selectedRegion,
      mode,
      theme,
    } = this.storeController.state;
    const statusLabel = relayConnected ? 'aktiv' : 'nicht aktiv';
    const selectedLabel = selectedElement
      ? String(
          (selectedElement as { tagName?: string }).tagName ?? 'element',
        ).toLowerCase()
      : 'Kein Element';
    const hasSelection =
      !!selectedElement || selectedElements.length > 0 || !!selectedRegion;
    const selectedTitle = selectedRegion
      ? `Bereich mit ${selectedRegion.elements.length} Treffern`
      : selectedElements.length > 1
        ? `${selectedElements.length} Elemente`
        : selectedElement
          ? `<${selectedLabel}>`
          : 'Noch keine Auswahl';
    const selectedSubtitle = selectedRegion
      ? 'Viewport-Bereich und betroffene Elemente sind markiert.'
      : selectedElements.length > 1
        ? 'Mehrere Elemente sind fuer einen gemeinsamen Auftrag markiert.'
        : selectedElement
          ? 'Quelle und Kontext sind verbunden.'
          : 'Element im Canvas markieren.';

    if (this.settingsOpen) {
      return html`
        <div class="sidebar-content">
          <ds-settings-overlay
            .projectDefaults=${this.storeController.state
              .dispatchProjectDefaults}
            .sessionOverrides=${this.storeController.state.dispatchSession
              .overrides}
            @close-settings=${this.handleCloseSettings}
            @project-defaults-change=${this.handleProjectDefaultsChange}
            @reset-session-overrides=${this.resetSessionOverrides}
          ></ds-settings-overlay>
        </div>
      `;
    }

    if (mode === 'mini') {
      return html`
        <div class="mini-content">
          <div class="mini-header">
            <div class="mini-brand">
              <img
                class="mini-logo"
                src=${getThemeIconAsset(theme)}
                alt=""
                width="22"
                height="22"
                aria-hidden="true"
              />
              <span class="mini-title">PinFlow</span>
              <span
                class="mini-status ${relayConnected ? 'active' : 'inactive'}"
                title=${relayConnected
                  ? 'PinFlow ist mit dem lokalen Relay verbunden'
                  : 'PinFlow wartet auf die lokale Relay-Verbindung'}
                aria-label=${`PinFlow ${statusLabel}`}
              >
                ${statusLabel}
              </span>
            </div>
            <div class="mini-actions">
              <button
                class="mini-btn"
                @click=${this.handleExpandSidebar}
                title="Arbeitsbereich oeffnen"
                aria-label="Arbeitsbereich oeffnen"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                class="mini-btn"
                @click=${this.handleCloseSidebar}
                title="Schliessen"
                aria-label="Seitenleiste schliessen"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 6 6 18M6 6l12 12"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="mini-composer">
            <ds-annotation-input></ds-annotation-input>
          </div>
        </div>
      `;
    }

    return html`
      <div class="sidebar-content">
        <ds-header
          ?scrolled=${this.isScrolled}
          @open-settings=${this.handleOpenSettings}
          @minimize-sidebar=${this.handleMinimizeSidebar}
        ></ds-header>

        <!-- Scrollable annotations area -->
        <div class="main-content" @scroll=${this.handleScroll}>
          <div class="workspace-top">
            <details class="context-drawer" ?open=${hasSelection}>
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

        ${this.renderActiveRunPanel()}

        <div class="composer-dock">
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
