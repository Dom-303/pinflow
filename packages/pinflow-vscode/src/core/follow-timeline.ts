import { readFile } from 'node:fs/promises';

import type { PinFlowRunEvidence } from './run-evidence.js';

export interface FollowTimelineItem {
  readonly label: string;
}

export interface FollowTimelineOptions {
  readonly mode?: 'concise' | 'raw';
  readonly maxLines?: number;
}

export async function buildFollowTimelineItems(
  evidence: PinFlowRunEvidence | null,
  options: FollowTimelineOptions = {},
): Promise<FollowTimelineItem[]> {
  if (!evidence?.transcriptPath) return [];

  const transcript = await readFile(evidence.transcriptPath, 'utf8').catch(
    () => '',
  );
  if (!transcript.trim()) return [];

  if (options.mode === 'raw') {
    return buildRawTimeline(transcript, options.maxLines ?? 8);
  }

  const labels = dedupe(
    transcript
      .split('\n')
      .map((line) => formatConciseLine(line))
      .filter((line): line is string => Boolean(line)),
  );

  return labels.length
    ? [{ label: 'Timeline' }, ...labels.map((label) => ({ label }))]
    : [];
}

function buildRawTimeline(
  transcript: string,
  maxLines: number,
): FollowTimelineItem[] {
  const lines = transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-Math.max(1, maxLines));

  return lines.length
    ? [{ label: 'Raw transcript' }, ...lines.map((label) => ({ label }))]
    : [];
}

function dedupe(lines: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    deduped.push(line);
  }

  return deduped;
}

function formatConciseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('[pinflow-runner]')) {
    return formatPinFlowRunnerLine(trimmed);
  }

  if (trimmed.startsWith('[pinflow-external]')) {
    return formatPinFlowExternalLine(trimmed);
  }

  if (/^(warning|warn|20\d\d-\d\d-\d\dT)/i.test(trimmed)) return null;
  if (
    /^(OpenAI Codex|workdir:|model:|provider:|approval:|sandbox:|reasoning|session id:|user$|Rules:|Workspace:|Annotation ID:|Source target:|Selected element:|tokens used$|diff --git)/i.test(
      trimmed,
    )
  ) {
    return null;
  }

  if (/^[-]{3,}$/.test(trimmed)) return null;
  if (trimmed.startsWith('- ')) return null;
  if (/^[+-]{3} /.test(trimmed)) return null;
  if (/^@@ /.test(trimmed)) return null;
  if (/^[+-]\s/.test(trimmed)) return null;
  if (/^(exec|succeeded)\b/i.test(trimmed)) return null;

  if (/^Verification\b/i.test(trimmed)) {
    return sanitizeAgentLine(trimmed);
  }

  if (/^(Changed|Updated|Done|Reduced|Increased|Adjusted|Made|Fixed|Created|Removed|Geaendert|Erledigt|Fertig|Angepasst|Reduziert)/i.test(trimmed)) {
    return `Agent: ${sanitizeAgentLine(trimmed)}`;
  }

  if (/error|failed|fehler/i.test(trimmed)) {
    return `Agent: ${sanitizeAgentLine(trimmed)}`;
  }

  return null;
}

function formatPinFlowRunnerLine(line: string): string | null {
  if (
    line.includes('Run created:') ||
    line.includes('Run evidence:') ||
    line.includes('Claimed annotation')
  ) {
    return 'Task started';
  }

  if (line.includes('Command exited with code 0')) return 'Done';

  if (line.includes('Failed:')) {
    return `Failed: ${line.split('Failed:')[1]?.trim() ?? 'unknown error'}`;
  }

  if (/Command exited with code [1-9]/.test(line)) return 'Failed';

  return null;
}

function formatPinFlowExternalLine(line: string): string | null {
  if (line.includes('Claimed annotation')) return 'Task started';
  if (line.includes('Completed')) return 'Done';
  if (line.includes('Failed')) return 'Failed';
  return null;
}

function sanitizeAgentLine(line: string): string {
  const normalized = line
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.length <= 180
    ? normalized
    : `${normalized.slice(0, 177)}...`;
}
