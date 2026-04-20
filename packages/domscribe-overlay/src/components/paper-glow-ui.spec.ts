/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html, render } from 'lit';

const mockStore = {
  setMode: vi.fn(),
  enterCaptureMode: vi.fn(),
  submitAnnotation: vi.fn().mockResolvedValue(undefined),
};

const mockState = {
  selectedElement: null as null | { tagName: string },
  annotations: [] as Array<{ id: string; metadata?: { status?: string } }>,
  relayConnected: false,
  mode: 'expanded',
  tabOffsetY: 50,
};

const enableCapture = vi.fn();

vi.mock('../core/store-controller.js', () => ({
  StoreController: class {
    store = mockStore;
    state = mockState;
  },
}));

vi.mock('../core/event-manager.js', () => ({
  EventManager: {
    getInstance: () => ({
      enableCapture,
    }),
  },
}));

import { DsHeader } from './ds-header.js';
import { DsSidebar } from './ds-sidebar.js';

const getCssText = (styles: unknown): string =>
  (Array.isArray(styles) ? styles : [styles])
    .flatMap((style) => (Array.isArray(style) ? style : [style]))
    .map((style) =>
      typeof style === 'object' &&
      style !== null &&
      'cssText' in style &&
      typeof style.cssText === 'string'
        ? style.cssText
        : String(style),
    )
    .join('\n');

describe('Paper Glow UI contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockState.selectedElement = null;
    mockState.annotations = [];
    mockState.relayConnected = false;
    mockState.mode = 'expanded';
    vi.clearAllMocks();
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

    const brand = header.shadowRoot.querySelector('.brand-name');
    const closeButton = header.shadowRoot.querySelector(
      'button[aria-label="Seitenleiste schliessen"]',
    );

    expect(brand?.textContent).toBe('PinFlow');
    expect(closeButton).not.toBeNull();
    expect(closeButton?.querySelector('svg path')).not.toBeNull();
    expect(getCssText(DsHeader.styles)).toContain(
      'background: rgba(255, 251, 244, 0.84);',
    );
    expect(getCssText(DsHeader.styles)).toContain('backdrop-filter: blur(12px);');
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
    const captureButton = input.shadowRoot.querySelector(
      'button[aria-label="Element markieren"]',
    ) as HTMLButtonElement;

    expect(textarea?.getAttribute('placeholder')).toBe(
      'Verbinde mit Relay...',
    );
    captureButton.click();
    expect(enableCapture).toHaveBeenCalledTimes(1);
    expect(mockStore.enterCaptureMode).toHaveBeenCalledTimes(1);
  });

  it('renders the sidebar shell from deterministic store state', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { status: 'queued' } },
      { id: 'note-2', metadata: { status: 'processed' } },
    ];
    mockState.relayConnected = true;

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-sidebar></ds-sidebar>`, host);

    const sidebar = host.querySelector('ds-sidebar') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await sidebar.updateComplete;

    expect(sidebar.shadowRoot.textContent).toContain('Anmerkungen (2)');
    expect(sidebar.shadowRoot.textContent).toContain('Verbunden');
    expect(getCssText(DsSidebar.styles)).toContain('circle at top right');
    expect(getCssText(DsSidebar.styles)).toContain('border-radius: 24px;');
  });
});
