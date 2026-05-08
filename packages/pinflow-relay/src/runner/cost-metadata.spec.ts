import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildRunCostMetadata } from './cost-metadata.js';
import { MODEL_BLENDED_USD_PER_MILLION_TOKENS } from './pricing.js';

describe('buildRunCostMetadata', () => {
  let workspaceRoot: string;
  let transcriptPath: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-cost-'));
    transcriptPath = path.join(workspaceRoot, 'transcript.log');
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('derives model, tokens, cost, and duration from a complete transcript', async () => {
    const transcript = [
      '[pinflow-runner] Run created',
      'OpenAI Codex v0.128.0',
      '--------',
      'workdir: /tmp',
      'model: gpt-5.5',
      'provider: openai',
      '--------',
      'tokens used',
      '12,000',
    ].join('\n');
    await writeFile(transcriptPath, transcript, 'utf8');

    const metadata = await buildRunCostMetadata({
      transcriptPath,
      startedAt: '2026-05-08T10:00:00.000Z',
      finishedAt: '2026-05-08T10:00:30.500Z',
    });

    expect(metadata.model).toBe('gpt-5.5');
    expect(metadata.totalTokens).toBe(12_000);
    expect(metadata.costUsd).toBe(
      Math.round(
        ((12_000 / 1_000_000) *
          MODEL_BLENDED_USD_PER_MILLION_TOKENS['gpt-5.5']) *
          10_000,
      ) / 10_000,
    );
    expect(metadata.durationMs).toBe(30_500);
  });

  it('uses the fallback model when the transcript has no header', async () => {
    const transcript = ['some output', 'tokens used', '500'].join('\n');
    await writeFile(transcriptPath, transcript, 'utf8');

    const metadata = await buildRunCostMetadata({
      transcriptPath,
      startedAt: '2026-05-08T10:00:00.000Z',
      finishedAt: '2026-05-08T10:00:01.000Z',
      fallbackModel: 'gpt-5-mini',
    });

    expect(metadata.model).toBe('gpt-5-mini');
    expect(metadata.totalTokens).toBe(500);
    expect(metadata.costUsd).not.toBeUndefined();
  });

  it('returns undefined cost when the model is unknown but other fields stay populated', async () => {
    const transcript = ['model: llama-99-xl', 'tokens used', '100'].join('\n');
    await writeFile(transcriptPath, transcript, 'utf8');

    const metadata = await buildRunCostMetadata({
      transcriptPath,
      startedAt: '2026-05-08T10:00:00.000Z',
      finishedAt: '2026-05-08T10:00:00.500Z',
    });

    expect(metadata.model).toBe('llama-99-xl');
    expect(metadata.totalTokens).toBe(100);
    expect(metadata.costUsd).toBeUndefined();
    expect(metadata.durationMs).toBe(500);
  });

  it('returns an all-undefined record when the transcript file is missing (fail-safe)', async () => {
    const metadata = await buildRunCostMetadata({
      transcriptPath: path.join(workspaceRoot, 'does-not-exist.log'),
      startedAt: '2026-05-08T10:00:00.000Z',
      finishedAt: '2026-05-08T10:00:00.500Z',
    });

    expect(metadata.model).toBeUndefined();
    expect(metadata.totalTokens).toBeUndefined();
    expect(metadata.costUsd).toBeUndefined();
    expect(metadata.durationMs).toBe(500);
  });

  it('returns undefined duration when timestamps are unparseable', async () => {
    await writeFile(transcriptPath, '', 'utf8');

    const metadata = await buildRunCostMetadata({
      transcriptPath,
      startedAt: 'not-a-date',
      finishedAt: 'also-not-a-date',
    });

    expect(metadata.durationMs).toBeUndefined();
  });
});
