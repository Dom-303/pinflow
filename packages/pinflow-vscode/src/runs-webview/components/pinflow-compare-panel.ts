import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { PinFlowRunEvidence, PinFlowRunSummary } from '../../core/run-evidence.js';

const MAX_VISIBLE_FILES = 10;

function formatStarted(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function durationMsOf(summary: PinFlowRunSummary | undefined): number | undefined {
  if (!summary) return undefined;
  if (typeof summary.durationMs === 'number' && Number.isFinite(summary.durationMs)) {
    return summary.durationMs;
  }
  if (summary.startedAt && summary.finishedAt) {
    const ms = new Date(summary.finishedAt).getTime() - new Date(summary.startedAt).getTime();
    return Number.isFinite(ms) && ms >= 0 ? ms : undefined;
  }
  return undefined;
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
}

function formatTokens(tokens: number | undefined): string {
  if (tokens === undefined) return '—';
  if (tokens < 1000) return String(tokens);
  return `${(tokens / 1000).toFixed(1)}k`;
}

function formatCost(cost: number | undefined): string {
  if (cost === undefined) return '—';
  return `~$${cost.toFixed(2)}`;
}

function formatSignedCurrency(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}$${Math.abs(delta).toFixed(2)}`;
}

function formatSignedTokens(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const abs = Math.abs(delta);
  if (abs < 1000) return `${sign}${abs}`;
  return `${sign}${(abs / 1000).toFixed(1)}k`;
}

function formatSignedDuration(deltaMs: number): string {
  const sign = deltaMs > 0 ? '+' : deltaMs < 0 ? '−' : '';
  const abs = Math.abs(deltaMs);
  if (abs < 1000) return `${sign}${abs}ms`;
  const s = Math.round(abs / 1000);
  if (s < 60) return `${sign}${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${sign}${m}m ${rs}s`;
}

function providerModelLine(summary: PinFlowRunSummary | undefined): string {
  const provider = summary?.provider?.trim();
  const model = summary?.model?.trim();
  if (provider && model) return `${provider} · ${model}`;
  return provider || model || '—';
}

@customElement('pinflow-compare-panel')
export class PinflowComparePanel extends LitElement {
  @property({ attribute: false }) left: PinFlowRunEvidence | null = null;
  @property({ attribute: false }) right: PinFlowRunEvidence | null = null;

  static styles = css`
    :host {
      display: block;
      padding: 8px 12px 12px;
    }
    .panel {
      background: var(--pf-card-surface);
      border: 1px solid var(--pf-border);
      border-radius: 4px;
      overflow: hidden;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text);
    }
    .columns {
      display: grid;
      grid-template-columns: 1fr 1px 1fr;
    }
    .divider {
      background: var(--pf-border);
    }
    .col {
      padding: 10px 12px;
      min-width: 0;
    }
    .col-header {
      font-size: 11px;
      color: var(--pf-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 2px 10px;
      margin-bottom: 8px;
    }
    .meta-grid dt {
      color: var(--pf-text-muted);
      font-size: 10px;
    }
    .meta-grid dd {
      margin: 0;
      color: var(--pf-text);
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .files-header {
      font-size: 10px;
      color: var(--pf-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 4px 0 4px;
    }
    ul.files {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li.file {
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 11px;
      padding: 1px 0;
      color: var(--pf-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .more {
      font-size: 10px;
      color: var(--pf-text-muted);
      padding: 2px 0;
    }
    .delta {
      border-top: 1px solid var(--pf-border);
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 8px 12px;
      background: var(--pf-bg-elevated);
    }
    .delta-item {
      font-size: 11px;
      color: var(--pf-text);
      font-variant-numeric: tabular-nums;
    }
    .delta-item .label {
      color: var(--pf-text-muted);
      margin-right: 4px;
    }
    .delta-item.positive .value { color: var(--pf-status-failed); }
    .delta-item.negative .value { color: var(--pf-status-done); }
    .shared-files {
      padding: 0 12px 10px;
      background: var(--pf-bg-elevated);
    }
    .shared-files ul {
      list-style: none;
      padding: 0;
      margin: 4px 0 0;
    }
    .shared-files li {
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 11px;
      color: var(--pf-text);
      padding: 1px 0;
    }
  `;

  override render() {
    if (!this.left || !this.right) return null;
    return html`
      <div class="panel">
        <div class="columns">
          ${this.renderColumn(this.left)}
          <div class="divider" aria-hidden="true"></div>
          ${this.renderColumn(this.right)}
        </div>
        ${this.renderDelta()}
      </div>
    `;
  }

  private renderColumn(run: PinFlowRunEvidence) {
    const summary = run.summary;
    const files = run.changedFiles ?? [];
    const visibleFiles = files.slice(0, MAX_VISIBLE_FILES);
    const overflow = files.length - visibleFiles.length;
    return html`
      <div class="col">
        <div class="col-header">${providerModelLine(summary)}</div>
        <dl class="meta-grid">
          <dt>Started</dt>
          <dd>${formatStarted(summary?.startedAt)}</dd>
          <dt>Duration</dt>
          <dd>${formatDuration(durationMsOf(summary))}</dd>
          <dt>Tokens</dt>
          <dd>${formatTokens(summary?.totalTokens)}</dd>
          <dt>Cost</dt>
          <dd>${formatCost(summary?.costUsd)}</dd>
          <dt>Files changed</dt>
          <dd>${files.length}</dd>
        </dl>
        <div class="files-block">
          ${files.length > 0
            ? html`
                <div class="files-header">Files</div>
                <ul class="files">
                  ${repeat(
                    visibleFiles,
                    (f) => f.path,
                    (f) => html`<li class="file" title=${f.path}>${f.path}</li>`,
                  )}
                </ul>
                <div class="more-slot">
                  ${overflow > 0 ? html`<div class="more">+${overflow} more</div>` : null}
                </div>
              `
            : null}
        </div>
      </div>
    `;
  }

  private renderDelta() {
    const left = this.left;
    const right = this.right;
    if (!left || !right) return null;

    const leftCost = left.summary?.costUsd;
    const rightCost = right.summary?.costUsd;
    const costDelta =
      typeof leftCost === 'number' && typeof rightCost === 'number'
        ? rightCost - leftCost
        : undefined;

    const leftTokens = left.summary?.totalTokens;
    const rightTokens = right.summary?.totalTokens;
    const tokenDelta =
      typeof leftTokens === 'number' && typeof rightTokens === 'number'
        ? rightTokens - leftTokens
        : undefined;

    const leftDuration = durationMsOf(left.summary);
    const rightDuration = durationMsOf(right.summary);
    const durationDelta =
      leftDuration !== undefined && rightDuration !== undefined
        ? rightDuration - leftDuration
        : undefined;

    const leftPaths = new Set((left.changedFiles ?? []).map((f) => f.path));
    const sharedPaths = (right.changedFiles ?? [])
      .map((f) => f.path)
      .filter((p) => leftPaths.has(p));

    return html`
      <div class="delta">
        ${this.renderDeltaItem('Cost', costDelta, formatSignedCurrency)}
        ${this.renderDeltaItem('Tokens', tokenDelta, formatSignedTokens)}
        ${this.renderDeltaItem('Duration', durationDelta, formatSignedDuration)}
        <div class="delta-item">
          <span class="label">Both touched:</span>
          <span class="value">${sharedPaths.length} file${sharedPaths.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div class="shared-slot">
        ${sharedPaths.length > 0
          ? html`
              <div class="shared-files">
                <ul>
                  ${repeat(
                    sharedPaths,
                    (p) => p,
                    (p) => html`<li title=${p}>${p}</li>`,
                  )}
                </ul>
              </div>
            `
          : null}
      </div>
    `;
  }

  private renderDeltaItem(
    label: string,
    delta: number | undefined,
    format: (value: number) => string,
  ) {
    if (delta === undefined) {
      return html`
        <div class="delta-item">
          <span class="label">${label}:</span>
          <span class="value">—</span>
        </div>
      `;
    }
    const cls = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    return html`
      <div class=${`delta-item ${cls}`}>
        <span class="label">${label}:</span>
        <span class="value">${format(delta)}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-compare-panel': PinflowComparePanel;
  }
}
