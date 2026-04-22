/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '@pinflow/core';
import { OverlayStore } from './overlay-store.js';
import type { DispatchBatch } from './types.js';

vi.mock('@pinflow/runtime', () => ({
  BridgeDispatch: {
    getInstance: () => ({
      captureContext: vi.fn(),
    }),
  },
}));

vi.mock('../services/relay-service.js', () => ({
  RelayService: {
    getInstance: () => ({
      resolve: vi.fn(),
      createAnnotation: vi.fn(),
      patchAnnotation: vi.fn(),
    }),
  },
}));

function annotation(id: string, status: string): Annotation {
  return {
    metadata: {
      id,
      status,
    },
  } as Annotation;
}

function getDispatchBatches(store: OverlayStore): DispatchBatch[] {
  return store.getState().dispatchBatches;
}

describe('OverlayStore dispatch progression', () => {
  beforeEach(() => {
    localStorage.clear();
    OverlayStore.resetInstance();
  });

  it('auto-releases a queued annotation in immediate mode', () => {
    const store = OverlayStore.getInstance();

    store.updateDispatchProjectDefaults({
      mode: 'immediate',
      concurrency: 2,
    });

    store.setAnnotations([annotation('ann-1', 'queued')]);

    expect(store.getState().dispatchSession.releasedAnnotationIds).toEqual([
      'ann-1',
    ]);
    expect(store.getState().dispatchSession.flowActive).toBe(true);
  });

  it('holds a threshold-start batch for confirmation when configured', () => {
    const store = OverlayStore.getInstance();

    store.updateDispatchProjectDefaults({
      mode: 'threshold',
      threshold: 2,
      continuation: 'confirm',
      concurrency: 2,
    });

    store.setAnnotations([
      annotation('ann-1', 'queued'),
      annotation('ann-2', 'queued'),
    ]);

    expect(store.getState().dispatchSession.awaitingConfirmationIds).toEqual([
      'ann-1',
      'ann-2',
    ]);
    expect(store.getState().dispatchSession.releasedAnnotationIds).toEqual([]);
  });

  it('refills the next queued annotation when automatic continuation frees capacity', () => {
    const store = OverlayStore.getInstance();

    store.updateDispatchProjectDefaults({
      mode: 'immediate',
      concurrency: 1,
      continuation: 'automatic',
    });

    store.setAnnotations([annotation('ann-1', 'queued')]);
    expect(store.getState().dispatchSession.releasedAnnotationIds).toEqual([
      'ann-1',
    ]);

    store.setAnnotations([
      annotation('ann-1', 'processing'),
      annotation('ann-2', 'queued'),
    ]);
    expect(store.getState().dispatchSession.releasedAnnotationIds).toEqual([
      'ann-1',
    ]);

    store.setAnnotations([
      annotation('ann-1', 'processed'),
      annotation('ann-2', 'queued'),
    ]);

    expect(store.getState().dispatchSession.releasedAnnotationIds).toEqual([
      'ann-2',
    ]);
  });

  it('lets manual mode release the next batch explicitly', () => {
    const store = OverlayStore.getInstance();

    store.updateDispatchProjectDefaults({
      mode: 'manual',
      concurrency: 2,
    });

    store.setAnnotations([
      annotation('ann-1', 'queued'),
      annotation('ann-2', 'queued'),
    ]);

    expect(store.getState().dispatchSession.releasedAnnotationIds).toEqual([]);

    const released = store.releaseNextDispatchBatch();

    expect(released).toEqual(['ann-1', 'ann-2']);
    expect(store.getState().dispatchSession.releasedAnnotationIds).toEqual([
      'ann-1',
      'ann-2',
    ]);
  });

  it('records released batches and keeps their progress in sync with annotations', () => {
    const store = OverlayStore.getInstance();

    store.updateDispatchProjectDefaults({
      mode: 'manual',
      channel: 'codex',
      concurrency: 2,
    });

    store.setAnnotations([
      annotation('ann-1', 'queued'),
      annotation('ann-2', 'queued'),
    ]);

    store.releaseNextDispatchBatch();

    let batches = getDispatchBatches(store);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({
      channel: 'codex',
      annotationIds: ['ann-1', 'ann-2'],
      status: 'queued',
      queuedCount: 2,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
    });

    store.setAnnotations([
      annotation('ann-1', 'processing'),
      annotation('ann-2', 'queued'),
    ]);

    batches = getDispatchBatches(store);
    expect(batches[0]).toMatchObject({
      status: 'running',
      queuedCount: 1,
      processingCount: 1,
    });

    store.setAnnotations([
      annotation('ann-1', 'processed'),
      annotation('ann-2', 'failed'),
    ]);

    batches = getDispatchBatches(store);
    expect(batches[0]).toMatchObject({
      status: 'mixed',
      completedCount: 1,
      failedCount: 1,
    });
  });
});
