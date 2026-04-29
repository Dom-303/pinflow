/**
 * DsPickerOverlay - Full-page overlay for element capture mode
 *
 * Covers the entire viewport during capture mode, intercepts pointer
 * events, and coordinates element highlighting and selection.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import type { PickerMode } from '../core/types.js';
import type { BoundingRect } from '@pinflow/core';
import { themeStyles } from '../styles/theme.js';

// Import child components
import './ds-highlight-box.js';
import './ds-tooltip.js';
import './ds-inline-comment-composer.js';

/**
 * Picker overlay component for element capture
 *
 * @element ds-picker-overlay
 */
@customElement('ds-picker-overlay')
export class DsPickerOverlay extends LitElement {
  private storeController = new StoreController(this);

  @state()
  private highlightRect: DOMRect | null = null;

  @state()
  private tooltipPosition: { x: number; y: number } | null = null;

  @state()
  private showIntroNotice = true;

  @state()
  private dragRect: BoundingRect | null = null;

  @state()
  private multiElements: HTMLElement[] = [];

  private dragStart: { x: number; y: number } | null = null;

  private lastPointerPosition: { x: number; y: number } | null = null;

  private resizeHandle:
    | 'nw'
    | 'n'
    | 'ne'
    | 'e'
    | 'se'
    | 's'
    | 'sw'
    | 'w'
    | null = null;

  private resizeStart: {
    x: number;
    y: number;
    rect: BoundingRect;
  } | null = null;

  private moveStart: {
    x: number;
    y: number;
    rect: BoundingRect;
  } | null = null;

  private introTimer: number | null = null;

  static override styles = [
    themeStyles,
    css`
      :host {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: var(--ds-z-picker);
        cursor: crosshair;
      }

      .overlay {
        width: 100%;
        height: 100%;
        background:
          radial-gradient(
            circle at top,
            var(--ds-picker-spotlight) 0%,
            rgba(247, 222, 192, 0) 42%
          ),
          var(--ds-picker-scrim);
      }

      .overlay.region {
        background: transparent;
      }

      .picker-toast {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: calc(100vw - 32px);
        padding: 8px 12px;
        background: var(--ds-tooltip-surface);
        border: 1px solid var(--ds-panel-border);
        border-radius: 999px;
        font-size: var(--ds-font-size-xs);
        line-height: 1;
        color: var(--ds-text-primary);
        box-shadow: var(--ds-panel-shadow);
        backdrop-filter: var(--ds-shell-blur);
        font-weight: var(--ds-font-weight-medium);
        pointer-events: none;
        animation:
          toast-enter 180ms ease-out both,
          toast-leave 260ms ease-in 1.55s forwards;
      }

      .picker-toast.persistent {
        pointer-events: auto;
        animation: toast-enter 180ms ease-out both;
      }

      .picker-toast kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 26px;
        height: 18px;
        padding: 0 6px;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: 7px;
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-xs);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
      }

      .region-box {
        position: fixed;
        border: 1.5px solid var(--ds-brand-primary);
        background: transparent;
        box-shadow:
          0 0 0 9999px var(--ds-picker-scrim),
          var(--ds-highlight-glow);
        pointer-events: auto;
        cursor: move;
      }

      .region-box::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: 3px;
        outline: 1px solid
          color-mix(in srgb, var(--ds-brand-primary) 58%, transparent);
        pointer-events: none;
      }

      .region-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--ds-brand-primary);
        border: 1px solid var(--ds-bg-primary);
        box-shadow: var(--ds-shadow-sm);
      }

      .region-handle[data-handle='nw'] {
        top: -5px;
        left: -5px;
        cursor: nwse-resize;
      }

      .region-handle[data-handle='n'] {
        top: -5px;
        left: calc(50% - 5px);
        cursor: ns-resize;
      }

      .region-handle[data-handle='ne'] {
        top: -5px;
        right: -5px;
        cursor: nesw-resize;
      }

      .region-handle[data-handle='e'] {
        top: calc(50% - 5px);
        right: -5px;
        cursor: ew-resize;
      }

      .region-handle[data-handle='se'] {
        right: -5px;
        bottom: -5px;
        cursor: nwse-resize;
      }

      .region-handle[data-handle='s'] {
        bottom: -5px;
        left: calc(50% - 5px);
        cursor: ns-resize;
      }

      .region-handle[data-handle='sw'] {
        bottom: -5px;
        left: -5px;
        cursor: nesw-resize;
      }

      .region-handle[data-handle='w'] {
        top: calc(50% - 5px);
        left: -5px;
        cursor: ew-resize;
      }

      .multi-count {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        padding: 7px 11px;
        border-radius: 999px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-tooltip-surface);
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-medium);
        box-shadow: var(--ds-panel-shadow);
        pointer-events: none;
      }

      .picker-action {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid var(--ds-panel-border-strong);
        background: var(--ds-brand-primary);
        color: var(--ds-bg-tertiary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        cursor: pointer;
      }

      .picker-action:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      @keyframes toast-enter {
        from {
          opacity: 0;
          transform: translate(-50%, -6px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }

      @keyframes toast-leave {
        to {
          opacity: 0;
          transform: translate(-50%, -6px);
        }
      }
    `,
  ];

