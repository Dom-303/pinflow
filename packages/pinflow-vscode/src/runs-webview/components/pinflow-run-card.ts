import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mapStatusToPillState, type PillState } from './pinflow-lifecycle-pill.js';
import './pinflow-run-detail.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

const STATE_ICON: Record<PillState, string> = {
  processing: 'codicon-loading codicon-modifier-spin',
  processed: 'codicon-check',
  failed: 'codicon-error',
  unknown: 'codicon-circle-outline',
};

@customElement('pinflow-run-card')
export class PinflowRunCard extends LitElement {
  @property({ attribute: false }) run!: PinFlowRunEvidence;
  @property({ attribute: false }) timeFormat: RunsWebviewSettings['timeFormat'] = '24h';
  @property({ type: Number }) index = 0;
  @property({ type: Boolean, attribute: false }) isExpanded = false;
  @property({ attribute: false }) liveTranscript = '';
  @property({ attribute: false }) liveChangedFiles: readonly PinFlowChangedFile[] | null = null;

  static styles = css`
    :host {
      display: block;
      --stagger-delay: calc(var(--card-index, 0) * 30ms);
    }
    .card {
      position: relative;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 5px 8px 5px 12px;
      cursor: pointer;
      transition: background 80ms ease;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      border-radius: 2px;
      background: var(--pf-text-muted);
      opacity: 0.4;
    }
    .card[data-state='processed']::before { background: var(--pf-status-done); opacity: 0.7; }
    .card[data-state='processing']::before { background: var(--pf-status-running); opacity: 0.9; }
    .card[data-state='failed']::before { background: var(--pf-status-failed); opacity: 0.8; }
    .card:hover {
      background: var(--pf-bg-elevated);
    }
    :host([is-expanded]) .card {
      background: var(--pf-bg-elevated);
    }
    @media (prefers-reduced-motion: no-preference) {
      :host {
        animation: card-fade-in 250ms ease-out both;
        animation-delay: var(--stagger-delay);
      }
    }
    @keyframes card-fade-in {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .status-icon {
      flex-shrink: 0;
      font-family: codicon;
      font-size: 12px;
      color: var(--pf-text-muted);
      width: 14px;
      text-align: center;
    }
    .status-icon.processed { color: var(--pf-status-done); }
    .status-icon.processing { color: var(--pf-status-running); }
    .status-icon.failed { color: var(--pf-status-failed); }
    .label {
      flex: 1;
      min-width: 0;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--pf-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .annotation-id {
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 11px;
      color: var(--pf-text-muted);
      margin-left: 6px;
    }
    .time {
      flex-shrink: 0;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text-muted);
      font-variant-numeric: tabular-nums;
    }
    .detail-slot {
      margin-top: 4px;
    }
  `;

  protected override updated(changed: Map<string, unknown>): void {
    if (changed.has('index')) {
      this.style.setProperty('--card-index', String(this.index));
    }
    if (changed.has('isExpanded')) {
      this.toggleAttribute('is-expanded', this.isExpanded);
    }
  }

  private formatTime(): string {
    const iso = this.run?.summary?.startedAt;
    if (!iso) return '';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: this.timeFormat === '12h',
      });
    } catch {
      return '';
    }
  }

  private handleClick = (event: MouseEvent): void => {
    event.preventDefault();
    const runId = this.run?.runId;
    if (!runId) return;
    this.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId },
        bubbles: true,
        composed: true,
      }),
    );
  };

  override render() {
    const intent = this.run?.summary?.userIntent?.trim();
    const annotationId = this.run?.annotationId ?? this.run?.runId ?? '';
    const primary = intent || annotationId || 'unknown';
    const showAnnotationSuffix = Boolean(intent && annotationId);
    const pillState = mapStatusToPillState(this.run?.summary?.status);
    const iconClass = STATE_ICON[pillState];
    const changedFiles = this.liveChangedFiles ?? this.run?.changedFiles ?? [];
    const isLive = pillState === 'processing';
    return html`
      <div
        class="card"
        data-state=${pillState}
        @click=${this.handleClick}
      >
        <div class="row">
          <i
            class=${`status-icon codicon ${iconClass} ${pillState}`}
            aria-label=${pillState}
          ></i>
          <span class="label">
            ${primary}${showAnnotationSuffix
              ? html`<span class="annotation-id">${annotationId}</span>`
              : null}
          </span>
          <span class="time">${this.formatTime()}</span>
        </div>
        ${this.isExpanded
          ? html`<div class="detail-slot">
              <pinflow-run-detail
                @click=${(e: Event) => e.stopPropagation()}
                .run=${this.run}
                .transcriptText=${this.liveTranscript}
                .changedFiles=${changedFiles}
                .isLive=${isLive}
              ></pinflow-run-detail>
            </div>`
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-run-card': PinflowRunCard;
  }
}
