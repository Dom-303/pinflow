import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('pinflow-empty-state')
export class PinflowEmptyState extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: var(--pf-text-muted);
      font-family: var(--vscode-font-family);
      font-size: 12px;
      line-height: 1.6;
    }
    .accent {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--pf-accent);
      opacity: 0.6;
      margin-bottom: 16px;
    }
    .body {
      max-width: 240px;
    }
  `;

  render() {
    return html`
      <div class="accent" aria-hidden="true"></div>
      <div class="body">
        Noch keine Runs.
        <br />Workflow aus der Actions-Ansicht starten.
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-empty-state': PinflowEmptyState;
  }
}