  override connectedCallback() {
    super.connectedCallback();
    this.showIntroNotice = true;
    if (this.storeController.state.pickerMode === 'element') {
      this.introTimer = window.setTimeout(() => {
        this.showIntroNotice = false;
        this.introTimer = null;
      }, 1800);
    }
    window.addEventListener('pointermove', this.handlePointerMove, {
      capture: true,
    });
    window.addEventListener('mousemove', this.handlePointerMove, {
      capture: true,
    });
    window.addEventListener('click', this.handleClick, {
      capture: true,
    });
    window.addEventListener('pointerdown', this.handlePointerDown, {
      capture: true,
    });
    window.addEventListener('pointerup', this.handlePointerUp, {
      capture: true,
    });
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.introTimer) {
      window.clearTimeout(this.introTimer);
      this.introTimer = null;
    }
    window.removeEventListener('pointermove', this.handlePointerMove, {
      capture: true,
    });
    window.removeEventListener('mousemove', this.handlePointerMove, {
      capture: true,
    });
    window.removeEventListener('click', this.handleClick, {
      capture: true,
    });
    window.removeEventListener('pointerdown', this.handlePointerDown, {
      capture: true,
    });
    window.removeEventListener('pointerup', this.handlePointerUp, {
      capture: true,
    });
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Temporarily hide PinFlow chrome to get the underlying page element.
   */
  private getElementUnderPoint(x: number, y: number): HTMLElement | null {
    const hiddenHosts = Array.from(
      document.querySelectorAll<HTMLElement>('ds-overlay, ds-picker-overlay'),
    );
    if (!hiddenHosts.includes(this)) {
      hiddenHosts.push(this);
    }
    const originalChromeStyles = hiddenHosts.map(
      (host) =>
        [host, host.style.pointerEvents, host.style.visibility] as const,
    );

    for (const host of hiddenHosts) {
      host.style.pointerEvents = 'none';
      host.style.visibility = 'hidden';
    }

    try {
      return document.elementFromPoint(x, y) as HTMLElement | null;
    } finally {
      for (const [host, pointerEvents, visibility] of originalChromeStyles) {
        host.style.pointerEvents = pointerEvents;
        host.style.visibility = visibility;
      }
    }
  }

