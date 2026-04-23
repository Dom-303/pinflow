/**
 * DsAnnotationInput - Chat-style annotation input
 *
 * A text input for creating annotations about the selected element.
 * Styled like Claude's browser chat input with action bar below.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { EventManager } from '../core/event-manager.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

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
        border-radius: var(--ds-radius-lg);
        overflow: hidden;
        box-shadow: var(--ds-shadow-sm);
        backdrop-filter: var(--ds-shell-blur);
        transition:
          border-color var(--ds-transition-fast),
          box-shadow var(--ds-transition-fast),
          transform var(--ds-transition-fast);
      }

      .composer-head {
        display: grid;
        gap: var(--ds-space-xs);
        padding: var(--ds-space-md) var(--ds-space-md) var(--ds-space-sm);
        border-bottom: 1px solid var(--ds-shell-border-muted);
        background:
          radial-gradient(
            circle at top right,
            var(--ds-shell-glow),
            transparent 42%
          ),
          var(--ds-shell-surface-soft);
      }

      .composer-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ds-space-sm);
      }

      .composer-title {
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-primary);
        letter-spacing: -0.02em;
      }

      .selection-state {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: var(--ds-radius-full);
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
      }

      .selection-state::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ds-warning);
      }

      .selection-state.active::before {
        background: var(--ds-success);
      }

      .composer-copy {
        margin: 0;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      .composer-note {
        display: grid;
        gap: 4px;
        margin-top: var(--ds-space-xs);
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid var(--ds-empty-border);
        background: var(--ds-empty-surface);
        box-shadow: var(--ds-panel-shadow-soft);
      }

      .composer-note-title {
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
      }

      .composer-note-copy {
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      .input-wrapper:focus-within {
        border-color: var(--ds-brand-primary);
        box-shadow: var(--ds-highlight-glow);
        transform: translateY(-1px);
      }

      .textarea-container.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      /* Textarea area */
      .textarea-container {
        padding: var(--ds-space-md);
        padding-bottom: var(--ds-space-xs);
      }

      textarea {
        width: 100%;
        min-height: 40px;
        max-height: 120px;
        padding: 0;
        background: transparent;
        border: none;
        font-family: inherit;
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        resize: none;
        outline: none;
        line-height: 1.5;
      }

      textarea::placeholder {
        color: var(--ds-text-tertiary);
      }

      /* Action bar */
      .action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ds-space-sm) var(--ds-space-md);
        border-top: 1px solid var(--ds-border-secondary);
        background: var(--ds-shell-surface-soft);
      }

      .action-group {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
      }

      .shortcut-hint {
        color: var(--ds-text-tertiary);
        font-size: var(--ds-font-size-xs);
      }

      /* Icon buttons in action bar */
      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--ds-radius-md);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
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

      /* Submit button - accent colored */
      .submit-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 28px;
        height: 30px;
        padding: 0 10px;
        background: var(--ds-brand-primary);
        border: none;
        border-radius: var(--ds-radius-md);
        box-shadow: var(--ds-shadow-sm);
        color: var(--ds-bg-tertiary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
      }

      .submit-btn:hover:not(:disabled) {
        background: var(--ds-brand-secondary);
      }

      .submit-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background: var(--ds-bg-secondary);
        color: var(--ds-text-tertiary);
        box-shadow: none;
      }

      .submit-btn svg {
        width: 14px;
        height: 14px;
      }

      .submit-label {
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-semibold);
        letter-spacing: 0.01em;
      }

      /* Hint text */
      .hint {
        margin-top: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        text-align: center;
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
    const eventManager = EventManager.getInstance();
    eventManager.enableCapture();
    this.storeController.store.enterCaptureMode();
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
        copy: 'PinFlow uebergibt deine Aenderung gerade an den aktiven Flow.',
        submitLabel: 'Sendet...',
        hint: 'Der Auftrag wird gerade uebergeben.',
      };
    }

    if (!relayConnected) {
      return {
        badge: 'Relay offline',
        active: false,
        copy:
          'Verbinde PinFlow zuerst mit dem Relay, damit neue Aufgaben direkt in deinen Flow gehen koennen.',
        submitLabel: 'Wartet auf Relay',
        hint: 'Sobald Relay verbunden ist, kannst du direkt aus dem Overlay senden.',
      };
    }

    if (isCapturing) {
      return {
        badge: 'Picker aktiv',
        active: true,
        copy:
          'Markiere jetzt das passende UI-Element im Vorschau-Canvas. PinFlow uebernimmt die Auswahl danach direkt in deinen Arbeitsbereich.',
        submitLabel: 'Waehle im Canvas',
        hint: 'Klicke auf das Ziel im Canvas oder brich mit ESC ab.',
      };
    }

    if (this.submitState === 'success') {
      return {
        badge: 'Im Flow',
        active: true,
        copy: 'Dein Auftrag wurde uebergeben und taucht jetzt im Arbeitsverlauf auf.',
        submitLabel: 'Uebergeben',
        hint: 'Du kannst direkt die naechste Aenderung formulieren oder ein neues Element markieren.',
      };
    }

    if (this.submitState === 'error') {
      return {
        badge: 'Senden fehlgeschlagen',
        active: false,
        copy: 'Der Auftrag konnte gerade nicht uebergeben werden. Pruefe Relay und versuche es erneut.',
        submitLabel: 'Erneut versuchen',
        hint: 'Dein Text bleibt erhalten, damit du ihn direkt noch einmal senden kannst.',
      };
    }

    if (!hasElement) {
      return {
        badge: 'Element waehlen',
        active: false,
        copy:
          'Markiere zuerst rechts ein UI-Element und formuliere danach die gewuenschte Aenderung.',
        submitLabel: 'Element waehlen',
        hint: 'Mit dem Marker waehlst du die Stelle aus, die du aendern willst.',
      };
    }

    if (!hasInput) {
      return {
        badge: 'Element markiert',
        active: true,
        copy: 'Die Auswahl steht. Beschreibe jetzt die gewuenschte Aenderung fuer dieses Element.',
        submitLabel: 'Aenderung formulieren',
        hint: 'Mit dem Marker kannst du die Auswahl jederzeit wechseln.',
      };
    }

    return {
      badge: 'Bereit zum Senden',
      active: true,
      copy:
        'Die Aenderung geht direkt in den aktiven Flow. Mit Strg+Enter kannst du sofort senden.',
      submitLabel: 'In Flow geben',
      hint: 'Mit Strg+Enter senden',
    };
  }

  private getComposerNote() {
    if (this.submitState === 'success') {
      return {
        title: 'Naechster Schritt',
        copy: 'Direkt die naechste Aenderung schreiben oder ein neues Element markieren.',
      };
    }

    if (this.submitState === 'error') {
      return {
        title: 'Naechster Schritt',
        copy: 'Relay pruefen oder den Auftrag direkt erneut uebergeben.',
      };
    }

    return null;
  }

  override render() {
    const { selectedElement, relayConnected, mode } =
      this.storeController.state;
    const hasElement = !!selectedElement;
    const isCapturing = mode === 'capturing';
    const hasInput = !!this.inputValue.trim();

    // Input is disabled if not connected OR no element selected
    const isDisabled = !relayConnected || !hasElement;
    const canSubmit = hasInput && hasElement && relayConnected && !this.isSubmitting;

    // Contextual placeholder based on state
    const placeholder = !relayConnected
      ? 'Verbinde mit Relay...'
      : isCapturing
        ? 'Markiere gerade ein Element im Canvas...'
      : !hasElement
        ? 'Waehle zuerst ein Element aus...'
        : 'Beschreibe die gewuenschte Aenderung...';
    const composerState = this.getComposerState(
      relayConnected,
      hasElement,
      hasInput,
      isCapturing,
    );
    const composerNote = this.getComposerNote();

    return html`
      <div class="input-wrapper">
        <div class="composer-head">
          <div class="composer-topline">
            <span class="composer-title">Kommentar und Auftrag</span>
            <span class="selection-state ${composerState.active ? 'active' : ''}"
              >${composerState.badge}</span
            >
          </div>
          <p class="composer-copy">${composerState.copy}</p>
          ${composerNote
            ? html`
                <div class="composer-note">
                  <div class="composer-note-title">${composerNote.title}</div>
                  <div class="composer-note-copy">${composerNote.copy}</div>
                </div>
              `
            : null}
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
          <div class="shortcut-hint">Strg+Enter</div>

          <!-- Right-side actions: capture + submit -->
          <div class="action-group">
            <!-- Capture element button - always enabled except during capture -->
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

            <!-- Submit button -->
            <button
              class="submit-btn"
              @click=${this.handleSubmit}
              ?disabled=${!canSubmit}
              title="Anmerkung senden (Strg+Enter)"
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
              <span class="submit-label">${composerState.submitLabel}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="hint">${composerState.hint}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-input': DsAnnotationInput;
  }
}
