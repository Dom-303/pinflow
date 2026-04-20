/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html, render } from 'lit';

vi.mock('../core/store-controller.js', () => ({
  StoreController: class {
    store = {
      setMode: vi.fn(),
      enterCaptureMode: vi.fn(),
      submitAnnotation: vi.fn().mockResolvedValue(undefined),
    };

    state = {
      selectedElement: null,
      annotations: [],
      relayConnected: false,
      mode: 'expanded',
      tabOffsetY: 50,
    };
  },
}));

vi.mock('../core/event-manager.js', () => ({
  EventManager: {
    getInstance: () => ({
      enableCapture: vi.fn(),
    }),
  },
}));

import './ds-header.js';
import './ds-annotation-input.js';
import './ds-sidebar.js';

describe('Paper Glow UI contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders PinFlow branding in the header', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-header></ds-header>`, host);

    const header = host.querySelector('ds-header') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await header.updateComplete;

    expect(header.shadowRoot.textContent).toContain('PinFlow');
    expect(header.shadowRoot.querySelector('button')?.getAttribute('title')).toContain(
      'Schliessen',
    );
  });

  it('renders German-first annotation input copy', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await input.updateComplete;

    const textarea = input.shadowRoot.querySelector('textarea');

    expect(textarea?.getAttribute('placeholder')).toBe(
      'Verbinde mit Relay...',
    );
  });
});
