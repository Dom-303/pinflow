import {
  AnnotationStatusEnum,
  InteractionModeEnum,
  InteractionTypeEnum,
} from '@pinflow/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnotationService } from './annotation-service.js';
import { InMemoryAnnotationStorage } from './storage/in-memory-annotation-storage.js';

function createInput(userMessage: string) {
  return {
    mode: InteractionModeEnum.ELEMENT_CLICK,
    interaction: {
      type: InteractionTypeEnum.ELEMENT_ANNOTATION,
      selectedElement: {
        tagName: 'button',
        selector: 'button',
      },
    },
    context: {
      pageUrl: 'http://localhost:3000',
      pageTitle: 'Test page',
      viewport: { width: 1280, height: 720 },
      userAgent: 'vitest',
      userMessage,
    },
  };
}

describe('AnnotationService queue claiming', () => {
  let service: AnnotationService;

  beforeEach(async () => {
    vi.useFakeTimers();
    service = new AnnotationService(new InMemoryAnnotationStorage());
    await service.initialize();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('claims the oldest queued annotation with lease metadata', async () => {
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));
    await service.create(createInput('First request'));

    vi.setSystemTime(new Date('2026-04-29T10:00:01.000Z'));
    await service.create(createInput('Second request'));

    vi.setSystemTime(new Date('2026-04-29T10:00:02.000Z'));
    const claimed = await service.claimNext({
      agentId: 'codex',
      leaseMs: 60_000,
    });

    expect(claimed?.context.userMessage).toBe('First request');
    expect(claimed?.metadata.status).toBe(AnnotationStatusEnum.CLAIMED);
    expect(claimed?.metadata.claim).toMatchObject({
      claimedBy: 'codex',
      claimedAt: '2026-04-29T10:00:02.000Z',
      leaseExpiresAt: '2026-04-29T10:01:02.000Z',
    });
    expect(claimed?.metadata.claim?.token).toEqual(expect.any(String));

    const counts = await service.getCountByStatus();
    expect(counts[AnnotationStatusEnum.CLAIMED]).toBe(1);
    expect(counts[AnnotationStatusEnum.QUEUED]).toBe(1);
  });

  it('records provider-neutral dispatch metadata when claiming work', async () => {
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));
    await service.create(createInput('Dispatch me'));

    const claimed = await service.claimNext({
      dispatchTarget: {
        provider: 'codex',
        label: 'Codex CLI',
        sessionId: 'terminal-1',
      },
    });

    expect(claimed?.metadata.claim?.claimedBy).toBe('Codex CLI');
    expect(claimed?.dispatch).toMatchObject({
      assignedAt: '2026-04-29T10:00:00.000Z',
      target: {
        provider: 'codex',
        label: 'Codex CLI',
        sessionId: 'terminal-1',
      },
    });
  });

  it('releases selected queued annotations by id with dispatch metadata', async () => {
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));
    const first = await service.create(createInput('First request'));
    const second = await service.create(createInput('Second request'));
    await service.create(createInput('Third request'));

    vi.setSystemTime(new Date('2026-04-29T10:00:05.000Z'));
    const result = await service.releaseByIds({
      annotationIds: [second.metadata.id, first.metadata.id],
      dispatchTarget: {
        provider: 'other',
        label: 'Aktueller Agent',
      },
    });

    expect(result.released.map((item) => item.metadata.id)).toEqual([
      second.metadata.id,
      first.metadata.id,
    ]);
    expect(result.skippedIds).toEqual([]);
    expect(result.released[0].metadata.status).toBe(
      AnnotationStatusEnum.QUEUED,
    );
    expect(result.released[0].metadata.claim).toBeUndefined();
    expect(result.released[0].dispatch).toMatchObject({
      assignedAt: '2026-04-29T10:00:05.000Z',
      target: {
        provider: 'other',
        label: 'Aktueller Agent',
      },
    });

    const counts = await service.getCountByStatus();
    expect(counts[AnnotationStatusEnum.CLAIMED]).toBe(0);
    expect(counts[AnnotationStatusEnum.QUEUED]).toBe(3);
  });

  it('skips released annotations that are no longer queued', async () => {
    const first = await service.create(createInput('First request'));
    const second = await service.create(createInput('Second request'));
    await service.updateStatus(first.metadata.id, AnnotationStatusEnum.CLAIMED);

    const result = await service.releaseByIds({
      annotationIds: [first.metadata.id, second.metadata.id],
    });

    expect(result.released.map((item) => item.metadata.id)).toEqual([
      second.metadata.id,
    ]);
    expect(result.skippedIds).toEqual([first.metadata.id]);
  });

  it('lets MCP claim released queued work before older unreleased work', async () => {
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));
    await service.create(createInput('Older unsent request'));

    vi.setSystemTime(new Date('2026-04-29T10:00:01.000Z'));
    const released = await service.create(createInput('Released request'));

    vi.setSystemTime(new Date('2026-04-29T10:00:02.000Z'));
    await service.releaseByIds({
      annotationIds: [released.metadata.id],
      dispatchTarget: {
        provider: 'other',
        label: 'Aktueller Agent',
      },
    });

    vi.setSystemTime(new Date('2026-04-29T10:00:03.000Z'));
    const claimed = await service.claimNext({ agentId: 'codex' });

    expect(claimed?.metadata.id).toBe(released.metadata.id);
    expect(claimed?.context.userMessage).toBe('Released request');
    expect(claimed?.metadata.status).toBe(AnnotationStatusEnum.CLAIMED);
  });

  it('requeues expired leases before claiming work for another agent', async () => {
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));
    const created = await service.create(createInput('Lease can expire'));

    const firstClaim = await service.claimNext({
      agentId: 'agent-a',
      leaseMs: 1_000,
    });
    expect(firstClaim?.metadata.status).toBe(AnnotationStatusEnum.CLAIMED);

    vi.setSystemTime(new Date('2026-04-29T10:00:02.000Z'));
    const secondClaim = await service.claimNext({
      agentId: 'agent-b',
      leaseMs: 60_000,
    });

    expect(secondClaim?.metadata.id).toBe(created.metadata.id);
    expect(secondClaim?.metadata.status).toBe(AnnotationStatusEnum.CLAIMED);
    expect(secondClaim?.metadata.claim?.claimedBy).toBe('agent-b');
    expect(secondClaim?.metadata.retryCount).toBe(1);
    expect(secondClaim?.metadata.errorDetails).toBe(
      'Claim lease expired for agent agent-a',
    );
  });

  it('keeps a readable failure reason and supports retry by requeueing', async () => {
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));
    const created = await service.create(createInput('Needs retry'));

    await service.updateStatus(
      created.metadata.id,
      AnnotationStatusEnum.CLAIMED,
    );
    await service.updateStatus(
      created.metadata.id,
      AnnotationStatusEnum.FAILED,
      {
        errorDetails: 'Agent could not verify the live UI',
      },
    );

    const failed = await service.get(created.metadata.id);
    expect(failed?.metadata.errorDetails).toBe(
      'Agent could not verify the live UI',
    );

    const retried = await service.updateStatus(
      created.metadata.id,
      AnnotationStatusEnum.QUEUED,
    );

    expect(retried.metadata.status).toBe(AnnotationStatusEnum.QUEUED);
    expect(retried.metadata.retryCount).toBe(1);
    expect(retried.metadata.claim).toBeUndefined();
    expect(retried.metadata.errorDetails).toBe(
      'Agent could not verify the live UI',
    );
  });
});
