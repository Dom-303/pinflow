/**
 * DsElementPreview - Selected element details display
 *
 * Shows detailed information about the selected element including:
 * - Tag name and component name
 * - Source location (from manifest)
 * - Props and state (from runtime context via ds-context-panel)
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import shared context panel component
import './ds-context-panel.js';

/**
 * Element preview component
 *
 * @element ds-element-preview
 */
@customElement('ds-element-preview')
export class DsElementPreview extends LitElement {
  private storeController = new StoreController(this);

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
        position: relative;
        background: var(--ds-card-surface);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: calc(var(--ds-radius-lg) + 2px);
        box-shadow: var(--ds-shadow-md);
        overflow: hidden;
      }

      :host::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(
            circle at top left,
            var(--ds-panel-surface-strong) 0%,
            rgba(255, 255, 255, 0) 54%
          ),
          linear-gradient(
            135deg,
            var(--ds-shell-glow) 0%,
            rgba(247, 222, 192, 0) 46%
          );
        pointer-events: none;
      }

      /* Main content area - single unified padding */
      .element-content {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--ds-space-sm);
        padding: 14px;
      }

      /* Header row: primary info + dismiss button */
      .element-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--ds-space-sm);
      }

      /* Primary row: tag + component name inline */
      .element-primary {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }

      .section-label {
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-tertiary);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .identity-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--ds-space-sm);
        min-width: 0;
      }

      .btn-dismiss {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-shell-border-muted);
        border-radius: var(--ds-radius-md);
        box-shadow: var(--ds-shadow-sm);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition:
          color var(--ds-transition-fast),
          background var(--ds-transition-fast),
          border-color var(--ds-transition-fast),
          transform var(--ds-transition-fast);
        flex-shrink: 0;
      }

      .btn-dismiss:hover {
        background: var(--ds-shell-surface-strong);
        border-color: var(--ds-shell-border-soft);
        color: var(--ds-text-primary);
        transform: translateY(-1px);
      }

      .btn-dismiss svg {
        width: 13px;
        height: 13px;
      }

      .tag-name {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: var(--ds-radius-full);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
        font-family: var(--ds-font-mono);
        font-size: 13px;
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
      }

      .component-name {
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-text-secondary);
      }

      .source-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .context-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .context-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 9px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: var(--ds-radius-full);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        box-shadow: var(--ds-shadow-sm);
      }

      .context-pill strong {
        color: var(--ds-text-primary);
        font-weight: var(--ds-font-weight-semibold);
      }

      .source-label {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        white-space: nowrap;
      }

      /* Source location - compact, truncated */
      .source-location {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        max-width: 100%;
        padding: 3px 8px;
        background: var(--ds-panel-surface-muted);
        border: 1px solid var(--ds-shell-border-muted);
        border-radius: var(--ds-radius-full);
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-secondary);
        cursor: default;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .source-location:hover {
        color: var(--ds-text-primary);
        background: var(--ds-panel-surface-strong);
      }

      /* Context panel spacing */
      ds-context-panel {
        margin-top: 2px;
      }

      .empty-state {
        position: relative;
        display: grid;
        gap: 10px;
        padding: 16px;
        background: var(--ds-empty-surface);
        border: 1px solid var(--ds-empty-border);
        border-radius: calc(var(--ds-radius-lg) + 2px);
        box-shadow: var(--ds-shadow-md);
        color: var(--ds-text-secondary);
      }

      .empty-icon {
        width: 34px;
        height: 34px;
        color: var(--ds-text-tertiary);
        opacity: 0.72;
      }

      .empty-title {
        margin: 0;
        font-size: var(--ds-font-size-md);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: -0.02em;
      }

      .empty-copy {
        margin: 0;
        font-size: var(--ds-font-size-sm);
        line-height: 1.55;
      }
    `,
  ];

  private getComponentName(element: HTMLElement): string | null {
    // Try to get component name from React Fiber
    const fiberKey = Object.keys(element).find(
      (key) =>
        key.startsWith('__reactFiber$') ||
        key.startsWith('__reactInternalInstance$'),
    );

    if (fiberKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fiber = (element as any)[fiberKey];
      if (fiber) {
        let current = fiber;
        while (current) {
          if (typeof current.type === 'function') {
            return current.type.displayName || current.type.name || null;
          }
          current = current.return;
        }
      }
    }

    // Try to get component name from Vue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vueInstance = (element as any).__vueParentComponent;
    if (vueInstance?.type?.name) {
      return vueInstance.type.name;
    }

    return null;
  }

  /**
   * Clear the current element selection
   */
  private handleClearSelection() {
    this.storeController.store.clearSelection();
  }

  /**
   * Format source path for display - show just filename:line (with extension)
   * Returns { display: string, full: string }
   */
  private formatSourcePath(fullPath: string): {
    display: string;
    full: string;
  } {
    // Extract just filename and line number for compact display
    // e.g., "/path/to/BasicElements.vue:15" -> "BasicElements.vue:15"
    const parts = fullPath.split('/');
    const fileWithLine = parts[parts.length - 1];

    return {
      display: fileWithLine,
      full: fullPath,
    };
  }

  override render() {
    const { selectedElement, runtimeContext, manifestEntry } =
      this.storeController.state;

    if (!selectedElement) {
      return html`
        <div class="empty-state">
          <svg
            class="empty-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8.5 5.75h7a1.75 1.75 0 0 1 1.75 1.75v7"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="m6 18 4.2-4.2a1.5 1.5 0 0 1 2.12 0L14 15.5"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="m12.5 12.5 1.18-1.18a1.5 1.5 0 0 1 2.12 0L18 13.5"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M6.25 4.5h11.5A1.75 1.75 0 0 1 19.5 6.25v11.5a1.75 1.75 0 0 1-1.75 1.75H6.25A1.75 1.75 0 0 1 4.5 17.75V6.25A1.75 1.75 0 0 1 6.25 4.5Z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <circle cx="9" cy="9" r="1.25" fill="currentColor" />
          </svg>
          <p class="empty-title">Noch kein Element ausgewaehlt</p>
          <p class="empty-copy">
            Markiere rechts ein Element, um Quelle, Eigenschaften und Status zu
            sehen.
          </p>
        </div>
      `;
    }

    const tagName = selectedElement.tagName.toLowerCase();
    const componentName = this.getComponentName(selectedElement);

    const props = (runtimeContext?.componentProps ?? {}) as Record<
      string,
      unknown
    >;
    const state = (runtimeContext?.componentState ?? {}) as Record<
      string,
      unknown
    >;
    const propsCount = Object.keys(props).length;
    const stateCount = Object.keys(state).length;

    // Format source location - compact display with full path on hover
    const fullSourcePath = manifestEntry
      ? `${manifestEntry.file}:${manifestEntry.start.line}`
      : null;
    const sourcePath = fullSourcePath
      ? this.formatSourcePath(fullSourcePath)
      : null;

    return html`
      <div class="element-content">
        <div class="element-header">
          <div class="element-primary">
            <span class="section-label">Auswahl</span>
            <div class="identity-row">
              <span class="tag-name">&lt;${tagName}&gt;</span>
              ${componentName
                ? html`<span class="component-name">${componentName}</span>`
                : null}
            </div>
            ${sourcePath
              ? html`
                  <div class="source-row">
                    <span class="source-label">Quelle</span>
                    <span class="source-location" title="${sourcePath.full}"
                      >${sourcePath.display}</span
                    >
                  </div>
                `
              : null}
            ${(propsCount || stateCount)
              ? html`
                  <div class="context-summary">
                    ${propsCount
                      ? html`<span class="context-pill"
                          ><strong>${propsCount}</strong> Eigenschaften</span
                        >`
                      : null}
                    ${stateCount
                      ? html`<span class="context-pill"
                          ><strong>${stateCount}</strong>
                          ${stateCount === 1
                            ? 'Statusfeld'
                            : 'Statusfelder'}</span
                        >`
                      : null}
                  </div>
                `
              : null}
          </div>
          <button
            class="btn-dismiss"
            @click=${this.handleClearSelection}
            title="Auswahl aufheben"
            aria-label="Elementauswahl aufheben"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ds-context-panel .props=${props} .state=${state}></ds-context-panel>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-element-preview': DsElementPreview;
  }
}
