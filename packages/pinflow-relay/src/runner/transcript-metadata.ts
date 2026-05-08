/**
 * Pulls cost-relevant metadata out of a Codex transcript file.
 *
 * Codex emits a plain-text TUI log (not JSONL), so we recover the
 * agent model from the boot header (`model: gpt-5.5`) and the total
 * token count from the trailing usage line (`tokens used\n18,480`).
 * Both fields are advisory: a malformed transcript yields
 * `undefined`, never an exception.
 */

const MODEL_HEADER_PATTERN = /^model:\s*([^\s]+)\s*$/m;
const TOKENS_USED_PATTERN = /^tokens used\s*\r?\n\s*([\d,]+)\s*$/im;

export interface TranscriptMetadata {
  readonly model?: string;
  readonly totalTokens?: number;
}

export function parseTranscriptMetadata(transcript: string): TranscriptMetadata {
  return {
    model: parseModel(transcript),
    totalTokens: parseTotalTokens(transcript),
  };
}

function parseModel(transcript: string): string | undefined {
  const match = transcript.match(MODEL_HEADER_PATTERN);
  return match?.[1];
}

function parseTotalTokens(transcript: string): number | undefined {
  const match = transcript.match(TOKENS_USED_PATTERN);
  if (!match) return undefined;

  const digits = match[1].replace(/,/g, '');
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}
