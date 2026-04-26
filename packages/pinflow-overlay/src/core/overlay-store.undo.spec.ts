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
}));

vi.mock('@pinflow/runtime', () => ({
  BridgeDispatch: {
    getInstance: () => ({
      captureContext: vi.fn(),
    }),
  },
}));

vi.mock('../services/relay-service.js', () => ({
  RelayService: {
    getInstance: () => relayMock,
  },
}));

function annotation(
  id: string,
  status: Annotation['metadata']['status'],
  userMessage = 'Bitte Button umbauen',
): Annotation {
  return {
    metadata: {
      id,
      status,
      mode: InteractionModeEnum.ELEMENT_CLICK,
      timestamp: new Date('2026-04-25T10:00:00.000Z').toISOString(),
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
      userMessage,
    },
  } as Annotation;
}

describe('OverlayStore undo workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    OverlayStore.resetInstance();
    vi.clearAllMocks();
  });

  it('records a selected element so the last local selection can be undone', async () => {
    const store = OverlayStore.getInstance();
    const button = document.createElement('button');

    store.setSelectedElement(button, 'entry-button');

    expect(store.getUndoPreview()).toMatchObject({
      kind: 'selection',
      label: 'Auswahl rueckgaengig',
    });

    const result = await store.undoLastAction();

    expect(result).toMatchObject({ ok: true, kind: 'selection' });
    expect(store.getState().selectedElement).toBeNull();
    expect(store.getState().selectedElements).toEqual([]);
    expect(store.getState().selectedEntryId).toBeNull();
    expect(store.getUndoPreview()).toBeNull();
  });

  it('removes the last queued annotation when it has not been released yet', async () => {
    const store = OverlayStore.getInstance();
    const queued = annotation('ann-queued', 'queued');

    store.setAnnotations([queued]);
    store.recordSubmittedAnnotation(queued);

    expect(store.getUndoPreview()).toMatchObject({
      kind: 'queued-annotation',
      label: 'Auftrag zurueckholen',
    });

    const result = await store.undoLastAction();

    expect(result).toMatchObject({ ok: true, kind: 'queued-annotation' });
    expect(relayMock.deleteAnnotation).toHaveBeenCalledWith('ann-queued');
  });

  it('creates a reversal request instead of deleting already processed work', async () => {
    const store = OverlayStore.getInstance();
    const processed = annotation('ann-processed', 'processed');
    relayMock.createAnnotation.mockResolvedValue(
      annotation('ann-reversal', 'queued', 'Ruecknahme-Auftrag'),
    );

    const result = await store.requestAnnotationReversal(processed);

    expect(result).toMatchObject({ ok: true, kind: 'reversal-request' });
    expect(relayMock.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: processed.metadata.mode,
        interaction: processed.interaction,
        context: expect.objectContaining({
          userMessage: expect.stringContaining('Ruecknahme-Auftrag'),
        }),
      }),
    );
    expect(relayMock.createAnnotation.mock.calls[0][0].context.userMessage).toContain(
      'Bitte Button umbauen',
    );
  });

  it('uses the same safe decision for explicit history undo actions', async () => {
    const store = OverlayStore.getInstance();
    const queued = annotation('ann-history-queued', 'queued');

    store.setAnnotations([queued]);

    const result = await store.undoAnnotation(queued);

    expect(result).toMatchObject({ ok: true, kind: 'queued-annotation' });
    expect(relayMock.deleteAnnotation).toHaveBeenCalledWith('ann-history-queued');
  });
});
