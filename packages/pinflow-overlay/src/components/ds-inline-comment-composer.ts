/**
 * DsInlineCommentComposer - small cursor-adjacent composer for picker comments.
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles } from '../styles/theme.js';

@customElement('ds-inline-comment-composer')
export class DsInlineCommentComposer extends LitElement {
  private storeController = new StoreController(this);

  @state()
  private value = '';

  @state()
  private isSubmitting = false;

  @state()
  private submitState: 'idle' | 'error' = 'idle';

  static override styles = [
    themeStyles,
    css`
      :host {
        position: fixed;
        inset: 0;
        z-index: calc(var(--ds-z-picker) + 2);
        pointer-events: none;
      }

      .inline-composer {
        position: fixed;
        width: min(328px, calc(100vw - 32px));
        min-height: 184px;
        display: grid;
        grid-template-rows: auto minmax(86px, 1fr) auto;
        gap: 10px;
        padding: 13px;
        border: 1px solid var(--ds-panel-border-strong);
        border-radius: 18px;
        background: var(--ds-card-surface-strong);
        color: var(--ds-text-primary);
        box-shadow:
          var(--ds-shadow-lg),
          0 0 0 1px color-mix(in srgb, var(--ds-brand-primary) 18%, transparent),
          var(--ds-highlight-glow);
        backdrop-filter: var(--ds-shell-blur);
        pointer-events: auto;
        animation: inline-enter 140ms ease-out both;
      }

      .inline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .inline-copy {
        display: block;
        min-width: 0;
      }

      .inline-title {
        color: var(--ds-text-primary);
        font-size: 13px;
        font-weight: var(--ds-font-weight-semibold);
        line-height: 1.2;
      }

      .close-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: 1px solid var(--ds-pill-border);
        border-radius: 11px;
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          color var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .close-btn:hover {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
        transform: translateY(-1px);
      }

      .close-btn svg {
        width: 15px;
        height: 15px;
      }

      textarea {
        width: 100%;
        min-height: 86px;
        padding: 10px 11px;
        border: 1px solid var(--ds-panel-border);
        border-radius: 13px;
        background: var(--ds-panel-surface-muted);
        color: var(--ds-text-primary);
        font: inherit;
        font-size: 13px;
        line-height: 1.45;
        resize: none;
        outline: none;
        box-sizing: border-box;
      }

      textarea:focus {
        border-color: color-mix(
          in srgb,
          var(--ds-brand-primary) 48%,
          var(--ds-panel-border)
        );
        box-shadow: 0 0 0 3px
          color-mix(in srgb, var(--ds-brand-primary) 12%, transparent);
      }

      textarea::placeholder {
        color: var(--ds-text-tertiary);
      }

      .inline-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .inline-hint {
        color: var(--ds-text-tertiary);
        font-size: 10.5px;
        line-height: 1.35;
      }

      .submit-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-width: 76px;
        height: 34px;
        padding: 0 13px;
        border: 0;
        border-radius: 999px;
        background: var(--ds-brand-primary);
        color: var(--ds-bg-tertiary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          opacity var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .submit-btn:hover:not(:disabled) {
        background: var(--ds-brand-secondary);
        transform: translateY(-1px);
      }

      .submit-btn:disabled {
        opacity: 0.42;
        cursor: not-allowed;
        transform: none;
      }

      .submit-btn svg {
        width: 14px;
        height: 14px;
      }

      .error {
        color: var(--ds-danger);
        font-size: 10.5px;
      }

      :host([theme='dark']) .inline-composer {
        background: #0d0b09;
        border-color: rgba(72, 53, 37, 0.88);
      }

      :host([theme='dark']) textarea {
        background: #080706;
        border-color: rgba(42, 33, 26, 0.86);
      }

      @keyframes inline-enter {
        from {
          opacity: 0;
          transform: translateY(6px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ];

  protected override firstUpdated(): void {
    this.shadowRoot?.querySelector('textarea')?.focus();
  }

  private getPosition() {
    const width = Math.min(328, Math.max(0, window.innerWidth - 32));
    const height = 200;
    const draft = this.storeController.state.inlineCommentDraft;
    const x = draft?.position.x ?? 16;
    const y = draft?.position.y ?? 16;
    const maxLeft = Math.max(16, window.innerWidth - width - 16);
    const maxTop = Math.max(16, window.innerHeight - height - 16);

    return {
      left: Math.min(Math.max(16, x + 12), maxLeft),
      top: Math.min(Math.max(16, y + 12), maxTop),
    };
  }

  private getModeLabel(): string {
    const pickerMode =
      this.storeController.state.inlineCommentDraft?.pickerMode;
    if (pickerMode === 'region') {
      return 'Bereich kommentieren';
    }
    if (pickerMode === 'multi') {
      return 'Auswahl kommentieren';
    }
    return 'Element kommentieren';
  }

  private handleInput(event: Event): void {
    this.value = (event.target as HTMLTextAreaElement).value;
    this.submitState = 'idle';
  }

  private handleKeyDown(event: KeyboardEvent): void {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      this.storeController.store.cancelInlineComment();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.handleSubmit();
    }
  }

  private stopEvent(event: Event): void {
    event.stopPropagation();
  }

  private async handleSubmit(): Promise<void> {
    const message = this.value.trim();
    if (
      !message ||
      this.isSubmitting ||
      !this.storeController.state.relayConnected
    ) {
      return;
    }

    this.isSubmitting = true;
    try {
      await this.storeController.store.submitAnnotation(message);
      this.value = '';
      this.submitState = 'idle';
    } catch (error) {
      this.submitState = 'error';
      console.error('[pinflow] Failed to submit inline annotation:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  override render() {
    const { inlineCommentDraft, relayConnected, theme } =
      this.storeController.state;

    this.setAttribute('theme', theme);

    if (!inlineCommentDraft) {
      return null;
    }

    const position = this.getPosition();
    const canSubmit =
      this.value.trim().length > 0 && relayConnected && !this.isSubmitting;

    return html`
      <section
        class="inline-composer"
        style=${`left:${position.left}px;top:${position.top}px;`}
        @click=${this.stopEvent}
        @pointerdown=${this.stopEvent}
        aria-label="Inline-Kommentar"
      >
        <div class="inline-header">
          <span class="inline-copy">
            <span class="inline-title">${this.getModeLabel()}</span>
          </span>
          <button
            class="close-btn"
            type="button"
            @click=${() => this.storeController.store.cancelInlineComment()}
            aria-label="Inline-Kommentar schliessen"
            title="Inline-Kommentar schliessen"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <textarea
          .value=${this.value}
          ?disabled=${!relayConnected || this.isSubmitting}
          placeholder=${relayConnected
            ? 'Was soll hier geaendert werden?'
            : 'Relay verbinden, dann senden.'}
          @input=${this.handleInput}
          @keydown=${this.handleKeyDown}
        ></textarea>

        <div class="inline-footer">
          <span class=${this.submitState === 'error' ? 'error' : 'inline-hint'}>
            ${this.submitState === 'error'
              ? 'Senden fehlgeschlagen.'
              : 'Enter sendet · Shift+Enter neue Zeile'}
          </span>
          <button
            class="submit-btn"
            type="button"
            ?disabled=${!canSubmit}
            @click=${this.handleSubmit}
          >
            <span>Senden</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h13m0 0-5-5m5 5-5 5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-inline-comment-composer': DsInlineCommentComposer;
  }
}
