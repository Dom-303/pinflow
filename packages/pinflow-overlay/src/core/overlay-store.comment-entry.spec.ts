/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '@pinflow/core';
import { InteractionModeEnum, InteractionTypeEnum } from '@pinflow/core';
import { OverlayStore } from './overlay-store.js';

const relayMock = vi.hoisted(() => ({
  createAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
  refreshAnnotations: vi.fn(),
  resolve: vi.fn(),
  requestSettingsUpdate: vi.fn(),
}));

vi.mock('@pinflow/runtime', () => ({
  BridgeDispatch: {
    getInstance: () => ({
      captureContext: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock('../services/relay-service.js', () => ({
  RelayService: {
    getInstance: () => relayMock,
  },
}));

function queuedAnnotation(id = 'ann-inline'): Annotation {
  return {
    metadata: {
      id,
      status: 'queued',
      mode: InteractionModeEnum.ELEMENT_CLICK,
      timestamp: new Date('2026-04-29T10:00:00.000Z').toISOString(),
    },
    interaction: {
      type: InteractionTypeEnum.ELEMENT_ANNOTATION,
      selectedElement: {
        tagName: 'button',
        selector: 'button.primary',
      },
    },
    context: {
      pageUrl: 'http://localhost:4301/',
      pageTitle: 'PinFlow Fixture',
      viewport: { width: 1200, height: 800 },
      userAgent: 'vitest',
      userMessage: 'Button klarer machen',
    },
  } as Annotation;
}

function mockRect(rect: Partial<DOMRect>): DOMRect {
  return {
    x: rect.x ?? 0,
    y: rect.y ?? 0,
    width: rect.width ?? 120,
    height: rect.height ?? 40,
    top: rect.top ?? rect.y ?? 0,
    right: rect.right ?? (rect.x ?? 0) + (rect.width ?? 120),
    bottom: rect.bottom ?? (rect.y ?? 0) + (rect.height ?? 40),
    left: rect.left ?? rect.x ?? 0,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('OverlayStore comment entry mode', () => {
  beforeEach(() => {
    localStorage.clear();
    OverlayStore.resetInstance();
    vi.clearAllMocks();
  });

  it('defaults to workspace comments and persists inline comments when selected', () => {
    const store = OverlayStore.getInstance();

    expect(store.getState().commentEntryMode).toBe('workspace');

    store.setCommentEntryMode('inline');

    expect(store.getState().commentEntryMode).toBe('inline');

    OverlayStore.resetInstance();

    expect(OverlayStore.getInstance().getState().commentEntryMode).toBe(
      'inline',
    );
  });

  it('selects an element for inline comments without opening the sidebar composer', async () => {
    const store = OverlayStore.getInstance();
    const button = document.createElement('button');
    button.setAttribute('data-ds', 'entry-button');
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
      mockRect({ x: 80, y: 120, width: 180, height: 48 }),
    );

    store.enterCaptureMode('element');
    await store.selectElementForInlineComment(button, { x: 140, y: 156 });

    expect(store.getState().mode).toBe('capturing');
    expect(store.getState().selectedElement).toBe(button);
    expect(store.getState().selectedEntryId).toBe('entry-button');
    expect(store.getState().inlineCommentDraft).toMatchObject({
      position: { x: 140, y: 156 },
      pickerMode: 'element',
      anchorRect: {
        left: 80,
        top: 120,
        width: 180,
        height: 48,
      },
    });
  });

  it('moves back to the workspace after submitting an inline comment', async () => {
    const store = OverlayStore.getInstance();
    const button = document.createElement('button');
    button.setAttribute('data-ds', 'entry-button');
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
      mockRect({ x: 80, y: 120, width: 180, height: 48 }),
    );
    relayMock.createAnnotation.mockResolvedValue(queuedAnnotation());

    store.enterCaptureMode('element');
    await store.selectElementForInlineComment(button, { x: 140, y: 156 });
    await store.submitAnnotation('Bitte Button klarer machen');

    expect(relayMock.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          userMessage: 'Bitte Button klarer machen',
        }),
      }),
    );
    expect(store.getState().inlineCommentDraft).toBeNull();
    expect(store.getState().mode).toBe('expanded');
    expect(store.getState().selectedElement).toBeNull();
  });
});
