/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html, render } from 'lit';

const mockStore = {
  setMode: vi.fn(),
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
  clearSelection: vi.fn(),
  setHoveredElement: vi.fn(),
  exitCaptureMode: vi.fn(),
  selectElement: vi.fn().mockResolvedValue(undefined),
  selectElementForInlineComment: vi.fn().mockResolvedValue(undefined),
  selectRegion: vi.fn().mockResolvedValue(undefined),
  selectRegionForInlineComment: vi.fn().mockResolvedValue(undefined),
  selectMultipleElements: vi.fn().mockResolvedValue(undefined),
  selectMultipleElementsForInlineComment: vi.fn().mockResolvedValue(undefined),
  setPickerMode: vi.fn(),
  setCommentEntryMode: vi.fn(),
  setDispatchSessionOverrides: vi.fn(),
  updateDispatchProjectDefaults: vi.fn(),
  clearDispatchSessionOverrides: vi.fn(),
  toggleDispatchPaused: vi.fn(),
  releaseNextDispatchBatch: vi.fn(),
  enterCaptureMode: vi.fn(),
  submitAnnotation: vi.fn().mockResolvedValue(undefined),
  undoLastAction: vi.fn().mockResolvedValue({ ok: true }),
};

const mockState = {
  selectedElement: null as null | { tagName: string },
  selectedElements: [] as Array<{ tagName: string }>,
  selectedRegion: null as null | {
    rect: { width: number; height: number };
    elements: Array<{ tagName: string }>;
  },
  pickerMode: 'element' as 'element' | 'region' | 'multi',
  commentEntryMode: 'workspace' as 'workspace' | 'inline',
  inlineCommentDraft: null as null | {
    position: { x: number; y: number };
    anchorRect: {
      x: number;
      y: number;
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
    pickerMode: 'element' | 'region' | 'multi';
  },
  annotations: [] as Array<{ id: string; metadata?: { status?: string } }>,
  dispatchBatches: [] as Array<{
    id: string;
    channel: string;
    annotationIds: string[];
    releasedAt: string;
    status: string;
    queuedCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
  }>,
  undoStack: [] as Array<{
    id: string;
    kind: string;
    label: string;
    description: string;
    timestamp: string;
  }>,
  relayConnected: false,
  mode: 'expanded',
  theme: 'light' as const,
  tabOffsetY: 50,
  runtimeContext: null as null | {
    componentProps?: Record<string, unknown>;
    componentState?: Record<string, unknown>;
  },
  manifestEntry: null as null | {
    id: string;
    file: string;
    start: { line: number | null; column: number | null };
  },
  dispatchProjectDefaults: {
    channel: 'auto' as const,
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
    lastDispatchError: null as string | null,
  },
};

const enableCapture = vi.fn();
const disableCapture = vi.fn();

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
      disableCapture,
    }),
  },
}));

import './ds-header.js';
import './ds-sidebar.js';
import './ds-annotation-input.js';
import './ds-element-preview.js';
import './ds-picker-overlay.js';
import './ds-tab.js';
import './ds-session-settings.js';
import './ds-workflow-panel.js';
import './ds-annotation-list.js';

async function openSettingsOverlay(
  sidebar: HTMLElement & {
    shadowRoot: ShadowRoot;
    updateComplete: Promise<unknown>;
  },
) {
  const header = sidebar.shadowRoot.querySelector(
    'ds-header',
  ) as HTMLElement & {
    shadowRoot: ShadowRoot;
    updateComplete: Promise<unknown>;
  };
  await header.updateComplete;

  const settingsButton = header.shadowRoot.querySelector(
    'button[aria-label="Einstellungen oeffnen"]',
  ) as HTMLButtonElement;
  settingsButton.click();
  await sidebar.updateComplete;

  const settingsOverlay = sidebar.shadowRoot.querySelector(
    'ds-settings-overlay',
  ) as HTMLElement & {
    shadowRoot: ShadowRoot;
    updateComplete: Promise<unknown>;
  };

  await settingsOverlay.updateComplete;
  return settingsOverlay;
}

