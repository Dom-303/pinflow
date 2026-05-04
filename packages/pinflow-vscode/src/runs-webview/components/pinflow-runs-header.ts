import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('pinflow-runs-header')
export class PinflowRunsHeader extends LitElement {
  @property({ type: Number }) count = 0;

  static styles = css`
    :host {
      display: block;
      padding: 8px 14px 4px;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  `;

  render() {
    return html`<span>${this.count} run${this.count === 1 ? '' : 's'}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-runs-header': PinflowRunsHeader;
  }
}
