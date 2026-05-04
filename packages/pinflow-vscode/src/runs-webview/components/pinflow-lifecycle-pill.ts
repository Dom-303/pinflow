import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type PillState = 'processing' | 'processed' | 'failed' | 'unknown';

const KNOWN_STATES = new Set<string>(['processing', 'processed', 'failed']);

export function mapStatusToPillState(
  status: string | undefined,
): PillState {
  if (status === undefined) return 'unknown';
  return KNOWN_STATES.has(status) ? (status as PillState) : 'unknown';
}

const STATE_LABEL: Record<PillState, string> = {
  processing: 'processing',
  processed: 'done',
  failed: 'failed',
  unknown: 'unknown',
};

const STATE_ICON: Record<PillState, string> = {
  processing: 'codicon-loading codicon-modifier-spin',
  processed: 'codicon-check',
  failed: 'codicon-error',
  unknown: 'codicon-circle-outline',
};

@customElement('pinflow-lifecycle-pill')
export class PinflowLifecyclePill extends LitElement {
  @property({ type: String }) state: PillState = 'unknown';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px 3px 8px;
      border-radius: 999px;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      line-height: 1;
      transition: opacity 200ms ease;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    [data-state='processing'] {
      background: color-mix(in srgb, var(--pf-status-running) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--pf-status-running) 50%, transparent);
      color: var(--pf-status-running);
    }
    [data-state='processed'] {
      background: color-mix(in srgb, var(--pf-status-done) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--pf-status-done) 50%, transparent);
      color: var(--pf-status-done);
    }
    [data-state='failed'] {
      background: color-mix(in srgb, var(--pf-status-failed) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--pf-status-failed) 50%, transparent);
      color: var(--pf-status-failed);
    }
    [data-state='unknown'] {
      background: var(--pf-bg-elevated);
      border: 1px solid var(--pf-border);
      color: var(--pf-text-muted);
    }
    @media (prefers-reduced-motion: no-preference) {
      [data-state='processing'] {
        animation: pulse 1.5s ease-in-out infinite;
      }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
  `;

  render() {
    const label = STATE_LABEL[this.state];
    const iconClass = STATE_ICON[this.state];
    return html`
      <span class="pill" data-state=${this.state}>
        <i class=${`codicon ${iconClass}`} aria-hidden="true"></i>
        <span>${label}</span>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-lifecycle-pill': PinflowLifecyclePill;
  }
}
