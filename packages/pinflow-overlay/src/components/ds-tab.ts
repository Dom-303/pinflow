/**
 * DsTab - Collapsed activation tab.
 *
 * Uses the compact PinFlow icon asset as a draggable collapsed launcher.
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles } from '../styles/theme.js';
import { getThemeIconAsset } from './logo/index.js';

/** Minimum px of movement before we treat it as a drag instead of a click. */
const DRAG_THRESHOLD = 4;

/**
 * Collapsed tab component
 *
 * @element ds-tab
 */
@customElement('ds-tab')
export class DsTab extends LitElement {
  private storeController = new StoreController(this);

  /* ── drag state (not reactive — no re-render needed while dragging) ── */
  private dragging = false;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private didDrag = false;

  static override styles = [
    themeStyles,
    css`
      :host {
        display: block;
        position: absolute;
        right: -18px;
        /* top is set dynamically via inline style */
        transform: translateY(-50%);
        z-index: 3;
      }

      .tab {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 72px;
        height: 72px;
        padding: 10px;
        background: var(--ds-shell-surface-strong);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 22px;
        box-shadow: var(--ds-panel-shadow);
        cursor: pointer;
        touch-action: none; /* prevent scroll while dragging */
        transition:
          transform var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast),
          background var(--ds-transition-fast);
      }

      :host(.dragging) .tab {
        cursor: grabbing;
      }

      .tab:focus-visible {
        outline: 2px solid var(--ds-brand-primary);
        outline-offset: 2px;
        border-radius: var(--ds-radius-md);
      }

      .tab:hover {
        transform: translateX(-6px);
        box-shadow: var(--ds-shadow-xl);
      }

      .tab-icon {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
        border-radius: 16px;
        filter: drop-shadow(var(--ds-tab-shadow));
      }
    `,
  ];

  /* ── lifecycle ── */

  override connectedCallback(): void {
    super.connectedCallback();
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupDrag();
  }

  /* ── pointer handlers ── */

  private boundOnPointerMove!: (e: PointerEvent) => void;
  private boundOnPointerUp!: (e: PointerEvent) => void;

  private onPointerDown(e: PointerEvent): void {
    // Only primary button
    if (e.button !== 0) return;

    this.dragging = true;
    this.didDrag = false;
    this.dragStartY = e.clientY;
    this.dragStartOffset = this.storeController.state.tabOffsetY;

    this.classList.add('dragging');

    // Capture pointer so we get move/up even outside the element
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);

    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;

    const deltaY = e.clientY - this.dragStartY;

    if (!this.didDrag && Math.abs(deltaY) < DRAG_THRESHOLD) return;
    this.didDrag = true;

    // Convert pixel delta to percentage of viewport height
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newOffset = this.dragStartOffset + deltaPercent;

    this.storeController.store.setTabOffsetY(newOffset);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onPointerUp(_e: PointerEvent): void {
    this.cleanupDrag();

    if (!this.didDrag) {
      // It was a click, not a drag — open the sidebar
      this.storeController.store.setMode('expanded');
    }

    this.dragging = false;
    this.didDrag = false;
  }

  private cleanupDrag(): void {
    this.classList.remove('dragging');
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
  }

  /* ── render ── */

  override render() {
    const { tabOffsetY: offsetY, theme } = this.storeController.state;

    return html`
      <style>
        :host {
          top: ${offsetY}%;
        }
      </style>
      <button
        class="tab"
        @pointerdown=${this.onPointerDown}
        title="PinFlow-Arbeitsbereich oeffnen (Strg+Umschalt+D)"
        aria-label="PinFlow-Arbeitsbereich oeffnen"
      >
        <img
          class="tab-icon"
          src=${getThemeIconAsset(theme)}
          alt="PinFlow"
          aria-hidden="true"
        />
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tab': DsTab;
  }
}
