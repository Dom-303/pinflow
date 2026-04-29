import { describe, expect, it } from 'vitest';
import { AnnotationStatusEnum, type Annotation } from '@pinflow/core';

import {
  getAnnotationAgentSummary,
  getWorkflowAgentAttention,
} from './agent-summary.js';

function annotation(
  overrides: Omit<Partial<Annotation>, 'metadata'> & {
    metadata?: Partial<Annotation['metadata']>;
  } = {},
): Annotation {
  return {
    metadata: {
      id: 'ann-1',
      timestamp: '2026-04-29T12:00:00.000Z',
      mode: 'element',
      status: AnnotationStatusEnum.QUEUED,
      schemaVersion: 1,
      ...overrides.metadata,
    },
    interaction: {
      type: 'click',
      selectedElement: { tagName: 'button', selector: 'button' },
    },
    context: {
      pageUrl: 'http://localhost:4301',
      pageTitle: 'PinFlow Preview',
      viewport: { width: 1280, height: 720, devicePixelRatio: 1 },
      userAgent: 'vitest',
      userMessage: 'CTA klarer machen',
    },
    ...overrides,
  } as Annotation;
}

describe('agent summary helpers', () => {
  it('summarizes failed agent work from concrete annotation fields', () => {
    const summary = getAnnotationAgentSummary(
      annotation({
        metadata: {
          status: AnnotationStatusEnum.FAILED,
          errorDetails: 'Browser nicht verbunden',
        },
        dispatch: {
          target: { provider: 'codex' },
          assignedAt: '2026-04-29T12:01:00.000Z',
        },
        verification: {
          status: 'unable',
          checkedAt: '2026-04-29T12:02:00.000Z',
          reasons: ['browser_not_connected'],
        },
      }),
    );

    expect(summary.channelLabel).toBe('Codex');
    expect(summary.statusLabel).toBe('Fehlgeschlagen');
    expect(summary.statusDetail).toBe('Fehler: Browser nicht verbunden');
    expect(summary.verificationLabel).toBe('Pruefung nicht moeglich');
    expect(summary.verificationDetail).toBe('Browser nicht verbunden');
    expect(summary.nextAction).toBe('Fehler ansehen oder erneut senden');
  });

  it('keeps processed summaries compact and derived from response plus verification', () => {
    const summary = getAnnotationAgentSummary(
      annotation({
        metadata: { status: AnnotationStatusEnum.PROCESSED },
        agentResponse: {
          message:
            'Ich habe den Button-Text angepasst und die Source-Location erneut geprueft.',
        },
        verification: {
          status: 'verified',
          checkedAt: '2026-04-29T12:02:00.000Z',
          reasons: [],
        },
      }),
    );

    expect(summary.statusLabel).toBe('Erledigt');
    expect(summary.responseExcerpt).toBe(
      'Ich habe den Button-Text angepasst und die Source-Location erneut geprueft.',
    );
    expect(summary.verificationLabel).toBe('Aenderung geprueft');
    expect(summary.nextAction).toBe('Archivieren oder weiterarbeiten');
  });

  it('prioritizes workflow attention from failures, approvals, and running batches', () => {
    expect(
      getWorkflowAgentAttention({
        annotations: [
          annotation({ metadata: { status: AnnotationStatusEnum.FAILED } }),
        ],
        awaitingConfirmationCount: 0,
        inFlightCount: 0,
        latestBatchChannel: 'codex',
        latestBatchStatus: 'failed',
      }),
    ).toEqual({
      title: 'Fehler brauchen Aufmerksamkeit',
      copy: '1 Aufgabe ist fehlgeschlagen. Fehler in der Annotation pruefen.',
    });

    expect(
      getWorkflowAgentAttention({
        annotations: [],
        awaitingConfirmationCount: 2,
        inFlightCount: 0,
        latestBatchChannel: 'claude',
        latestBatchStatus: 'queued',
      }),
    ).toEqual({
      title: 'Freigabe wartet',
      copy: '2 Aufgaben warten auf Freigabe.',
    });

    expect(
      getWorkflowAgentAttention({
        annotations: [],
        awaitingConfirmationCount: 0,
        inFlightCount: 1,
        latestBatchChannel: 'codex',
        latestBatchStatus: 'running',
      }),
    ).toEqual({
      title: 'Lauf gestartet',
      copy: '1 Lauf ist gestartet bei Codex.',
    });
  });
});
