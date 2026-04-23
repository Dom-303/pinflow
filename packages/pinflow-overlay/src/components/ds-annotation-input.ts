/**
 * DsAnnotationInput - Chat-style annotation input
 *
 * A text input for creating annotations about the selected element.
 * Styled like Claude's browser chat input with action bar below.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import type { DispatchChannel } from '../core/dispatch-config.js';

/**
 * Annotation input component
 *
 * @element ds-annotation-input
 */
@customElement('ds-annotation-input')
export class DsAnnotationInput extends LitElement {
  private storeController = new StoreController(this);

  @state()
  private inputValue = '';

  @state()
  private isSubmitting = false;

  @state()
  private submitState: 'idle' | 'success' | 'error' = 'idle';

  @state()
  private channelMenuOpen = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      .input-wrapper {
        background: var(--ds-shell-surface-strong);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: var(--ds-shadow-md);
        backdrop-filter: var(--ds-shell-blur);
        transition:
          border-color var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .input-wrapper:focus-within {
        border-color: var(--ds-brand-primary);
        box-shadow: var(--ds-highlight-glow);
        transform: translateY(-1px);
      }

      .composer-top {
        display: flex;
        justify-content: flex-end;
        padding: 10px 12px 0;
      }

      .composer-state-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: var(--ds-radius-full);
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .composer-state-pill::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ds-warning);
      }

      .composer-state-pill.active::before {
        background: var(--ds-success);
      }

      .textarea-container.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .textarea-container {
        padding: 8px 14px 6px;
      }

      textarea {
        width: 100%;
        min-height: 72px;
        max-height: 180px;
        padding: 0;
        background: transparent;
        border: none;
        font-family: inherit;
        font-size: 15px;
        color: var(--ds-text-primary);
        resize: none;
        outline: none;
        line-height: 1.55;
      }

      textarea::placeholder {
        color: var(--ds-text-tertiary);
      }

      .action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 12px 12px;
      }

      .action-group {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        background: var(--ds-pill-surface);
        border: 1px solid var(--ds-pill-border);
        border-radius: 14px;
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
        flex-shrink: 0;
      }

      .action-btn:hover:not(:disabled) {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
      }

      .action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .action-btn.active {
        color: var(--ds-brand-primary);
        background: var(--ds-highlight);
      }

      .action-btn svg {
        width: 16px;
        height: 16px;
      }

      .menu-wrap {
        position: relative;
      }

      .menu-btn {
        position: relative;
      }

      .menu-btn::after {
        content: '';
        position: absolute;
        right: 7px;
        bottom: 7px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ds-brand-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-brand-primary) 18%, transparent);
      }

      .menu-panel {
        position: absolute;
        left: 0;
        bottom: calc(100% + 10px);
        display: grid;
        gap: 4px;
        min-width: 180px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-lg);
        z-index: 3;
      }

      .menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 10px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
        text-align: left;
      }

      .menu-item:hover {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
      }

      .menu-item.active {
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
      }

      .menu-item-copy {
        display: grid;
        gap: 2px;
      }

      .menu-item-title {
        font-weight: var(--ds-font-weight-medium);
      }

      .menu-item-note {
        color: var(--ds-text-tertiary);
        font-size: 10px;
      }

      .menu-check {
        width: 14px;
        height: 14px;
        color: var(--ds-brand-primary);
        flex-shrink: 0;
      }

      .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        padding: 0;
        background: var(--ds-brand-primary);
        border: none;
        border-radius: 50%;
        box-shadow: var(--ds-shadow-sm);
        color: var(--ds-bg-tertiary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
        flex-shrink: 0;
      }

      .submit-btn:hover:not(:disabled) {
        background: var(--ds-brand-secondary);
        transform: translateY(-1px);
      }

      .submit-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background: var(--ds-bg-secondary);
        color: var(--ds-text-tertiary);
        box-shadow: none;
      }

      .submit-btn svg {
        width: 18px;
        height: 18px;
      }

      .composer-foot {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 2px;
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
      }

      .composer-foot-copy {
        flex: 1;
        min-width: 0;
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];

  private handleInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.inputValue = textarea.value;
    if (this.submitState !== 'idle') {
      this.submitState = 'idle';
    }

    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.handleSubmit();
    }
  }

  private handleCapture() {
    if (this.submitState !== 'idle') {
      this.submitState = 'idle';
    }
    this.channelMenuOpen = false;
    this.storeController.store.enterCaptureMode();
  }

  private toggleChannelMenu() {
    this.channelMenuOpen = !this.channelMenuOpen;
  }

  private handleOpenSettings() {
    this.channelMenuOpen = false;
    this.dispatchEvent(
      new CustomEvent('open-settings', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private setChannel(channel: DispatchChannel) {
    this.storeController.store.setDispatchSessionOverrides({ channel });
    this.channelMenuOpen = false;
  }

  private async handleSubmit() {
    const { selectedElement, relayConnected } = this.storeController.state;

    if (!this.inputValue.trim() || !selectedElement || !relayConnected) {
      return;
    }

    this.isSubmitting = true;

    try {
      await this.storeController.store.submitAnnotation(this.inputValue.trim());
      this.inputValue = '';
      this.submitState = 'success';

      // Reset textarea height
      const textarea = this.shadowRoot?.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    } catch (error) {
      this.submitState = 'error';
      console.error('[pinflow] Failed to submit annotation:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private getComposerState(
    relayConnected: boolean,
    hasElement: boolean,
    hasInput: boolean,
    isCapturing: boolean,
  ) {
    if (this.isSubmitting) {
      return {
        badge: 'Sendet gerade',
        active: true,
        copy: 'Auftrag wird gerade uebergeben.',
      };
    }

    if (!relayConnected) {
      return {
        badge: 'Relay offline',
        active: false,
        copy: 'Relay verbinden, dann senden.',
      };
    }

    if (isCapturing) {
      return {
        badge: 'Picker aktiv',
        active: true,
        copy: 'Im Canvas ein Element markieren.',
      };
    }

    if (this.submitState === 'success') {
      return {
        badge: 'Im Flow',
        active: true,
        copy: 'Auftrag uebergeben. Direkt weiterschreiben.',
      };
    }

    if (this.submitState === 'error') {
      return {
        badge: 'Senden fehlgeschlagen',
        active: false,
        copy: 'Senden fehlgeschlagen. Direkt erneut versuchen.',
      };
    }

    if (!hasElement) {
      return {
        badge: 'Element waehlen',
        active: false,
        copy: 'Element waehlen und Aenderung schreiben.',
      };
    }

    if (!hasInput) {
      return {
        badge: 'Element markiert',
        active: true,
        copy: 'Aenderung fuer das markierte Element schreiben.',
      };
    }

    return {
      badge: 'Bereit',
      active: true,
      copy: 'Kurz pruefen und senden.',
    };
  }

  override render() {
    const { selectedElement, relayConnected, mode } =
      this.storeController.state;
    const activeChannel =
      this.storeController.state.dispatchSession.overrides.channel ??
      this.storeController.state.dispatchProjectDefaults.channel;
    const hasElement = !!selectedElement;
    const isCapturing = mode === 'capturing';
    const hasInput = !!this.inputValue.trim();

    // Input is disabled if not connected OR no element selected
    const isDisabled = !relayConnected || !hasElement;
    const canSubmit = hasInput && hasElement && relayConnected && !this.isSubmitting;

    // Contextual placeholder based on state
    const placeholder = !relayConnected
      ? 'Relay verbinden ...'
      : isCapturing
        ? 'Element im Canvas markieren ...'
        : !hasElement
        ? 'Waehle zuerst ein Element ...'
        : 'Aenderung oder Auftrag schreiben ...';
    const composerState = this.getComposerState(
      relayConnected,
      hasElement,
      hasInput,
      isCapturing,
    );
    const flowLabel =
      activeChannel === 'queue_only'
        ? 'Nur sammeln'
        : activeChannel === 'claude'
          ? 'Claude'
          : 'Codex';

    return html`
      <div class="input-wrapper">
        <div class="composer-top">
          <span
            class="composer-state-pill ${composerState.active ? 'active' : ''}"
            >${composerState.badge}</span
          >
        </div>

        <div class="textarea-container ${isDisabled ? 'disabled' : ''}">
          <textarea
            placeholder=${placeholder}
            .value=${this.inputValue}
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
            ?disabled=${isDisabled}
            rows="1"
          ></textarea>
        </div>

        <div class="action-bar">
          <div class="action-group">
            <button
              class="action-btn ${hasElement ? 'active' : ''}"
              @click=${this.handleCapture}
              ?disabled=${isCapturing}
              title=${hasElement
                ? 'Element ausgewaehlt - zum Wechseln klicken'
                : isCapturing
                  ? 'Picker aktiv'
                  : 'Element markieren'}
              aria-label="Element markieren"
            >
              <!-- Cursor with sparkles icon -->
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M15 15l-2 5L9 9l11 4-5 2z" fill="currentColor" />
                <path
                  d="M15 15l5 5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <div class="menu-wrap">
              ${this.channelMenuOpen
                ? html`
                    <div class="menu-panel" role="menu" aria-label="Agent wählen">
                      ${[
                        ['codex', 'Codex', 'Direkt mit Codex arbeiten'],
                        ['claude', 'Claude', 'Mit Claude weiterschicken'],
                        ['queue_only', 'Nur sammeln', 'Erst sammeln, später versenden'],
                      ].map(
                        ([value, label, note]) => html`
                          <button
                            class="menu-item ${activeChannel === value ? 'active' : ''}"
                            @click=${() => this.setChannel(value as DispatchChannel)}
                            role="menuitemradio"
                            aria-checked=${activeChannel === value}
                          >
                            <span class="menu-item-copy">
                              <span class="menu-item-title">${label}</span>
                              <span class="menu-item-note">${note}</span>
                            </span>
                            ${activeChannel === value
                              ? html`
                                  <svg
                                    class="menu-check"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="m5 12 4.5 4.5L19 7"
                                      stroke="currentColor"
                                      stroke-width="2.2"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                    />
                                  </svg>
                                `
                              : null}
                          </button>
                        `,
                      )}
                    </div>
                  `
                : null}

              <button
                class="action-btn menu-btn"
                @click=${this.toggleChannelMenu}
                title=${`Agent: ${flowLabel}`}
                aria-label="Agent waehlen"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.5c3.9 0 7 2.86 7 6.4 0 2.1-1.12 3.95-2.85 5.12v3.48l-2.72-1.72c-.47.08-.95.12-1.43.12-3.9 0-7-2.86-7-6.4s3.1-6.4 7-6.4Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M9.25 10.2h.01M12 10.2h.01M14.75 10.2h.01"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>

            <button
              class="action-btn"
              @click=${this.handleOpenSettings}
              title="Einstellungen oeffnen"
              aria-label="Einstellungen oeffnen"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M10.5 4.5h3l.8 2.14 2.26.94 2.03-.84 2.12 2.12-.85 2.02.94 2.27 2.2.85v3l-2.13.8-.94 2.26.85 2.03-2.12 2.12-2.02-.85-2.27.94-.85 2.2h-3l-.8-2.13-2.26-.94-2.03.85-2.12-2.12.85-2.02-.94-2.27-2.2-.85v-3l2.13-.8.94-2.26-.85-2.03 2.12-2.12 2.02.85 2.27-.94.85-2.2Z"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
              </svg>
            </button>
          </div>

          <div class="action-group">
            <button
              class="submit-btn"
              @click=${this.handleSubmit}
              ?disabled=${!canSubmit}
              title="Anmerkung senden"
              aria-label="Anmerkung senden"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="composer-foot">
        <span class="composer-foot-copy">${composerState.copy}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-input': DsAnnotationInput;
  }
}
