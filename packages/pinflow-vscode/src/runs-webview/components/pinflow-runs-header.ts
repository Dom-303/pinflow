import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const MAX_SELECTED = 2;

@customElement('pinflow-runs-header')
export class PinflowRunsHeader extends LitElement {
  @property({ type: Number }) count = 0;
  @property({ type: Boolean, attribute: false }) compareMode = false;
  @property({ type: Number, attribute: false }) selectedCount = 0;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px 4px;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .count {
      flex: 1;
    }
    .selected {
      color: var(--pf-text);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0;
      text-transform: none;
    }
    button {
      background: transparent;
      color: var(--pf-text-muted);
      border: 1px solid var(--pf-border);
      border-radius: 3px;
      padding: 2px 8px;
      font-family: inherit;
      font-size: 11px;
      letter-spacing: 0;
      text-transform: none;
      cursor: pointer;
    }
    button:hover {
      background: var(--pf-bg-elevated);
      color: var(--pf-text);
    }
    button[aria-pressed='true'] {
      background: var(--pf-accent);
      color: var(--vscode-button-foreground, #fff);
      border-color: var(--pf-accent);
    }
  `;

  override render() {
    const onToggle = () => this.dispatchEvent(
      new CustomEvent('pinflow-compare-mode-toggle', { bubbles: true, composed: true }),
    );
    const onClear = () => this.dispatchEvent(
      new CustomEvent('pinflow-compare-clear', { bubbles: true, composed: true }),
    );
    const showSelectedBlock = this.compareMode && this.selectedCount > 0;
    return html`
      <span class="count">${this.count} run${this.count === 1 ? '' : 's'}</span>
      <span class="selected-slot">
        ${showSelectedBlock
          ? html`<span class="selected">${this.selectedCount}/${MAX_SELECTED} selected</span>
              <button type="button" @click=${onClear}>Clear</button>`
          : null}
      </span>
      <button
        type="button"
        aria-pressed=${this.compareMode ? 'true' : 'false'}
        @click=${onToggle}
      >
        Compare
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-runs-header': PinflowRunsHeader;
  }
}
