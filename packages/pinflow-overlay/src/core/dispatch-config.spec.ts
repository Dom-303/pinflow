import { describe, expect, it } from 'vitest';
import type { Annotation } from '@pinflow/core';
import {
  DEFAULT_DISPATCH_PROJECT_DEFAULTS,
  DEFAULT_DISPATCH_SESSION_STATE,
  analyzeDispatchQueue,
  getAnnotationDispatchView,
  mergeDispatchConfig,
  normalizeProjectDefaults,
  normalizeSessionOverrides,
  summarizeQueue,
} from './dispatch-config.js';

describe('dispatch-config', () => {
  it('uses the current local agent as the default handoff target', () => {
    const normalized = normalizeProjectDefaults({});

    expect(DEFAULT_DISPATCH_PROJECT_DEFAULTS.channel).toBe('auto');
    expect(normalized.channel).toBe('auto');
  });

  it('normalizes invalid project defaults into safe bounds', () => {
    const normalized = normalizeProjectDefaults({
      // @ts-expect-error test invalid runtime values
      channel: 'other',
      // @ts-expect-error test invalid runtime values
      mode: 'auto',
      threshold: 99,
      concurrency: 0,
      // @ts-expect-error test invalid runtime values
      continuation: 'forever',
    });

    expect(normalized).toEqual({
      channel: DEFAULT_DISPATCH_PROJECT_DEFAULTS.channel,
      mode: DEFAULT_DISPATCH_PROJECT_DEFAULTS.mode,
      threshold: 10,
      concurrency: 1,
      continuation: DEFAULT_DISPATCH_PROJECT_DEFAULTS.continuation,
    });
  });

  it('merges session overrides over project defaults', () => {
    const merged = mergeDispatchConfig(
      {
        channel: 'codex',
        mode: 'manual',
        threshold: 3,
        concurrency: 3,
        continuation: 'automatic',
      },
      {
        ...DEFAULT_DISPATCH_SESSION_STATE,
        overrides: normalizeSessionOverrides({
          channel: 'claude',
          mode: 'threshold',
          threshold: 5,
          continuation: 'confirm',
        }),
        paused: true,
      },
    );

    expect(merged).toEqual({
      channel: 'claude',
      mode: 'threshold',
      threshold: 5,
      concurrency: 3,
      continuation: 'confirm',
      paused: true,
    });
  });

  it('summarizes queue counts from annotation statuses', () => {
    const annotations = [
      { metadata: { status: 'queued' } },
      { metadata: { status: 'queued' } },
      { metadata: { status: 'claimed' } },
      { metadata: { status: 'processing' } },
      { metadata: { status: 'processed' } },
      { metadata: { status: 'failed' } },
      { metadata: { status: 'archived' } },
    ] as Annotation[];

    expect(summarizeQueue(annotations)).toEqual({
      waiting: 2,
      active: 2,
      completed: 1,
      failed: 1,
      archived: 1,
    });
  });

  it('analyzes releasable queue work with local tracking and capacity', () => {
    const annotations = [
      { metadata: { id: 'ann-1', status: 'queued' } },
      { metadata: { id: 'ann-2', status: 'queued' } },
      { metadata: { id: 'ann-3', status: 'processing' } },
      { metadata: { id: 'ann-5', status: 'claimed' } },
      { metadata: { id: 'ann-4', status: 'processed' } },
    ] as Annotation[];

    expect(
      analyzeDispatchQueue(annotations, {
        releasedAnnotationIds: ['ann-1'],
        awaitingConfirmationIds: ['ann-2'],
        concurrency: 3,
      }),
    ).toEqual({
      queuedIds: ['ann-1', 'ann-2'],
      unreleasedWaitingIds: [],
      inFlightIds: ['ann-3', 'ann-5', 'ann-1'],
      awaitingConfirmationIds: ['ann-2'],
      releasableIds: [],
      capacityRemaining: 0,
    });
  });

  it('keeps server-released queued work in flight until an agent claims it', () => {
    const annotations = [
      {
        metadata: { id: 'ann-1', status: 'queued' },
        dispatch: { assignedAt: '2026-04-29T10:00:00.000Z' },
      },
      { metadata: { id: 'ann-2', status: 'queued' } },
    ] as Annotation[];

    expect(
      analyzeDispatchQueue(annotations, {
        releasedAnnotationIds: [],
        awaitingConfirmationIds: [],
        concurrency: 1,
      }),
    ).toEqual({
      queuedIds: ['ann-1', 'ann-2'],
      unreleasedWaitingIds: ['ann-2'],
      inFlightIds: ['ann-1'],
      awaitingConfirmationIds: [],
      releasableIds: [],
      capacityRemaining: 0,
    });
  });

  it('derives provider-neutral queue item stages from dispatch tracking', () => {
    const queued = {
      metadata: { id: 'ann-1', status: 'queued' },
    } as Annotation;

    expect(
      getAnnotationDispatchView(queued, {
        releasedAnnotationIds: [],
        awaitingConfirmationIds: [],
      }),
    ).toMatchObject({
      stage: 'waiting',
      statusLabel: 'In Warteliste',
      nextAction: 'Warten bis die Versandregel greift oder manuell senden',
    });

    expect(
      getAnnotationDispatchView(queued, {
        releasedAnnotationIds: [],
        awaitingConfirmationIds: ['ann-1'],
      }),
    ).toMatchObject({
      stage: 'awaiting_confirmation',
      statusLabel: 'Wartet auf Freigabe',
      nextAction: 'Freigeben oder weiter sammeln',
    });

    expect(
      getAnnotationDispatchView(queued, {
        releasedAnnotationIds: ['ann-1'],
        awaitingConfirmationIds: [],
      }),
    ).toMatchObject({
      stage: 'dispatching',
      statusLabel: 'Freigegeben',
      nextAction: 'Warten bis ein Agent oder Runner uebernimmt',
    });

    expect(
      getAnnotationDispatchView(
        {
          metadata: { id: 'ann-1', status: 'queued' },
          dispatch: { assignedAt: '2026-04-29T10:00:00.000Z' },
        } as Annotation,
        {
          releasedAnnotationIds: [],
          awaitingConfirmationIds: [],
        },
      ),
    ).toMatchObject({
      stage: 'dispatching',
      statusLabel: 'Freigegeben',
      nextAction: 'Warten bis ein Agent oder Runner uebernimmt',
    });

    expect(
      getAnnotationDispatchView(
        { metadata: { id: 'ann-2', status: 'claimed' } } as Annotation,
        {
          releasedAnnotationIds: [],
          awaitingConfirmationIds: [],
        },
      ),
    ).toMatchObject({
      stage: 'claimed',
      statusLabel: 'Uebernommen',
      nextAction: 'Warten, Agent hat uebernommen',
    });
  });
});
