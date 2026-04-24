/**
 * DsPickerOverlay - Full-page overlay for element capture mode
 *
 * Covers the entire viewport during capture mode, intercepts pointer
 * events, and coordinates element highlighting and selection.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles } from '../styles/theme.js';

// Import child components
import './ds-highlight-box.js';
import './ds-tooltip.js';

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
        animation: toast-enter 180ms ease-out both, toast-leave 260ms ease-in 1.55s forwards;
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
    this.introTimer = window.setTimeout(() => {
      this.showIntroNotice = false;
      this.introTimer = null;
    }, 1800);
    window.addEventListener('pointermove', this.handlePointerMove, {
      capture: true,
    });
    window.addEventListener('mousemove', this.handlePointerMove, {
      capture: true,
    });
    window.addEventListener('click', this.handleClick, {
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
    const originalChromeStyles = hiddenHosts.map((host) => [
      host,
      host.style.pointerEvents,
      host.style.visibility,
    ] as const);

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

  private resolveSelectableElement(element: HTMLElement | null): HTMLElement | null {
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

  private handleClick = async (event: PointerEvent | MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const rawElement = this.getElementUnderPoint(event.clientX, event.clientY);
    const element = this.resolveSelectableElement(rawElement);

    if (element) {
      await this.storeController.store.selectElement(element);
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.storeController.store.exitCaptureMode();
    }
  };

  override render() {
    const { hoveredElement, theme } = this.storeController.state;

    return html`
      <div class="overlay">
        ${this.showIntroNotice
          ? html`<div class="picker-toast" role="status">
              <kbd>ESC</kbd>
              <span>zum Beenden</span>
            </div>`
          : null}

        ${this.highlightRect
          ? html`<ds-highlight-box
              theme=${theme}
              .rect=${this.highlightRect}
            ></ds-highlight-box>`
          : null}
        ${hoveredElement && this.tooltipPosition
          ? html`<ds-tooltip
              theme=${theme}
              .element=${hoveredElement}
              .x=${this.tooltipPosition.x}
              .y=${this.tooltipPosition.y}
            ></ds-tooltip>`
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
