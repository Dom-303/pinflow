import { readFile } from 'node:fs/promises';

import { estimateCostUsd } from './pricing.js';
import { parseTranscriptMetadata } from './transcript-metadata.js';

export interface RunCostMetadata {
  durationMs?: number;
  model?: string;
  totalTokens?: number;
  costUsd?: number;
}

export interface BuildRunCostMetadataInput {
  /** Filesystem path to the agent transcript (text, not JSONL). */
  readonly transcriptPath: string;
  /** ISO timestamp captured when the runner claimed the annotation. */
  readonly startedAt: string;
  /** ISO timestamp captured when the runner finalised the run. */
  readonly finishedAt: string;
  /**
   * Model parsed from the CLI command (e.g. `-m gpt-5.5`). Used as a
   * fallback when the transcript header is missing or unparseable —
   * the boot header is the more reliable source when present.
   */
  readonly fallbackModel?: string;
}

/**
 * Reads the run transcript and derives cost-relevant metadata for
 * the run summary: model identifier, total token usage, an estimated
 * USD cost, and wallclock duration. Designed to never throw — a
 * missing or malformed transcript yields a record with `undefined`
 * fields rather than a runtime error.
 */
export async function buildRunCostMetadata(
  input: BuildRunCostMetadataInput,
): Promise<RunCostMetadata> {
  const transcript = await readFile(input.transcriptPath, 'utf8').catch(
    () => '',
  );
  const parsed = parseTranscriptMetadata(transcript);

  const model = parsed.model ?? input.fallbackModel;
  const totalTokens = parsed.totalTokens;
  const costUsd = estimateCostUsd({ model, totalTokens });
  const durationMs = computeDurationMs(input.startedAt, input.finishedAt);

  return { model, totalTokens, costUsd, durationMs };
}

function computeDurationMs(
  startedAt: string,
  finishedAt: string,
): number | undefined {
  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  if (end < start) return undefined;
  return end - start;
}
