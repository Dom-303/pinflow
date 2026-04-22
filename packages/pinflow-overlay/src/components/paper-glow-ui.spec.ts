/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html, render } from 'lit';

const mockStore = {
  setMode: vi.fn(),
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
  setDispatchSessionOverrides: vi.fn(),
  updateDispatchProjectDefaults: vi.fn(),
  clearDispatchSessionOverrides: vi.fn(),
  toggleDispatchPaused: vi.fn(),
  releaseNextDispatchBatch: vi.fn(),
  enterCaptureMode: vi.fn(),
  submitAnnotation: vi.fn().mockResolvedValue(undefined),
};

const mockState = {
  selectedElement: null as null | { tagName: string },
  annotations: [] as Array<{ id: string; metadata?: { status?: string } }>,
  dispatchBatches: [] as Array<{
    id: string;
    channel: string;
    annotationIds: string[];
    status: string;
    queuedCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
  }>,
  relayConnected: false,
  mode: 'expanded',
  theme: 'light' as const,
  tabOffsetY: 50,
  dispatchProjectDefaults: {
    channel: 'codex' as const,
    mode: 'manual' as const,
    threshold: 3,
    concurrency: 3,
    continuation: 'automatic' as const,
  },
  dispatchSession: {
    overrides: {},
    paused: false,
    releasedAnnotationIds: [],
    awaitingConfirmationIds: [],
    flowActive: false,
  },
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

import './ds-header.js';
import './ds-sidebar.js';
import './ds-annotation-input.js';

describe('Paper Glow UI contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockState.selectedElement = null;
    mockState.annotations = [];
    mockState.dispatchBatches = [];
    mockState.relayConnected = false;
    mockState.mode = 'expanded';
    mockState.theme = 'light';
    mockState.dispatchProjectDefaults = {
      channel: 'codex',
      mode: 'manual',
      threshold: 3,
      concurrency: 3,
      continuation: 'automatic',
    };
    mockState.dispatchSession = {
      overrides: {},
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
    };
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
    expect(header.scrolled).toBe(false);
    expect(closeButton).not.toBeNull();
    expect(closeButton?.querySelector('svg path')).not.toBeNull();
  });

  it('renders German-first annotation input copy', async () => {
    expect(customElements.get('ds-annotation-input')).toBeDefined();

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
    mockState.dispatchBatches = [
      {
        id: 'batch-1',
        channel: 'codex',
        annotationIds: ['note-1', 'note-2'],
        status: 'running',
        queuedCount: 1,
        processingCount: 1,
        completedCount: 0,
        failedCount: 0,
      },
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

    const workflowPanel = sidebar.shadowRoot.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    expect(sidebar.shadowRoot.textContent).toContain('Anmerkungen (2)');
    expect(sidebar.shadowRoot.textContent).toContain('Verbunden');
    expect(sidebar.shadowRoot.querySelector('.status-dot.connected')).not.toBeNull();
    expect(sidebar.shadowRoot.querySelector('ds-annotation-input')).not.toBeNull();
    expect(workflowPanel.shadowRoot.textContent).toContain('Queue und Versand');
    expect(workflowPanel.shadowRoot.textContent).toContain('Codex');
    expect(workflowPanel.shadowRoot.textContent).toContain('Letzte Batches');
    expect(workflowPanel.shadowRoot.textContent).toContain('running');

    const darkToggle = sidebar.shadowRoot.querySelector(
      'button[aria-label="Dunkelmodus aktivieren"]',
    ) as HTMLButtonElement;
    darkToggle.click();
    expect(mockStore.setTheme).toHaveBeenCalledWith('dark');

    const claudeButton = workflowPanel.shadowRoot.querySelector(
      'button[aria-label="Kanal Claude fuer diese Session aktivieren"]',
    ) as HTMLButtonElement;
    claudeButton.click();
    expect(mockStore.setDispatchSessionOverrides).toHaveBeenCalledWith({
      channel: 'claude',
    });

    const releaseButton = workflowPanel.shadowRoot.querySelector(
      '.dispatch-btn',
    ) as HTMLButtonElement;
    expect(releaseButton.textContent).toContain('Naechsten Batch senden');
    releaseButton.click();
    expect(mockStore.releaseNextDispatchBatch).toHaveBeenCalledTimes(1);
  });
});
