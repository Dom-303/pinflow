/**
 * DsTab - Collapsed activation tab.
 *
 * Uses the compact PinFlow icon asset as a draggable collapsed launcher.
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles } from '../styles/theme.js';
import { logoSvg } from './logo/index.js';

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
        right: 0;
        /* top is set dynamically via inline style */
        transform: translateY(-50%);
        z-index: 3;
      }

      .tab {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 54px;
        height: 56px;
        padding: 0;
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        cursor: pointer;
        touch-action: none; /* prevent scroll while dragging */
        transition:
          transform 180ms ease,
          opacity 180ms ease;
      }

      :host(.dragging) .tab {
        cursor: grabbing;
      }

      .tab:focus-visible {
        outline: 2px solid var(--ds-brand-primary);
        outline-offset: 3px;
        border-radius: 14px 0 0 14px;
      }

      .tab:hover {
        transform: translateX(-3px);
      }

      .tab-mark {
        display: grid;
        place-items: center;
        width: 54px;
        height: 54px;
        border-radius: 0;
        background: transparent;
        transform: scaleX(-1);
        transform-origin: center;
        transition:
          transform 180ms ease,
          filter 180ms ease;
      }

      .tab-mark svg {
        display: block;
        width: 52px;
        height: 52px;
        filter:
          drop-shadow(0 10px 18px rgba(66, 39, 16, 0.24))
          drop-shadow(0 1px 0 rgba(255, 226, 166, 0.26));
        transition: filter 180ms ease;
      }

      .tab:hover .tab-mark {
        transform: scaleX(-1) scale(1.035);
      }

      .tab:hover .tab-mark svg {
        filter:
          drop-shadow(0 14px 24px rgba(66, 39, 16, 0.28))
          drop-shadow(0 1px 0 rgba(255, 229, 170, 0.32));
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
    const { tabOffsetY: offsetY } = this.storeController.state;

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
        <span class="tab-mark" aria-hidden="true">
          ${logoSvg({
            size: 52,
            variant: 'full',
            color: 'var(--ds-brand-primary)',
            dimensional: true,
          })}
        </span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tab': DsTab;
  }
}
