/**
 * DsAnnotationInput - Chat-style annotation input
 *
 * A text input for creating annotations about the selected element.
 * Styled like a compact agent composer with action bar below.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import type { DispatchChannel } from '../core/dispatch-config.js';
import type { CommentEntryMode, PickerMode } from '../core/types.js';

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

  @state()
  private pickerMenuOpen = false;

  @state()
  private undoConfirmOpen = false;

  @state()
  private undoState: 'idle' | 'success' | 'error' = 'idle';

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: flex;
        min-height: 0;
        height: 100%;
        flex-direction: column;
        overflow: visible;
      }

      .input-wrapper {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        background: var(--ds-shell-surface-strong);
        border: 1px solid var(--ds-shell-border-soft);
        border-radius: 22px;
        overflow: visible;
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
        flex: 1;
        min-height: 0;
      }

      textarea {
        width: 100%;
        height: 100%;
        min-height: 56px;
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
        border-color: color-mix(
          in srgb,
          var(--ds-brand-primary) 38%,
          var(--ds-pill-border)
        );
      }

      .capture-btn {
        background: color-mix(
          in srgb,
          var(--ds-brand-primary) 8%,
          var(--ds-pill-surface)
        );
        border-color: color-mix(
          in srgb,
          var(--ds-brand-primary) 24%,
          var(--ds-pill-border)
        );
        color: var(--ds-text-primary);
      }

      .action-btn svg {
        width: 18px;
        height: 18px;
      }

      .menu-wrap {
        position: relative;
        z-index: 30;
      }

      .picker-menu-wrap {
        position: relative;
        z-index: 32;
      }

      .menu-btn {
        position: relative;
        width: 36px;
        min-width: 36px;
        gap: 0;
        padding: 0;
        justify-content: center;
      }

      .menu-btn.active {
        background: var(--ds-panel-surface-strong);
        color: var(--ds-text-primary);
        border-color: var(--ds-panel-border-strong);
      }

      .menu-panel {
        position: absolute;
        left: 0;
        bottom: calc(100% + 10px);
        display: grid;
        gap: 4px;
        min-width: 196px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-lg);
        z-index: 20;
      }

      .picker-menu {
        min-width: 210px;
      }

      .picker-mode-btn {
        width: 36px;
        min-width: 36px;
        gap: 0;
        padding: 0;
      }

      .picker-mode-btn svg {
        width: 19px;
        height: 19px;
      }

      .undo-wrap {
        position: relative;
        z-index: 31;
      }

      .undo-confirm {
        position: absolute;
        left: 0;
        bottom: calc(100% + 10px);
        display: grid;
        gap: 10px;
        width: min(238px, calc(100vw - 32px));
        padding: 12px;
        border-radius: 16px;
        border: 1px solid var(--ds-panel-border);
        background: var(--ds-card-surface-strong);
        box-shadow: var(--ds-shadow-lg);
        z-index: 24;
      }

      .undo-confirm-title {
        margin: 0;
        color: var(--ds-text-primary);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-semibold);
        line-height: 1.3;
      }

      .undo-confirm-copy {
        margin: 0;
        color: var(--ds-text-secondary);
        font-size: var(--ds-font-size-xs);
        line-height: 1.45;
      }

      .undo-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 7px;
      }

      .undo-confirm-btn {
        min-height: 30px;
        padding: 0 10px;
        border-radius: 11px;
        border: 1px solid var(--ds-pill-border);
        background: var(--ds-pill-surface);
        color: var(--ds-text-secondary);
        font: inherit;
        font-size: var(--ds-font-size-xs);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
      }

      .undo-confirm-btn:hover {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
      }

      .undo-confirm-btn.primary {
        background: var(--ds-text-primary);
        border-color: var(--ds-text-primary);
        color: var(--ds-bg-primary);
      }

      .undo-confirm-btn.primary:hover {
        transform: translateY(-1px);
      }

      .menu-heading {
        padding: 3px 6px 5px;
        color: var(--ds-text-tertiary);
        font-size: 10px;
        font-weight: var(--ds-font-weight-medium);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .fallback-group {
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px solid var(--ds-panel-border);
      }

      .fallback-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 10px;
        border-radius: 12px;
        color: var(--ds-text-tertiary);
        cursor: pointer;
        font-size: 10px;
        font-weight: var(--ds-font-weight-medium);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .fallback-summary::-webkit-details-marker {
        display: none;
      }

      .fallback-summary:hover {
        background: var(--ds-bg-hover);
        color: var(--ds-text-secondary);
      }

      .fallback-summary-meta {
        color: var(--ds-text-secondary);
        font-size: 10px;
        font-weight: var(--ds-font-weight-normal);
        letter-spacing: 0;
        text-transform: none;
      }

      .fallback-chevron {
        width: 14px;
        height: 14px;
        color: currentColor;
        transition: transform var(--ds-transition-fast);
      }

      .fallback-group[open] .fallback-chevron {
        transform: rotate(180deg);
      }

      .fallback-items {
        display: grid;
        gap: 4px;
        padding-top: 4px;
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

      .menu-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-medium);
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
    `,
  ];

  private handleInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.inputValue = textarea.value;
    if (this.submitState !== 'idle') {
      this.submitState = 'idle';
    }
    if (this.undoState !== 'idle') {
      this.undoState = 'idle';
    }
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
    this.undoState = 'idle';
    this.channelMenuOpen = false;
    this.pickerMenuOpen = false;
    this.undoConfirmOpen = false;
    this.storeController.store.enterCaptureMode(
      this.storeController.state.pickerMode,
    );
  }

  private togglePickerMenu() {
    this.pickerMenuOpen = !this.pickerMenuOpen;
    this.channelMenuOpen = false;
    this.undoConfirmOpen = false;
  }

  private setPickerMode(pickerMode: PickerMode) {
    this.storeController.store.setPickerMode(pickerMode);
    this.pickerMenuOpen = false;
  }

  private setCommentEntryMode(commentEntryMode: CommentEntryMode) {
    this.storeController.store.setCommentEntryMode(commentEntryMode);
  }

  private toggleChannelMenu() {
    this.channelMenuOpen = !this.channelMenuOpen;
    this.pickerMenuOpen = false;
    this.undoConfirmOpen = false;
  }

  private setChannel(channel: DispatchChannel) {
    this.storeController.store.setDispatchSessionOverrides({ channel });
    this.channelMenuOpen = false;
  }

  private handleUndoClick() {
    if (!this.storeController.state.undoStack[0]) {
      return;
    }
    this.undoConfirmOpen = !this.undoConfirmOpen;
    this.channelMenuOpen = false;
    this.pickerMenuOpen = false;
  }

  private cancelUndo() {
    this.undoConfirmOpen = false;
  }

  private async confirmUndo() {
    if (!this.storeController.state.undoStack[0]) {
      this.undoConfirmOpen = false;
      return;
    }

    try {
      await this.storeController.store.undoLastAction();
      this.undoState = 'success';
      this.undoConfirmOpen = false;
    } catch (error) {
      this.undoState = 'error';
      console.error('[pinflow] Failed to undo last action:', error);
    }
  }

  private async handleSubmit() {
    const {
      selectedElement,
      selectedElements,
      selectedRegion,
      relayConnected,
    } = this.storeController.state;
    const hasSelection =
      !!selectedElement || selectedElements.length > 0 || !!selectedRegion;

    if (!this.inputValue.trim() || !hasSelection || !relayConnected) {
      return;
    }

    this.isSubmitting = true;

    try {
      await this.storeController.store.submitAnnotation(this.inputValue.trim());
      this.inputValue = '';
      this.submitState = 'success';
      this.undoState = 'idle';

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
    hasSelection: boolean,
    hasInput: boolean,
    isCapturing: boolean,
    pickerMode: PickerMode,
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
        copy:
          pickerMode === 'region'
            ? 'Im Canvas einen Bereich aufziehen.'
            : pickerMode === 'multi'
              ? 'Mehrere Elemente waehlen und mit Enter uebernehmen.'
              : 'Im Canvas ein Element markieren.',
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

    if (this.undoState === 'success') {
      return {
        badge: 'Rueckgaengig',
        active: true,
        copy: 'Der letzte PinFlow-Schritt wurde zurueckgenommen.',
      };
    }

    if (this.undoState === 'error') {
      return {
        badge: 'Rueckgaengig fehlgeschlagen',
        active: false,
        copy: 'Der letzte Schritt konnte nicht zurueckgenommen werden.',
      };
    }

    if (!hasSelection) {
      return {
        badge:
          pickerMode === 'region'
            ? 'Bereich waehlen'
            : pickerMode === 'multi'
              ? 'Elemente waehlen'
              : 'Element waehlen',
        active: false,
        copy: 'Auswahl treffen und Aenderung schreiben.',
      };
    }

    if (!hasInput) {
      return {
        badge:
          pickerMode === 'region'
            ? 'Bereich markiert'
            : pickerMode === 'multi'
              ? 'Auswahl markiert'
              : 'Element markiert',
        active: true,
        copy: 'Aenderung fuer die Auswahl schreiben.',
      };
    }

    return {
      badge: 'Bereit',
      active: true,
      copy: 'Kurz pruefen und senden.',
    };
  }

  private renderPickerModeIcon(pickerMode: PickerMode) {
    if (pickerMode === 'region') {
      return html`
        <svg
          class="mode-switch-icon"
          data-mode="region"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M8 8h8v8H8z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      `;
    }

    if (pickerMode === 'multi') {
      return html`
        <svg
          class="mode-switch-icon"
          data-mode="multi"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="5"
            width="7"
            height="6"
            rx="2"
            fill="currentColor"
            opacity="0.92"
          />
          <rect
            x="13"
            y="5"
            width="7"
            height="6"
            rx="2"
            stroke="currentColor"
            stroke-width="1.8"
          />
          <rect
            x="4"
            y="13"
            width="7"
            height="6"
            rx="2"
            stroke="currentColor"
            stroke-width="1.8"
          />
          <rect
            x="13"
            y="13"
            width="7"
            height="6"
            rx="2"
            fill="currentColor"
            opacity="0.92"
          />
        </svg>
      `;
    }

    return html`
      <svg
        class="mode-switch-icon"
        data-mode="element"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 4v3M12 17v3M4 12h3M17 12h3"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle
          cx="12"
          cy="12"
          r="4.25"
          stroke="currentColor"
          stroke-width="1.9"
        />
        <path
          d="M14.2 14.2l-1.45 4.35-3.3-9.1 9.1 3.3-4.35 1.45z"
          fill="currentColor"
        />
      </svg>
    `;
  }

  override render() {
    const {
      selectedElement,
      selectedElements,
      selectedRegion,
      relayConnected,
      mode,
      pickerMode,
      commentEntryMode,
      undoStack,
    } = this.storeController.state;
    const activeChannel =
      this.storeController.state.dispatchSession.overrides.channel ??
      this.storeController.state.dispatchProjectDefaults.channel;
    const hasElement = !!selectedElement;
    const hasSelection =
      hasElement || selectedElements.length > 0 || !!selectedRegion;
    const isCapturing = mode === 'capturing';
    const hasInput = !!this.inputValue.trim();

    // Input is disabled if not connected OR no element selected
    const isDisabled = !relayConnected || !hasSelection;
    const canSubmit =
      hasInput && hasSelection && relayConnected && !this.isSubmitting;

    // Contextual placeholder based on state
    const placeholder = !relayConnected
      ? 'Relay verbinden ...'
      : isCapturing
        ? pickerMode === 'region'
          ? 'Bereich im Canvas markieren ...'
          : pickerMode === 'multi'
            ? 'Elemente im Canvas markieren ...'
            : 'Element im Canvas markieren ...'
        : !hasSelection
          ? pickerMode === 'region'
            ? 'Waehle zuerst einen Bereich ...'
            : pickerMode === 'multi'
              ? 'Waehle zuerst mehrere Elemente ...'
              : 'Waehle zuerst ein Element ...'
          : 'Aenderung oder Auftrag schreiben ...';
    const composerState = this.getComposerState(
      relayConnected,
      hasSelection,
      hasInput,
      isCapturing,
      pickerMode,
    );
    const flowLabel =
      activeChannel === 'auto'
        ? 'Aktueller Agent'
        : activeChannel === 'queue_only'
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
              class="action-btn capture-btn ${hasSelection ? 'active' : ''}"
              @click=${this.handleCapture}
              ?disabled=${isCapturing}
              title=${hasSelection
                ? 'Auswahl vorhanden - zum Wechseln klicken'
                : isCapturing
                  ? 'Picker aktiv'
                  : 'Auswahl markieren'}
              aria-label="Auswahl markieren"
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

            <div class="picker-menu-wrap">
              ${this.pickerMenuOpen
                ? html`
                    <div
                      class="menu-panel picker-menu"
                      role="menu"
                      aria-label="Picker-Modus waehlen"
                    >
                      <div class="menu-heading">Picker-Modus</div>
                      ${[
                        ['element', 'Element', 'Ein Ziel mit Quellkontext'],
                        ['region', 'Bereich', 'Layout- oder UI-Ausschnitt'],
                        ['multi', 'Mehrfach', 'Mehrere Elemente gemeinsam'],
                      ].map(
                        ([value, label, note]) => html`
                          <button
                            class="menu-item ${pickerMode === value
                              ? 'active'
                              : ''}"
                            @click=${() =>
                              this.setPickerMode(value as PickerMode)}
                            role="menuitemradio"
                            aria-checked=${pickerMode === value}
                          >
                            <span class="menu-item-copy">
                              <span class="menu-item-title">${label}</span>
                              <span class="menu-item-note">${note}</span>
                            </span>
                            ${pickerMode === value
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
                      <div class="fallback-group">
                        <div class="menu-heading">Kommentar nach Auswahl</div>
                        ${[
                          [
                            'workspace',
                            'Im Arbeitsbereich',
                            'Rechts unten schreiben',
                          ],
                          [
                            'inline',
                            'Direkt am Element',
                            'Am Klickpunkt schreiben',
                          ],
                        ].map(
                          ([value, label, note]) => html`
                            <button
                              class="menu-item ${commentEntryMode === value
                                ? 'active'
                                : ''}"
                              @click=${() =>
                                this.setCommentEntryMode(
                                  value as CommentEntryMode,
                                )}
                              role="menuitemradio"
                              aria-checked=${commentEntryMode === value}
                            >
                              <span class="menu-item-copy">
                                <span class="menu-item-title">${label}</span>
                                <span class="menu-item-note">${note}</span>
                              </span>
                              ${commentEntryMode === value
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
                    </div>
                  `
                : null}
              <button
                class="action-btn picker-mode-btn ${this.pickerMenuOpen
                  ? 'active'
                  : ''}"
                @click=${this.togglePickerMenu}
                title=${`Picker-Modus: ${
                  pickerMode === 'region'
                    ? 'Bereich'
                    : pickerMode === 'multi'
                      ? 'Mehrfach'
                      : 'Element'
                }`}
                aria-label="Picker-Modus waehlen"
              >
                ${this.renderPickerModeIcon(pickerMode)}
              </button>
            </div>

            <div class="menu-wrap">
              ${this.channelMenuOpen
                ? html`
                    <div
                      class="menu-panel"
                      role="menu"
                      aria-label="Weitergabe waehlen"
                    >
                      <div class="menu-heading">Weitergabe</div>
                      ${[
                        [
                          'auto',
                          'Aktueller Agent',
                          'Nutzt den Agent, der diese Session gestartet hat',
                        ],
                        [
                          'queue_only',
                          'Nur sammeln',
                          'Erst sammeln, spaeter versenden',
                        ],
                      ].map(
                        ([value, label, note]) => html`
                          <button
                            class="menu-item ${activeChannel === value
                              ? 'active'
                              : ''}"
                            @click=${() =>
                              this.setChannel(value as DispatchChannel)}
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
                      <details class="fallback-group">
                        <summary class="fallback-summary">
                          <span>Fallbacks</span>
                          ${activeChannel === 'codex' ||
                          activeChannel === 'claude'
                            ? html`<span class="fallback-summary-meta"
                                >${flowLabel} aktiv</span
                              >`
                            : null}
                          <svg
                            class="fallback-chevron"
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
                        <div class="fallback-items">
                          ${[
                            ['codex', 'Codex', 'Manuell erzwingen'],
                            ['claude', 'Claude', 'Manuell erzwingen'],
                          ].map(
                            ([value, label, note]) => html`
                              <button
                                class="menu-item ${activeChannel === value
                                  ? 'active'
                                  : ''}"
                                @click=${() =>
                                  this.setChannel(value as DispatchChannel)}
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
                      </details>
                    </div>
                  `
                : null}

              <button
                class="action-btn menu-btn ${this.channelMenuOpen
                  ? 'active'
                  : ''}"
                @click=${this.toggleChannelMenu}
                title=${`Weitergabe: ${flowLabel}`}
                aria-label="Weitergabe waehlen"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 4v4a4 4 0 0 0 4 4h8"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M14 8l4 4-4 4M6 20v-3a5 5 0 0 1 5-5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div class="undo-wrap">
              ${this.undoConfirmOpen
                ? html`
                    <div
                      class="undo-confirm"
                      role="alertdialog"
                      aria-label="Rueckgaengig bestaetigen"
                    >
                      <p class="undo-confirm-title">
                        Wirklich rueckgaengig machen?
                      </p>
                      <p class="undo-confirm-copy">
                        ${undoStack[0]?.description ??
                        'Der letzte PinFlow-Schritt wird zurueckgenommen.'}
                      </p>
                      <div class="undo-confirm-actions">
                        <button
                          class="undo-confirm-btn"
                          @click=${this.cancelUndo}
                          type="button"
                        >
                          Abbrechen
                        </button>
                        <button
                          class="undo-confirm-btn primary"
                          data-testid="confirm-undo"
                          @click=${this.confirmUndo}
                          type="button"
                        >
                          Bestaetigen
                        </button>
                      </div>
                    </div>
                  `
                : null}
              <button
                class="action-btn ${this.undoConfirmOpen ? 'active' : ''}"
                @click=${this.handleUndoClick}
                ?disabled=${!undoStack[0]}
                title=${undoStack[0]
                  ? `${undoStack[0].label}: ${undoStack[0].description}`
                  : 'Nichts zum Rueckgaengigmachen'}
                aria-label="Letzte Aktion rueckgaengig machen"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 14 4 9l5-5"
                    stroke="currentColor"
                    stroke-width="2.1"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M4 9h10.5a5.5 5.5 0 1 1 0 11H11"
                    stroke="currentColor"
                    stroke-width="2.1"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-input': DsAnnotationInput;
  }
}