describe('Paper Glow UI contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockState.selectedElement = null;
    mockState.selectedElements = [];
    mockState.selectedRegion = null;
    mockState.pickerMode = 'element';
    mockState.commentEntryMode = 'workspace';
    mockState.inlineCommentDraft = null;
    mockState.annotations = [];
    mockState.dispatchBatches = [];
    mockState.undoStack = [];
    mockState.relayConnected = false;
    mockState.mode = 'expanded';
    mockState.theme = 'light';
    mockState.runtimeContext = null;
    mockState.manifestEntry = null;
    mockState.dispatchProjectDefaults = {
      channel: 'auto',
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
      lastDispatchError: null,
    };
    vi.clearAllMocks();
  });

  it('renders PinFlow branding in the header', async () => {
    mockState.relayConnected = true;

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-header></ds-header>`, host);

    const header = host.querySelector('ds-header') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await header.updateComplete;

    const brandWordmark = header.shadowRoot.querySelector(
      '.brand-wordmark',
    ) as HTMLElement | null;
    const settingsButton = header.shadowRoot.querySelector(
      'button[aria-label="Einstellungen oeffnen"]',
    ) as HTMLButtonElement | null;
    const themeButton = header.shadowRoot.querySelector(
      'button[aria-label="Darstellung wechseln"]',
    ) as HTMLButtonElement | null;
    const minimizeButton = header.shadowRoot.querySelector(
      'button[aria-label="Arbeitsbereich minimieren"]',
    ) as HTMLButtonElement | null;
    const closeButton = header.shadowRoot.querySelector(
      'button[aria-label="Seitenleiste schliessen"]',
    );
    const brandIcon = header.shadowRoot.querySelector(
      '.brand-logo-img',
    ) as HTMLImageElement | null;

    expect(brandWordmark).not.toBeNull();
    expect(brandWordmark?.textContent).toBe('PinFlow');
    expect(brandIcon).not.toBeNull();
    expect(brandIcon?.getAttribute('src')).toContain('pinflow-icon-light');
    expect(header.shadowRoot.textContent).not.toContain('Arbeitsbereich');
    expect(header.shadowRoot.textContent).toContain('aktiv');
    expect(header.shadowRoot.textContent).not.toContain('Session aktiv');
    expect(header.shadowRoot.textContent).not.toContain('Auswahl, Kommentare');
    expect(
      header.shadowRoot.querySelector('.brand-status.active'),
    ).not.toBeNull();
    expect(header.scrolled).toBe(false);
    expect(settingsButton).not.toBeNull();
    expect(minimizeButton).not.toBeNull();
    expect(themeButton).not.toBeNull();
    expect(closeButton).not.toBeNull();
    expect(closeButton?.querySelector('svg path')).not.toBeNull();
    let minimizeEventCount = 0;
    header.addEventListener('minimize-sidebar', () => {
      minimizeEventCount += 1;
    });
    minimizeButton?.click();
    expect(minimizeEventCount).toBe(1);
    themeButton?.click();
    expect(mockStore.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('keeps composer controls icon-only and confirms undo before running it', async () => {
    mockState.relayConnected = true;
    mockState.selectedElement = { tagName: 'button' };
    mockState.undoStack = [
      {
        id: 'undo-1',
        kind: 'selection',
        label: 'Auswahl rueckgaengig',
        description: 'Setzt die letzte Auswahl zurueck.',
        timestamp: new Date('2026-04-25T10:00:00.000Z').toISOString(),
      },
    ];

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await input.updateComplete;

    const controlButtons = Array.from(
      input.shadowRoot.querySelectorAll<HTMLButtonElement>(
        '.action-group:first-child > button, .action-group:first-child .menu-wrap > button, .action-group:first-child .picker-menu-wrap > button, .action-group:first-child .undo-wrap > button',
      ),
    );

    expect(controlButtons).toHaveLength(4);
    for (const button of controlButtons) {
      expect(button.textContent?.trim()).toBe('');
    }

    const undoButton = input.shadowRoot.querySelector(
      'button[aria-label="Letzte Aktion rueckgaengig machen"]',
    ) as HTMLButtonElement;
    const undoPaths = Array.from(undoButton.querySelectorAll('svg path')).map(
      (path) => path.getAttribute('d'),
    );
    const pickerModeIcon = input.shadowRoot.querySelector(
      '.mode-switch-icon',
    ) as SVGElement | null;
    const firstActionIcon = input.shadowRoot.querySelector(
      '.action-btn svg',
    ) as SVGElement | null;

    expect(undoButton.disabled).toBe(false);
    expect(undoPaths).toContain('M9 14 4 9l5-5');
    expect(undoPaths).toContain('M4 9h10.5a5.5 5.5 0 1 1 0 11H11');
    expect(pickerModeIcon).not.toBeNull();
    expect(pickerModeIcon?.getAttribute('data-mode')).toBe('element');
    expect(getComputedStyle(firstActionIcon as Element).width).toBe('18px');

    undoButton.click();
    await input.updateComplete;

    expect(input.shadowRoot.textContent).toContain(
      'Wirklich rueckgaengig machen?',
    );
    expect(mockStore.undoLastAction).not.toHaveBeenCalled();

    const confirmButton = input.shadowRoot.querySelector(
      'button[data-testid="confirm-undo"]',
    ) as HTMLButtonElement;
    confirmButton.click();
    await input.updateComplete;

    expect(mockStore.undoLastAction).toHaveBeenCalledTimes(1);
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
      'button[aria-label="Auswahl markieren"]',
    ) as HTMLButtonElement;
    const agentButton = input.shadowRoot.querySelector(
      'button[aria-label="Weitergabe waehlen"]',
    ) as HTMLButtonElement;
    const submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(textarea?.getAttribute('placeholder')).toBe('Relay verbinden ...');
    expect(input.shadowRoot.textContent).not.toContain('Kommentar und Auftrag');
    expect(input.shadowRoot.textContent).not.toContain('Auswahl Kein Element');
    expect(input.shadowRoot.textContent).not.toContain('Flow Codex');
    expect(input.shadowRoot.textContent).not.toContain('Strg+Enter');
    expect(input.shadowRoot.textContent).not.toContain(
      'Element waehlen und Aenderung schreiben.',
    );
    expect(agentButton).not.toBeNull();
    expect(agentButton.textContent?.replace(/\s+/g, ' ').trim()).toBe('');
    expect(agentButton.getAttribute('title')).toContain('Aktueller Agent');
    expect(
      input.shadowRoot.querySelector(
        'button[aria-label="Einstellungen oeffnen"]',
      ),
    ).toBeNull();
    expect(submitButton).not.toBeNull();
    agentButton.click();
    await input.updateComplete;
    const menuPanel = input.shadowRoot.querySelector(
      '.menu-panel',
    ) as HTMLElement;
    const fallbackGroup = input.shadowRoot.querySelector(
      '.fallback-group',
    ) as HTMLDetailsElement;
    const menuText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(menuPanel).not.toBeNull();
    expect(getComputedStyle(menuPanel).zIndex).toBe('20');
    expect(fallbackGroup).not.toBeNull();
    expect(fallbackGroup.hasAttribute('open')).toBe(false);
    expect(menuText).toContain('Weitergabe');
    expect(menuText).toContain('Aktueller Agent');
    expect(menuText).toContain('Codex');
    expect(menuText).toContain('Claude');
    expect(menuText).toContain('Nur sammeln');
    captureButton.click();
    expect(mockStore.enterCaptureMode).toHaveBeenCalledTimes(1);
    expect(mockStore.enterCaptureMode).toHaveBeenCalledWith('element');

    const pickerModeButton = input.shadowRoot.querySelector(
      'button[aria-label="Picker-Modus waehlen"]',
    ) as HTMLButtonElement;
    expect(pickerModeButton).not.toBeNull();
    pickerModeButton.click();
    await input.updateComplete;

    const pickerMenuText =
      input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(pickerMenuText).toContain('Picker-Modus');
    expect(pickerMenuText).toContain('Element');
    expect(pickerMenuText).toContain('Bereich');
    expect(pickerMenuText).toContain('Mehrfach');
  });

  it('renders guided composer states for offline, selection and ready-to-send moments', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await input.updateComplete;

    let inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    let submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Relay offline');
    expect(submitButton.disabled).toBe(true);

    mockState.relayConnected = true;
    input.requestUpdate();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Element waehlen');
    expect(submitButton.disabled).toBe(true);

    mockState.mode = 'capturing';
    input.requestUpdate();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Picker aktiv');
    expect(submitButton.disabled).toBe(true);

    mockState.mode = 'expanded';
    mockState.selectedElement = document.createElement('button');
    input.requestUpdate();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(inputText).toContain('Element markiert');

    const textarea = input.shadowRoot.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    textarea.value = 'CTA klarer formulieren';
    textarea.dispatchEvent(new Event('input'));
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Bereit');
    expect(submitButton.disabled).toBe(false);
  });

  it('renders a visible picker highlight and selection flow', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const target = document.createElement('button');
    target.setAttribute('data-ds', 'entry-42');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 20,
          left: 30,
          width: 120,
          height: 42,
        }) as DOMRect,
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => target),
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);

    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await picker.updateComplete;

    const pickerText =
      picker.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(pickerText).toContain('ESC zum Beenden');
    expect(pickerText).not.toContain('Markiere jetzt dein Zielelement');
    expect(pickerText).not.toContain(
      'Der helle Rahmen zeigt dir immer das aktuell getroffene Element.',
    );
    expect(pickerText).toContain('ESC');

    const pickerNotice = picker.shadowRoot.querySelector('.picker-toast');
    expect(pickerNotice).not.toBeNull();

    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 40,
        clientY: 30,
      }),
    );
    await picker.updateComplete;

    expect(mockStore.setHoveredElement).toHaveBeenCalledWith(target);
    expect(picker.shadowRoot.querySelector('ds-highlight-box')).not.toBeNull();

    window.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 40,
        clientY: 30,
      }),
    );
    expect(mockStore.selectElement).toHaveBeenCalledWith(target);
  });

  it('opens the inline comment flow from picker selection when enabled', async () => {
    mockState.commentEntryMode = 'inline';
    const host = document.createElement('div');
    document.body.appendChild(host);

    const target = document.createElement('button');
    target.setAttribute('data-ds', 'entry-inline');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 40,
          left: 50,
          width: 150,
          height: 44,
        }) as DOMRect,
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => target),
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);

    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await picker.updateComplete;

    window.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 66,
        clientY: 74,
      }),
    );

    expect(mockStore.selectElement).not.toHaveBeenCalled();
    expect(mockStore.selectElementForInlineComment).toHaveBeenCalledWith(
      target,
      {
        x: 66,
        y: 74,
      },
    );
  });

  it('keeps the selected inline comment target locked while the composer is open', async () => {
    mockState.commentEntryMode = 'inline';
    mockState.inlineCommentDraft = {
      position: { x: 66, y: 74 },
      anchorRect: {
        x: 50,
        y: 40,
        top: 40,
        left: 50,
        right: 200,
        bottom: 84,
        width: 150,
        height: 44,
      },
      pickerMode: 'element',
    };

    const host = document.createElement('div');
    document.body.appendChild(host);

    const target = document.createElement('button');
    target.setAttribute('data-ds', 'entry-inline-next');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 90,
          left: 80,
          width: 120,
          height: 42,
        }) as DOMRect,
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => target),
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);

    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await picker.updateComplete;
    vi.clearAllMocks();

    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 90,
        clientY: 100,
      }),
    );
    await picker.updateComplete;

    expect(mockStore.setHoveredElement).toHaveBeenCalledWith(null);
    expect(mockStore.setHoveredElement).not.toHaveBeenCalledWith(target);

    window.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 90,
        clientY: 100,
      }),
    );

    expect(mockStore.selectElement).not.toHaveBeenCalled();
    expect(mockStore.selectElementForInlineComment).not.toHaveBeenCalled();
  });

  it('ignores PinFlow overlay hosts while hit-testing picker targets', async () => {
    const host = document.createElement('div');
    const blockingOverlay = document.createElement('ds-overlay');
    const target = document.createElement('button');
    document.body.append(blockingOverlay, host);

    target.setAttribute('data-ds', 'entry-73');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 80,
          left: 90,
          width: 160,
          height: 48,
        }) as DOMRect,
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() =>
        blockingOverlay.style.pointerEvents === 'none'
          ? target
          : blockingOverlay,
      ),
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);

    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await picker.updateComplete;

    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    await picker.updateComplete;

    expect(mockStore.setHoveredElement).toHaveBeenCalledWith(target);
    expect(picker.shadowRoot.querySelector('ds-highlight-box')).not.toBeNull();
  });

  it('captures a dragged region with intersecting elements', async () => {
    mockState.pickerMode = 'region';
    const host = document.createElement('div');
    const target = document.createElement('section');
    target.setAttribute('data-ds', 'entry-region');
    document.body.append(target, host);

    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 30,
          y: 30,
          top: 30,
          left: 30,
          right: 150,
          bottom: 90,
          width: 120,
          height: 60,
        }) as DOMRect,
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);

    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await picker.updateComplete;
    expect(picker.shadowRoot.querySelector('.overlay.region')).not.toBeNull();

    window.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 180,
        clientY: 120,
      }),
    );
    await picker.updateComplete;
    expect(picker.shadowRoot.querySelector('.region-box')).not.toBeNull();

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 180,
        clientY: 120,
      }),
    );

    expect(mockStore.selectRegion).not.toHaveBeenCalled();
    expect(picker.shadowRoot.textContent?.replace(/\s+/g, ' ')).toContain(
      '160 x 100 px',
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(mockStore.selectRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        left: 20,
        top: 20,
        width: 160,
        height: 100,
      }),
      expect.arrayContaining([target]),
    );
  });

  it('moves an existing picker region instead of starting a new one', async () => {
    mockState.pickerMode = 'region';
    const host = document.createElement('div');
    document.body.appendChild(host);

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);

    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await picker.updateComplete;

    window.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 180,
        clientY: 120,
      }),
    );
    await picker.updateComplete;

    const regionBox = picker.shadowRoot.querySelector(
      '.region-box',
    ) as HTMLElement;
    regionBox.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        clientX: 80,
        clientY: 70,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 110,
        clientY: 90,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 110,
        clientY: 90,
      }),
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(mockStore.selectRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        left: 50,
        top: 40,
        width: 160,
        height: 100,
      }),
      expect.any(Array),
    );
  });

  it('collects multiple picker elements and confirms with Enter', async () => {
    mockState.pickerMode = 'multi';
    const host = document.createElement('div');
    document.body.appendChild(host);

    const first = document.createElement('button');
    const second = document.createElement('a');
    let pointTarget: HTMLElement = first;

    Object.defineProperty(first, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 20,
          y: 20,
          top: 20,
          left: 20,
          right: 90,
          bottom: 50,
          width: 70,
          height: 30,
        }) as DOMRect,
    });
    Object.defineProperty(second, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 100,
          y: 20,
          top: 20,
          left: 100,
          right: 170,
          bottom: 50,
          width: 70,
          height: 30,
        }) as DOMRect,
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => pointTarget),
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);
    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await picker.updateComplete;

    window.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 30, clientY: 30 }),
    );
    pointTarget = second;
    window.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 110, clientY: 30 }),
    );
    await picker.updateComplete;

    expect(picker.shadowRoot.textContent?.replace(/\s+/g, ' ')).toContain(
      '2 gewaehlt',
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(mockStore.selectMultipleElements).toHaveBeenCalledWith([
      first,
      second,
    ]);
  });

  it('confirms multi picker selections from the overlay action button', async () => {
    mockState.pickerMode = 'multi';
    const host = document.createElement('div');
    document.body.appendChild(host);

    const target = document.createElement('button');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 20,
          y: 20,
          top: 20,
          left: 20,
          right: 90,
          bottom: 50,
          width: 70,
          height: 30,
        }) as DOMRect,
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => target),
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);
    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await picker.updateComplete;

    window.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 30, clientY: 30 }),
    );
    await picker.updateComplete;

    const confirmButton = Array.from(
      picker.shadowRoot.querySelectorAll<HTMLButtonElement>('.picker-action'),
    ).find((button) => button.textContent?.includes('Uebernehmen'));
    confirmButton?.click();

    expect(mockStore.selectMultipleElements).toHaveBeenCalledWith([target]);
  });

  it('renders composer feedback after submit success and failure', async () => {
    mockState.relayConnected = true;
    mockState.selectedElement = document.createElement('button');

    const host = document.createElement('div');
    document.body.appendChild(host);

    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await input.updateComplete;

    const textarea = input.shadowRoot.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    let submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    textarea.value = 'Headline praeziser machen';
    textarea.dispatchEvent(new Event('input'));
    await input.updateComplete;

    submitButton.click();
    await Promise.resolve();
    await input.updateComplete;

    let inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(inputText).toContain('Im Flow');
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    mockStore.submitAnnotation.mockRejectedValueOnce(new Error('boom'));
    textarea.value = 'CTA nachschaerfen';
    textarea.dispatchEvent(new Event('input'));
    await input.updateComplete;

    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    submitButton.click();
    await Promise.resolve();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(inputText).toContain('Senden fehlgeschlagen');
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
  });

  it('renders the collapsed launcher with a visible PinFlow mark', async () => {
    mockState.mode = 'collapsed';
    mockState.theme = 'dark';

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-tab></ds-tab>`, host);

    const tab = host.querySelector('ds-tab') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await tab.updateComplete;

    const brandMark = tab.shadowRoot.querySelector(
      '.tab-mark svg',
    ) as SVGElement | null;
    expect(brandMark).not.toBeNull();
    expect(getComputedStyle(brandMark as Element).width).toBe('52px');
    expect(
      getComputedStyle(tab.shadowRoot.querySelector('.tab-mark') as Element)
        .transform,
    ).toContain('scaleX(-1)');
  });

  it('renders the sidebar shell from deterministic store state', async () => {
    mockState.annotations = [
      {
        id: 'note-1',
        metadata: { id: 'note-1', status: 'processing' },
        context: { userMessage: 'Hero-Text kuerzen' },
      },
      {
        id: 'note-2',
        metadata: { id: 'note-2', status: 'processed' },
        context: { userMessage: 'CTA schaerfen' },
      },
    ];
    mockState.dispatchBatches = [
      {
        id: 'batch-1',
        channel: 'codex',
        annotationIds: ['note-1', 'note-2'],
        releasedAt: '2026-04-23T09:30:00.000Z',
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

    const sidebarText =
      sidebar.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    const workspaceTop = sidebar.shadowRoot.querySelector(
      '.workspace-top',
    ) as HTMLElement | null;
    const composerDock = sidebar.shadowRoot.querySelector(
      '.composer-dock',
    ) as HTMLElement | null;
    const elementPreview = sidebar.shadowRoot.querySelector(
      'ds-element-preview',
    ) as HTMLElement | null;
    const input = sidebar.shadowRoot.querySelector(
      'ds-annotation-input',
    ) as HTMLElement | null;
    const drawers = Array.from(
      sidebar.shadowRoot.querySelectorAll('.context-drawer'),
    ) as HTMLElement[];
    const queueDrawers = Array.from(
      sidebar.shadowRoot.querySelectorAll('.queue-drawer'),
    ) as HTMLElement[];
    const activeRunPanel = sidebar.shadowRoot.querySelector(
      '.active-run-panel',
    ) as HTMLElement | null;
    const resizeHandle = sidebar.shadowRoot.querySelector(
      '.composer-resize-handle',
    ) as HTMLElement | null;

    expect(workspaceTop).not.toBeNull();
    expect(composerDock).not.toBeNull();
    expect(elementPreview).not.toBeNull();
    expect(input).not.toBeNull();
    expect(resizeHandle).not.toBeNull();
    expect(drawers).toHaveLength(1);
    expect(drawers[0].hasAttribute('open')).toBe(false);
    expect(
      drawers[0]
        .querySelector('.context-summary')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('Auswahl');
    expect(queueDrawers).toHaveLength(1);
    expect(queueDrawers[0].hasAttribute('open')).toBe(false);
    expect(
      queueDrawers[0]
        .querySelector('.queue-summary')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('Warteliste');
    expect(sidebar.shadowRoot.querySelector('.active-run-drawer')).toBeNull();
    expect(activeRunPanel).not.toBeNull();
    const activeRunText =
      activeRunPanel?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(activeRunText).toContain('Aktiver Lauf');
    expect(activeRunText).toContain('Hero-Text kuerzen');
    expect(activeRunText).toContain('CTA schaerfen');
    expect(sidebarText).toContain('Auswahl');
    expect(sidebarText).toContain('Warteliste');
    expect(sidebarText).toContain('Aktiver Lauf');
    expect(sidebarText).not.toContain('Verlauf');
    expect(sidebarText).not.toContain('Arbeitsfluss');
    expect(sidebarText).not.toContain('Kommentar und Auftrag');
    expect(
      Boolean(
        workspaceTop.compareDocumentPosition(composerDock) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(activeRunPanel?.parentElement).not.toBe(composerDock);
    expect(workspaceTop?.contains(elementPreview)).toBe(true);
    expect(input.parentElement).toBe(composerDock);

    Object.defineProperty(sidebar, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 0,
          bottom: 760,
          height: 760,
        }) as DOMRect,
    });
    resizeHandle?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientY: 560,
        pointerId: 1,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientY: 500,
        pointerId: 1,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
      }),
    );
    await sidebar.updateComplete;
    expect(
      (sidebar as HTMLElement).style.getPropertyValue('--composer-height'),
    ).toBe('260px');

    const settingsOverlay = await openSettingsOverlay(sidebar);
    const overlayText =
      settingsOverlay.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(overlayText).toContain('Arbeitsbereich anpassen');
    expect(
      settingsOverlay.shadowRoot.querySelector('ds-workflow-panel'),
    ).not.toBeNull();
    expect(
      settingsOverlay.shadowRoot.querySelector('ds-annotation-list'),
    ).not.toBeNull();
    expect(settingsOverlay.shadowRoot.querySelector('.sheet')).not.toBeNull();
  });

  it('renders the mini composer mode with only essential controls', async () => {
    mockState.mode = 'mini';
    mockState.relayConnected = true;

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-sidebar></ds-sidebar>`, host);

    const sidebar = host.querySelector('ds-sidebar') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await sidebar.updateComplete;

    const miniText = sidebar.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const expandButton = sidebar.shadowRoot.querySelector(
      'button[aria-label="Arbeitsbereich oeffnen"]',
    ) as HTMLButtonElement | null;
    const closeButton = sidebar.shadowRoot.querySelector(
      'button[aria-label="Seitenleiste schliessen"]',
    ) as HTMLButtonElement | null;
    const miniLogo = sidebar.shadowRoot.querySelector(
      '.mini-logo',
    ) as HTMLImageElement | null;

    expect(sidebar.hasAttribute('mini')).toBe(true);
    expect(sidebar.shadowRoot.querySelector('.mini-content')).not.toBeNull();
    expect(miniLogo).not.toBeNull();
    expect(miniLogo?.getAttribute('src')).toContain('pinflow-icon-light');
    expect(
      sidebar.shadowRoot.querySelector('ds-annotation-input'),
    ).not.toBeNull();
    expect(sidebar.shadowRoot.querySelector('ds-header')).toBeNull();
    expect(sidebar.shadowRoot.querySelector('.main-content')).toBeNull();
    expect(miniText).toContain('PinFlow');
    expect(miniText).toContain('aktiv');
    expect(miniText).not.toContain('Composer');
    expect(
      sidebar.shadowRoot.querySelector('.mini-status.active'),
    ).not.toBeNull();

    expandButton?.click();
    expect(mockStore.setMode).toHaveBeenCalledWith('expanded');

    closeButton?.click();
    expect(mockStore.setMode).toHaveBeenCalledWith('collapsed');
  });

  it('opens workspace settings as a dedicated full-surface overlay', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-sidebar></ds-sidebar>`, host);

    const sidebar = host.querySelector('ds-sidebar') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await sidebar.updateComplete;

    const settingsOverlay = await openSettingsOverlay(sidebar);

    const overlayText =
      settingsOverlay.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(overlayText).toContain('Einstellungen');
    expect(overlayText).toContain('Arbeitsbereich anpassen');
    expect(
      settingsOverlay.shadowRoot.querySelectorAll('.tab-btn'),
    ).toHaveLength(3);
    expect(
      settingsOverlay.shadowRoot.querySelector('.settings-nav'),
    ).not.toBeNull();
    expect(
      settingsOverlay.shadowRoot.querySelector('.sheet-body.scrollable'),
    ).not.toBeNull();
    expect(
      settingsOverlay.shadowRoot.querySelector('.backdrop'),
    ).not.toBeNull();
    expect(overlayText).toContain('Elementwahl');
    expect(overlayText).toContain('Element');
    expect(overlayText).toContain('Bereich');
    expect(overlayText).toContain('Mehrfach');
    expect(
      Array.from(
        settingsOverlay.shadowRoot.querySelectorAll('.settings-card'),
      ).every((card) => !(card as HTMLDetailsElement).open),
    ).toBe(true);
    const pickerModeButtons = Array.from(
      settingsOverlay.shadowRoot.querySelectorAll(
        '.picker-mode-control .segment-option',
      ),
    ) as HTMLButtonElement[];
    expect(pickerModeButtons).toHaveLength(3);
    pickerModeButtons[1].click();
    expect(mockStore.setPickerMode).toHaveBeenCalledWith('region');
    expect(overlayText).toContain('Kommentar nach Auswahl');
    expect(overlayText).toContain('Im Arbeitsbereich');
    expect(overlayText).toContain('Direkt am Element');

    const commentModeButtons = Array.from(
      settingsOverlay.shadowRoot.querySelectorAll(
        '.comment-entry-control .segment-option',
      ),
    ) as HTMLButtonElement[];
    expect(commentModeButtons).toHaveLength(2);
    commentModeButtons[1].click();
    expect(mockStore.setCommentEntryMode).toHaveBeenCalledWith('inline');

    const embeddedSettings = settingsOverlay.shadowRoot.querySelector(
      'ds-session-settings',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await embeddedSettings.updateComplete;
    const settingsText =
      embeddedSettings.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(settingsText).toContain('Projektstandard');
    expect(settingsText).toContain('Session-Verhalten');

    const closeButton = settingsOverlay.shadowRoot.querySelector(
      'button[aria-label="Einstellungen schliessen"]',
    ) as HTMLButtonElement;
    closeButton.click();
    await sidebar.updateComplete;

    expect(sidebar.shadowRoot.querySelector('ds-settings-overlay')).toBeNull();
  });

  it('renders annotation items with guided lifecycle language', async () => {
    const annotation = {
      metadata: {
        id: 'note-7',
        status: 'processing',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      context: {
        userMessage: 'CTA klarer formulieren',
      },
      interaction: {
        selectedElement: {
          tagName: 'button',
        },
      },
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-annotation-item .annotation=${annotation}></ds-annotation-item>`,
      host,
    );

    const item = host.querySelector('ds-annotation-item') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await item.updateComplete;

    let itemText = item.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(itemText).toContain('In Bearbeitung');

    const collapsedRow = item.shadowRoot.querySelector(
      '.collapsed-row',
    ) as HTMLElement;
    collapsedRow.click();
    await item.updateComplete;

    itemText = item.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(itemText).toContain('In Bearbeitung');
    expect(itemText).toContain('Der Agent arbeitet gerade an diesem Auftrag.');
    expect(itemText).toContain('vor');
  });

  it('distinguishes queued annotation stages without provider-specific wording', async () => {
    const annotation = {
      metadata: {
        id: 'note-send',
        status: 'queued',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      context: {
        userMessage: 'Hero Abstand pruefen',
      },
      interaction: {
        selectedElement: {
          tagName: 'section',
        },
      },
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-annotation-item
        .annotation=${annotation}
        .releasedAnnotationIds=${['note-send']}
        .awaitingConfirmationIds=${[]}
      ></ds-annotation-item>`,
      host,
    );

    const item = host.querySelector('ds-annotation-item') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await item.updateComplete;

    let itemText = item.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(itemText).toContain('Freigegeben');
    expect(itemText).not.toContain('Codex');

    const collapsedRow = item.shadowRoot.querySelector(
      '.collapsed-row',
    ) as HTMLElement;
    collapsedRow.click();
    await item.updateComplete;

    itemText = item.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(itemText).toContain('Freigegeben');
    expect(itemText).toContain('Warten bis ein Agent oder Runner uebernimmt');
    expect(itemText).not.toContain('Wartet auf Freigabe');
  });

  it('renders agent summary details inside expanded annotation cards', async () => {
    const annotation = {
      metadata: {
        id: 'note-agent',
        status: 'failed',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        errorDetails: 'Browser nicht verbunden',
      },
      context: {
        userMessage: 'CTA klarer formulieren',
      },
      interaction: {
        selectedElement: {
          tagName: 'button',
        },
      },
      dispatch: {
        target: { provider: 'codex' },
        assignedAt: '2026-04-29T12:00:00.000Z',
      },
      verification: {
        status: 'unable',
        checkedAt: '2026-04-29T12:01:00.000Z',
        reasons: ['browser_not_connected'],
      },
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-annotation-item .annotation=${annotation}></ds-annotation-item>`,
      host,
    );

    const item = host.querySelector('ds-annotation-item') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await item.updateComplete;

    const collapsedRow = item.shadowRoot.querySelector(
      '.collapsed-row',
    ) as HTMLElement;
    collapsedRow.click();
    await item.updateComplete;

    const itemText = item.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(itemText).toContain('Agent-Zusammenfassung');
    expect(itemText).toContain('Codex');
    expect(itemText).toContain('Fehler: Browser nicht verbunden');
    expect(itemText).toContain('Pruefung nicht moeglich');
    expect(itemText).toContain('Browser nicht verbunden');
    expect(itemText).toContain('Fehler ansehen oder erneut senden');
  });

  it('renders session settings with project defaults and an empty override state', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-session-settings
        .projectDefaults=${mockState.dispatchProjectDefaults}
        .sessionOverrides=${{}}
      ></ds-session-settings>`,
      host,
    );

    const settings = host.querySelector(
      'ds-session-settings',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await settings.updateComplete;

    const settingsText =
      settings.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(settingsText).toContain('Projektstandard');
    expect(settingsText).toContain('Session-Verhalten');
    expect(settingsText).toContain('Session folgt Projektstandard');
    expect(settingsText).toContain('Keine Session-Anpassungen aktiv');
    expect(settingsText).toContain('Aktuell aktiv');
    expect(settingsText).toContain('Projektstandard aktiv');
    expect(settingsText).toContain('Parallelitaet');
    expect(settingsText).toContain('Sammeln bis');
    expect(
      Array.from(settings.shadowRoot.querySelectorAll('.section')).every(
        (section) => !(section as HTMLDetailsElement).open,
      ),
    ).toBe(true);
  });

  it('renders active session adjustments as a compact summary', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-session-settings
        .projectDefaults=${mockState.dispatchProjectDefaults}
        .sessionOverrides=${{
          channel: 'claude',
          mode: 'threshold',
          continuation: 'confirm',
        }}
      ></ds-session-settings>`,
      host,
    );

    const settings = host.querySelector(
      'ds-session-settings',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await settings.updateComplete;

    const settingsText =
      settings.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(settingsText).toContain('Aktive Session-Anpassungen');
    expect(settingsText).toContain('Session-Regeln aktiv');
    expect(settingsText).toContain('Claude');
    expect(settingsText).toContain('Ab Anzahl');
    expect(settingsText).toContain('Erst Freigabe holen');
    expect(settingsText).toContain('Session-Overrides zuruecksetzen');
  });

  it('renders mixed batch outcomes as a guided partial-success state', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { status: 'processed' } },
      { id: 'note-2', metadata: { status: 'failed' } },
    ];
    mockState.dispatchBatches = [
      {
        id: 'batch-mixed',
        channel: 'claude',
        annotationIds: ['note-1', 'note-2'],
        releasedAt: '2026-04-23T13:45:00.000Z',
        status: 'mixed',
        queuedCount: 0,
        processingCount: 0,
        completedCount: 1,
        failedCount: 1,
      },
    ];

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(workflowText).toContain('Teilerfolg');
    expect(workflowText).toContain(
      'Ein Teil des letzten Laufs ist fertig, einzelne Aufgaben brauchen noch Nacharbeit.',
    );
    expect(workflowText).toContain('1 Fehler');
    expect(workflowText).toContain('Naechster Schritt');
    expect(workflowText).toContain(
      'Fehler pruefen und verbleibende Aufgaben erneut anstossen.',
    );
    expect(workflowText).toContain('Nacharbeit im Blick');
    expect(workflowText).toContain(
      '1 Aufgabe aus den letzten 1 Lauf braucht Nacharbeit oder erneuten Versand.',
    );
    expect(workflowText).toContain('Claude');
  });

  it('renders workflow agent attention above batch history', async () => {
    mockState.annotations = [
      {
        id: 'note-failed',
        metadata: {
          status: 'failed',
        },
      },
    ];
    mockState.dispatchBatches = [
      {
        id: 'batch-failed',
        channel: 'codex',
        annotationIds: ['note-failed'],
        releasedAt: '2026-04-29T12:00:00.000Z',
        status: 'failed',
        queuedCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 1,
      },
    ];

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(workflowText).toContain('Agent-Status');
    expect(workflowText).toContain('Fehler brauchen Aufmerksamkeit');
    expect(workflowText).toContain(
      '1 Aufgabe ist fehlgeschlagen. Fehler in der Annotation pruefen.',
    );
  });

  it('renders batch history notes for failed and completed runs', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { status: 'failed' } },
      { id: 'note-2', metadata: { status: 'processed' } },
    ];
    mockState.dispatchBatches = [
      {
        id: 'batch-failed',
        channel: 'codex',
        annotationIds: ['note-1'],
        releasedAt: '2026-04-23T14:10:00.000Z',
        status: 'failed',
        queuedCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 1,
      },
      {
        id: 'batch-completed',
        channel: 'claude',
        annotationIds: ['note-2'],
        releasedAt: '2026-04-23T13:20:00.000Z',
        status: 'completed',
        queuedCount: 0,
        processingCount: 0,
        completedCount: 1,
        failedCount: 0,
      },
    ];

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(workflowText).toContain(
      'Lauf nicht erfolgreich. Fehler pruefen und bewusst erneut starten.',
    );
    expect(workflowText).toContain('Ohne offene Nacharbeit abgeschlossen.');
  });

  it('renders a guided inspector state for empty and selected elements', async () => {
    mockState.theme = 'dark';

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-element-preview></ds-element-preview>`, host);

    const preview = host.querySelector('ds-element-preview') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await preview.updateComplete;

    let previewText =
      preview.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(previewText).toContain('Noch kein Element ausgewaehlt');
    expect(previewText).toContain('Elementaufnahme bereit');
    expect(previewText).toContain(
      'Markiere ein Element, damit PinFlow Quelle und Kontext direkt verknuepfen kann.',
    );

    mockState.selectedElement = document.createElement('button');
    mockState.runtimeContext = {
      componentProps: { variant: 'primary', disabled: false },
      componentState: { busy: true },
    };
    mockState.manifestEntry = {
      id: 'entry1234',
      file: 'src/components/PrimaryButton.tsx',
      start: { line: 42, column: 3 },
    };

    preview.requestUpdate();
    await preview.updateComplete;

    previewText = preview.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(previewText).toContain('Auswahl');
    expect(previewText).toContain('Auswahl bestaetigt');
    expect(previewText).toContain('<button>');
    expect(previewText).toContain('Quelle');
    expect(previewText).toContain('PrimaryButton.tsx:42');
    expect(previewText).toContain('2 Eigenschaften');
    expect(previewText).toContain('1 Statusfeld');
    expect(previewText).toContain('Quelle verknuepft');

    const dismissButton = preview.shadowRoot.querySelector(
      'button[aria-label="Elementauswahl aufheben"]',
    ) as HTMLButtonElement;
    dismissButton.click();
    expect(mockStore.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders calm empty states in dark mode when no session items exist', async () => {
    mockState.annotations = [];
    mockState.dispatchBatches = [];
    mockState.relayConnected = false;
    mockState.theme = 'dark';

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-list></ds-annotation-list>`, host);

    const list = host.querySelector('ds-annotation-list') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await list.updateComplete;
    const listText = list.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(listText).toContain('Noch keine Anmerkungen in dieser Session');
    expect(listText).toContain(
      'Markiere ein Element und starte rechts mit deiner ersten Aenderung.',
    );
  });

  it('renders safe collecting states for queue-only and paused sessions', async () => {
    mockState.annotations = [
      { id: 'note-queue', metadata: { status: 'queued' } },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'queue_only',
      mode: 'manual',
      threshold: 3,
      concurrency: 3,
      continuation: 'automatic',
    };
    mockState.dispatchSession = {
      overrides: { channel: 'queue_only' },
      paused: true,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
      lastDispatchError: null,
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const releaseButton = workflowPanel.shadowRoot.querySelector(
      '.dispatch-btn',
    ) as HTMLButtonElement;

    expect(workflowText).toContain('Sammelt Aufgaben ohne Versand');
    expect(workflowText).toContain(
      'Neue Aufgaben bleiben gesammelt, bis du sie bewusst weitergibst.',
    );
    expect(workflowText).toContain('Warteliste pausiert');
    expect(workflowText).toContain('Warteliste sammelt nur');
    expect(workflowText).toContain(
      'Waehle ein Uebergabeziel, bevor du die Warteliste sendest.',
    );
    expect(workflowText).toContain('Sammelt weiter');
    expect(workflowText).toContain(
      'Waehle ein Uebergabeziel, sobald die ersten Aufgaben starten sollen.',
    );
    expect(releaseButton.disabled).toBe(true);
  });

  it('renders threshold guidance before automatic confirmation starts', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { id: 'note-1', status: 'queued' } },
      { id: 'note-2', metadata: { id: 'note-2', status: 'queued' } },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'codex',
      mode: 'threshold',
      threshold: 3,
      concurrency: 2,
      continuation: 'confirm',
    };
    mockState.dispatchSession = {
      overrides: { mode: 'threshold', continuation: 'confirm' },
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
      lastDispatchError: null,
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(workflowText).toContain('Sammelt bis 3');
    expect(workflowText).toContain(
      'Noch 1 Aufgabe, dann stellt PinFlow den ersten Lauf zur Freigabe bereit.',
    );
    expect(workflowText).toContain('Bereit fuer den naechsten Lauf');
  });

  it('shows a visible send action for manually collected waiting tasks', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { id: 'note-1', status: 'queued' } },
      { id: 'note-2', metadata: { id: 'note-2', status: 'queued' } },
      { id: 'note-3', metadata: { id: 'note-3', status: 'queued' } },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'codex',
      mode: 'manual',
      threshold: 3,
      concurrency: 2,
      continuation: 'manual',
    };
    mockState.dispatchSession = {
      overrides: { mode: 'manual', continuation: 'manual' },
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
      lastDispatchError: null,
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const releaseButton = workflowPanel.shadowRoot.querySelector(
      '.dispatch-callout .dispatch-btn',
    ) as HTMLButtonElement;

    expect(workflowText).toContain('Manueller Start');
    expect(workflowText).toContain('Warteliste bereit');
    expect(workflowText).toContain('2 Aufgaben koennen jetzt gesendet werden.');
    expect(releaseButton.textContent).toContain('Jetzt senden (2)');
    expect(releaseButton.disabled).toBe(false);

    releaseButton.click();
    expect(mockStore.releaseNextDispatchBatch).toHaveBeenCalledTimes(1);
  });

  it('shows the send action directly inside the opened waiting list', async () => {
    mockState.annotations = [
      {
        metadata: { id: 'note-1', status: 'queued' },
        context: { userMessage: 'Make it larger' },
        interaction: { selectedElement: { tagName: 'button' } },
      },
      {
        metadata: { id: 'note-2', status: 'queued' },
        context: { userMessage: 'Move this down' },
        interaction: { selectedElement: { tagName: 'button' } },
      },
      {
        metadata: { id: 'note-3', status: 'queued' },
        context: { userMessage: 'Adjust copy' },
        interaction: { selectedElement: { tagName: 'button' } },
      },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'auto',
      mode: 'manual',
      threshold: 3,
      concurrency: 2,
      continuation: 'manual',
    };
    mockState.dispatchSession = {
      overrides: { mode: 'manual', continuation: 'manual' },
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
      lastDispatchError: null,
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-list></ds-annotation-list>`, host);

    const list = host.querySelector('ds-annotation-list') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await list.updateComplete;

    const waitingHeader = list.shadowRoot.querySelector(
      '.status-group[data-status="queued"] .status-header',
    ) as HTMLButtonElement;
    waitingHeader.click();
    await list.updateComplete;

    const listText = list.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const sendButton = list.shadowRoot.querySelector(
      '.queue-action .queue-action-btn',
    ) as HTMLButtonElement;

    expect(listText).toContain('Warteliste bereit');
    expect(listText).toContain('2 Aufgaben koennen jetzt gesendet werden.');
    expect(sendButton.textContent).toContain('Jetzt senden (2)');
    expect(sendButton.disabled).toBe(false);

    sendButton.click();
    expect(mockStore.releaseNextDispatchBatch).toHaveBeenCalledTimes(1);
  });

  it('shows dispatch failures directly in the opened waiting list', async () => {
    mockState.annotations = [
      {
        metadata: { id: 'note-1', status: 'queued' },
        context: { userMessage: 'Try again' },
        interaction: { selectedElement: { tagName: 'button' } },
      },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'auto',
      mode: 'manual',
      threshold: 3,
      concurrency: 1,
      continuation: 'manual',
    };
    mockState.dispatchSession = {
      overrides: { mode: 'manual', continuation: 'manual' },
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
      lastDispatchError:
        'Senden fehlgeschlagen. Der lokale PinFlow-Relay laeuft noch mit einer aelteren Version. Starte die Vorschau neu und versuche es erneut.',
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-list></ds-annotation-list>`, host);

    const list = host.querySelector('ds-annotation-list') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await list.updateComplete;
    const waitingHeader = list.shadowRoot.querySelector(
      '.status-group[data-status="queued"] .status-header',
    ) as HTMLButtonElement;
    waitingHeader.click();
    await list.updateComplete;

    const listText = list.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const sendButton = list.shadowRoot.querySelector(
      '.queue-action .queue-action-btn',
    ) as HTMLButtonElement;

    expect(listText).toContain('Senden fehlgeschlagen');
    expect(listText).toContain(
      'Senden fehlgeschlagen. Der lokale PinFlow-Relay laeuft noch mit einer aelteren Version. Starte die Vorschau neu und versuche es erneut.',
    );
    expect(sendButton.textContent).toContain('Erneut senden (1)');
  });

  it('renders compact history cards around the selected source', async () => {
    mockState.annotations = [
      {
        metadata: { id: 'note-history', status: 'queued' },
        context: {
          userMessage:
            'Bitte diesen Bereich deutlich klarer formulieren und die Abstaende pruefen.',
          manifestSnapshot: [
            {
              file: '/workspace/src/App.tsx',
              start: { line: 42, column: 10 },
            },
          ],
        },
        interaction: {
          selectedElement: { tagName: 'section', dataDs: 'abc12345' },
        },
      },
    ];

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-annotation-list variant="list"></ds-annotation-list>`,
      host,
    );

    const list = host.querySelector('ds-annotation-list') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await list.updateComplete;

    const listText = list.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const card = list.shadowRoot.querySelector('.plain-item') as HTMLElement;

    expect(listText).toContain('App.tsx:42');
    expect(listText).toContain('Bitte diesen Bereich deutlich klarer');
    expect(listText).toContain('Warteliste · abc12345');
    expect(card).toBeTruthy();
  });

  it('renders guided confirmation flow states when a batch awaits approval', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { id: 'note-1', status: 'queued' } },
      { id: 'note-2', metadata: { id: 'note-2', status: 'queued' } },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'codex',
      mode: 'threshold',
      threshold: 2,
      concurrency: 1,
      continuation: 'confirm',
    };
    mockState.dispatchSession = {
      overrides: { mode: 'threshold', continuation: 'confirm' },
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: ['note-1'],
      flowActive: true,
      lastDispatchError: null,
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const releaseButton = workflowPanel.shadowRoot.querySelector(
      '.dispatch-btn',
    ) as HTMLButtonElement;

    expect(workflowText).toContain('Wartet auf Freigabe');
    expect(workflowText).toContain('Warteliste bereit');
    expect(workflowText).toContain('1 Aufgabe wartet auf deine Freigabe.');
    expect(workflowText).toContain('Freigabe bereit');
    expect(workflowText).toContain(
      'Der naechste Lauf liegt bereit. Pruefe ihn und gib ihn bewusst frei.',
    );
    expect(releaseButton.textContent).toContain('Freigeben (1)');
    expect(releaseButton.disabled).toBe(false);
  });
});