  private resolveSelectableElement(
    element: HTMLElement | null,
  ): HTMLElement | null {
    if (!element) return null;
    if (element.closest('ds-overlay, ds-picker-overlay, ds-sidebar, ds-tab')) {
      return null;
    }

    const bridgedElement = element.closest('[data-ds]') as HTMLElement | null;

    if (bridgedElement) {
      return bridgedElement;
    }

    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      const rect = current.getBoundingClientRect();
      const tagName = current.tagName.toLowerCase();

      if (
        tagName !== 'html' &&
        tagName !== 'body' &&
        rect.width >= 18 &&
        rect.height >= 18
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  private handlePointerMove = (event: PointerEvent | MouseEvent) => {
    this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    const { pickerMode, inlineCommentDraft } = this.storeController.state;

    if (inlineCommentDraft) {
      this.storeController.store.setHoveredElement(null);
      this.highlightRect = null;
      this.tooltipPosition = null;
      return;
    }

    if (pickerMode === 'region') {
      this.storeController.store.setHoveredElement(null);
      this.highlightRect = null;
      this.tooltipPosition = null;

      if (this.resizeHandle && this.resizeStart) {
        this.dragRect = this.resizeRect(
          this.resizeStart.rect,
          this.resizeHandle,
          event.clientX - this.resizeStart.x,
          event.clientY - this.resizeStart.y,
        );
        return;
      }

      if (this.moveStart) {
        this.dragRect = this.translateRect(
          this.moveStart.rect,
          event.clientX - this.moveStart.x,
          event.clientY - this.moveStart.y,
        );
        return;
      }

      if (this.dragStart) {
        this.dragRect = this.buildRectFromPoints(
          this.dragStart.x,
          this.dragStart.y,
          event.clientX,
          event.clientY,
        );
      }
      return;
    }

    const rawElement = this.getElementUnderPoint(event.clientX, event.clientY);
    const element = this.resolveSelectableElement(rawElement);

    if (element) {
      this.storeController.store.setHoveredElement(element);
      this.highlightRect = element.getBoundingClientRect();
      this.tooltipPosition = {
        x: event.clientX,
        y: event.clientY,
      };
    } else {
      this.storeController.store.setHoveredElement(null);
      this.highlightRect = null;
      this.tooltipPosition = null;
    }
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (this.storeController.state.pickerMode !== 'region') return;

    const handle = this.getRegionHandle(event);
    if (handle && this.dragRect) {
      event.preventDefault();
      event.stopPropagation();
      this.resizeHandle = handle;
      this.resizeStart = {
        x: event.clientX,
        y: event.clientY,
        rect: this.dragRect,
      };
      return;
    }

    if (this.isRegionBoxEvent(event) && this.dragRect) {
      event.preventDefault();
      event.stopPropagation();
      this.moveStart = {
        x: event.clientX,
        y: event.clientY,
        rect: this.dragRect,
      };
      return;
    }

    if (this.isPickerChromeEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragRect = this.buildRectFromPoints(
      event.clientX,
      event.clientY,
      event.clientX,
      event.clientY,
    );
    this.highlightRect = null;
    this.tooltipPosition = null;
  };

  private handlePointerUp = async (event: PointerEvent) => {
    if (this.storeController.state.pickerMode !== 'region' || !this.dragStart) {
      if (this.resizeHandle) {
        event.preventDefault();
        event.stopPropagation();
        this.resizeHandle = null;
        this.resizeStart = null;
      }
      if (this.moveStart) {
        event.preventDefault();
        event.stopPropagation();
        this.moveStart = null;
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = this.buildRectFromPoints(
      this.dragStart.x,
      this.dragStart.y,
      event.clientX,
      event.clientY,
    );
    this.dragStart = null;

    if (rect.width < 8 || rect.height < 8) {
      this.dragRect = null;
      return;
    }

    this.dragRect = rect;
  };

  private handleClick = async (event: PointerEvent | MouseEvent) => {
    if (this.isPickerChromeEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.lastPointerPosition = { x: event.clientX, y: event.clientY };

    const { pickerMode, commentEntryMode, inlineCommentDraft } =
      this.storeController.state;
    if (inlineCommentDraft) {
      return;
    }

    if (pickerMode === 'region') {
      return;
    }

    const rawElement = this.getElementUnderPoint(event.clientX, event.clientY);
    const element = this.resolveSelectableElement(rawElement);

    if (pickerMode === 'multi') {
      if (element) {
        this.toggleMultiElement(element);
      }
      return;
    }

    if (element) {
      if (commentEntryMode === 'inline') {
        await this.storeController.store.selectElementForInlineComment(
          element,
          {
            x: event.clientX,
            y: event.clientY,
          },
        );
        return;
      }

      await this.storeController.store.selectElement(element);
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.storeController.store.exitCaptureMode();
      return;
    }

    if (
      event.key === 'Enter' &&
      this.storeController.state.pickerMode === 'multi'
    ) {
      event.preventDefault();
      this.confirmMultiSelection();
      return;
    }

    if (
      event.key === 'Enter' &&
      this.storeController.state.pickerMode === 'region'
    ) {
      event.preventDefault();
      this.confirmRegionSelection();
    }
  };

  private confirmMultiSelection = () => {
    if (this.multiElements.length === 0) return;
    if (this.storeController.state.commentEntryMode === 'inline') {
      this.storeController.store.selectMultipleElementsForInlineComment(
        this.multiElements,
        this.getInlineCommentPosition(),
      );
      return;
    }
    void this.storeController.store.selectMultipleElements(this.multiElements);
  };

  private confirmRegionSelection = () => {
    if (!this.dragRect || this.dragRect.width < 8 || this.dragRect.height < 8) {
      return;
    }
    const elements = this.collectElementsInRect(this.dragRect);
    if (this.storeController.state.commentEntryMode === 'inline') {
      this.storeController.store.selectRegionForInlineComment(
        this.dragRect,
        elements,
        this.getInlineCommentPosition(this.dragRect),
      );
      return;
    }
    void this.storeController.store.selectRegion(this.dragRect, elements);
  };

  private getInlineCommentPosition(rect?: BoundingRect): {
    x: number;
    y: number;
  } {
    if (this.lastPointerPosition) {
      return this.lastPointerPosition;
    }

    if (rect) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    const firstElement = this.multiElements[0];
    if (firstElement) {
      const elementRect = firstElement.getBoundingClientRect();
      return {
        x: elementRect.left + elementRect.width / 2,
        y: elementRect.top + elementRect.height / 2,
      };
    }

    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }

  private toggleMultiElement(element: HTMLElement): void {
    if (this.multiElements.includes(element)) {
      this.multiElements = this.multiElements.filter(
        (item) => item !== element,
      );
      return;
    }

    this.multiElements = [...this.multiElements, element].slice(0, 30);
  }

  private buildRectFromPoints(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): BoundingRect {
    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      top,
      right,
      bottom,
      left,
    };
  }

  private collectElementsInRect(rect: BoundingRect): HTMLElement[] {
    const allElements = Array.from(
      document.body.querySelectorAll<HTMLElement>('*'),
    );
    const candidates = allElements.filter((element) => {
      if (
        element.closest('ds-overlay, ds-picker-overlay, ds-sidebar, ds-tab')
      ) {
        return false;
      }
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'html' || tagName === 'body') {
        return false;
      }
      const elementRect = element.getBoundingClientRect();
      return (
        elementRect.width >= 8 &&
        elementRect.height >= 8 &&
        elementRect.right >= rect.left &&
        elementRect.left <= rect.right &&
        elementRect.bottom >= rect.top &&
        elementRect.top <= rect.bottom
      );
    });

    const bridged = candidates.filter((element) =>
      element.hasAttribute('data-ds'),
    );
    return (bridged.length > 0 ? bridged : candidates).slice(0, 30);
  }

  private isPickerChromeEvent(event: Event): boolean {
    return event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.classList.contains('picker-action') ||
            target.classList.contains('picker-toast') ||
            target.classList.contains('region-box') ||
            target.classList.contains('region-handle') ||
            target.tagName.toLowerCase() === 'ds-inline-comment-composer'),
      );
  }

  private isRegionBoxEvent(event: Event): boolean {
    return event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          target.classList.contains('region-box'),
      );
  }

  private getRegionHandle(
    event: Event,
  ): 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null {
    const target = event.composedPath()[0];
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    const handle = target.dataset.handle;
    return handle === 'nw' ||
      handle === 'n' ||
      handle === 'ne' ||
      handle === 'e' ||
      handle === 'se' ||
      handle === 's' ||
      handle === 'sw' ||
      handle === 'w'
      ? handle
      : null;
  }

  private resizeRect(
    source: BoundingRect,
    handle: NonNullable<DsPickerOverlay['resizeHandle']>,
    deltaX: number,
    deltaY: number,
  ): BoundingRect {
    let { left, top, right, bottom } = source;

    if (handle.includes('w')) {
      left += deltaX;
    }
    if (handle.includes('e')) {
      right += deltaX;
    }
    if (handle.includes('n')) {
      top += deltaY;
    }
    if (handle.includes('s')) {
      bottom += deltaY;
    }

    return this.buildRectFromPoints(left, top, right, bottom);
  }

  private translateRect(
    source: BoundingRect,
    deltaX: number,
    deltaY: number,
  ): BoundingRect {
    const left = source.left + deltaX;
    const top = source.top + deltaY;

    return {
      x: left,
      y: top,
      left,
      top,
      right: left + source.width,
      bottom: top + source.height,
      width: source.width,
      height: source.height,
    };
  }

  private getToastCopy(pickerMode: PickerMode): { key: string; text: string } {
    if (pickerMode === 'region') {
      return { key: 'Enter', text: 'Bereich uebernehmen · ESC beendet' };
    }
    if (pickerMode === 'multi') {
      return { key: 'Enter', text: 'Auswahl uebernehmen · ESC beendet' };
    }
    return { key: 'ESC', text: 'zum Beenden' };
  }

  override render() {
    const { hoveredElement, theme, pickerMode, inlineCommentDraft } =
      this.storeController.state;
    const toast = this.getToastCopy(pickerMode);

    return html`
      <div class="overlay ${pickerMode === 'region' ? 'region' : ''}">
        ${this.showIntroNotice
          ? html`<div
              class="picker-toast ${pickerMode === 'element'
                ? ''
                : 'persistent'}"
              role="status"
            >
              <kbd>${toast.key}</kbd>
              <span>${toast.text}</span>
              ${pickerMode === 'multi'
                ? html`
                    <button
                      class="picker-action"
                      @click=${this.confirmMultiSelection}
                      ?disabled=${this.multiElements.length === 0}
                    >
                      Uebernehmen
                    </button>
                  `
                : null}
              ${pickerMode === 'region'
                ? html`
                    <button
                      class="picker-action"
                      @click=${this.confirmRegionSelection}
                      ?disabled=${!this.dragRect}
                    >
                      Uebernehmen
                    </button>
                  `
                : null}
            </div>`
          : null}
        ${this.dragRect
          ? html`<div
              class="region-box"
              style=${`left:${this.dragRect.left}px;top:${this.dragRect.top}px;width:${this.dragRect.width}px;height:${this.dragRect.height}px;`}
            >
              ${(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map(
                (handle) => html`
                  <span class="region-handle" data-handle=${handle}></span>
                `,
              )}
            </div>`
          : null}
        ${this.highlightRect
          ? html`<ds-highlight-box
              theme=${theme}
              .rect=${this.highlightRect}
            ></ds-highlight-box>`
          : null}
        ${inlineCommentDraft
          ? html`<ds-highlight-box
              theme=${theme}
              .rect=${inlineCommentDraft.anchorRect as DOMRect}
            ></ds-highlight-box>`
          : null}
        ${this.multiElements.map(
          (element) => html`
            <ds-highlight-box
              theme=${theme}
              .rect=${element.getBoundingClientRect()}
            ></ds-highlight-box>
          `,
        )}
        ${pickerMode === 'multi'
          ? html`<div class="multi-count">
              ${this.multiElements.length} gewaehlt · Enter oder Uebernehmen
            </div>`
          : null}
        ${pickerMode === 'region'
          ? html`<div class="multi-count">
              ${this.dragRect
                ? `${Math.round(this.dragRect.width)} x ${Math.round(
                    this.dragRect.height,
                  )} px · Enter oder Uebernehmen`
                : 'Bereich mit gedrueckter Maus aufziehen'}
            </div>`
          : null}
        ${hoveredElement && this.tooltipPosition
          ? html`<ds-tooltip
              theme=${theme}
              .element=${hoveredElement}
              .x=${this.tooltipPosition.x}
              .y=${this.tooltipPosition.y}
            ></ds-tooltip>`
          : null}
        ${inlineCommentDraft
          ? html`<ds-inline-comment-composer></ds-inline-comment-composer>`
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-picker-overlay': DsPickerOverlay;
  }
}
