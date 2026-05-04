import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './pinflow-lifecycle-pill.js';
import { mapStatusToPillState } from './pinflow-lifecycle-pill.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

@customElement('pinflow-run-card')
export class PinflowRunCard extends LitElement {
  @property({ attribute: false }) run!: PinFlowRunEvidence;
  @property({ attribute: false }) timeFormat: RunsWebviewSettings['timeFormat'] = '24h';
  @property({ type: Number }) index = 0;

  static styles = css`
    :host {
      display: block;
      --stagger-delay: calc(var(--card-index, 0) * 50ms);
    }
    .card {
      position: relative;
      background: var(--pf-card-surface);
      background-image: var(--pf-paper-grain);
      background-blend-mode: overlay;
      border: 1px solid var(--pf-border);
      border-radius: var(--pf-radius);
      padding: 10px 14px 12px 16px;
      cursor: pointer;
      box-shadow: var(--pf-card-shadow);
      transition: transform 150ms ease, box-shadow 150ms ease;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 12px;
      bottom: 12px;
      width: 2px;
      background: var(--pf-accent);
      border-radius: 2px;
    }
    @media (prefers-reduced-motion: no-preference) {
      :host {
        animation: card-fade-in 350ms ease-out both;
        animation-delay: var(--stagger-delay);
      }
      .card:hover {
        transform: translateY(-2px);
        box-shadow: var(--pf-card-shadow-hover);
      }
      .card[data-just-processed]::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--pf-accent) 50%,
          transparent 100%
        );
        animation: gold-sweep 600ms ease-out;
      }
    }
    @keyframes card-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes gold-sweep {
      from { transform: translateX(-100%); }
      to { transform: translateX(100%); }
    }
    .header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--pf-space);
    }
    .annotation-id {
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 13px;
      font-weight: 600;
      color: var(--pf-text);
      letter-spacing: 0.01em;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .header-divider {
      width: 1px;
      align-self: stretch;
      background: var(--pf-accent);
      opacity: 0.5;
      margin: 2px 4px;
    }
    .time {
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text-muted);
      white-space: nowrap;
    }
    .summary {
      margin-top: 6px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--pf-text-muted);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .footer {
      margin-top: 8px;
      display: flex;
      justify-content: flex-end;
    }
  `;

  protected updated(changed: Map<string, unknown>): void {
    if (!changed.has('run')) return;
    const prev = changed.get('run') as PinFlowRunEvidence | undefined;
    const previousStatus = prev?.summary?.status;
    const currentStatus = this.run?.summary?.status;
    if (
      currentStatus === 'processed' &&
      previousStatus !== undefined &&
      previousStatus !== 'processed'
    ) {
      const card = this.shadowRoot?.querySelector<HTMLElement>('.card');
      if (card) {
        card.dataset['justProcessed'] = '';
        setTimeout(() => delete card.dataset['justProcessed'], 700);
      }
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

  render() {
    const label = this.run?.annotationId ?? this.run?.runId ?? 'unknown';
    const summary = this.run?.summary?.label ?? '';
    const pillState = mapStatusToPillState(this.run?.summary?.status);
    return html`
      <div
        class="card"
        style=${`--card-index: ${this.index}`}
        @click=${this.handleClick}
      >
        <div class="header">
          <span class="annotation-id">${label}</span>
          <span class="header-divider"></span>
          <span class="time">${this.formatTime()}</span>
        </div>
        ${summary
          ? html`<div class="summary">${summary}</div>`
          : html`<div class="summary">&nbsp;</div>`}
        <div class="footer">
          <pinflow-lifecycle-pill .state=${pillState}></pinflow-lifecycle-pill>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-run-card': PinflowRunCard;
  }
}
