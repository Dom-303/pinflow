export type RunOutputMode = 'concise' | 'raw';

export function formatConciseChunk(text: string): {
  output: string;
  pendingLine: string;
} {
  const endsWithNewline = text.endsWith('\n');
  const lines = text.split('\n');
  const pendingLine = endsWithNewline ? '' : (lines.pop() ?? '');
  const completeLines = endsWithNewline ? lines.slice(0, -1) : lines;
  const output = completeLines
    .map((line) => formatConciseLine(line))
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    output: output ? `${output}\n` : '',
    pendingLine,
  };
}

export function dedupeConciseOutput(output: string, seen: Set<string>): string {
  const lines = output.split('\n').filter(Boolean);
  const deduped = lines.filter((line) => {
    if (seen.has(line)) {
      return false;
    }
    seen.add(line);
    return true;
  });
  return deduped.length ? `${deduped.join('\n')}\n` : '';
}

function formatConciseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('[pinflow-runner]')) {
    return formatPinflowRunnerLine(trimmed);
  }
  if (trimmed.startsWith('[pinflow-external]')) {
    return formatPinflowExternalLine(trimmed);
  }

  if (/^(warning|warn|20\d\d-\d\d-\d\dT)/i.test(trimmed)) return null;
  if (
    trimmed.startsWith('<') ||
    trimmed.includes('Cloudflare') ||
    trimmed.includes('__cf_chl') ||
    trimmed.includes('chatgpt.com/backend-api') ||
    trimmed.includes('codex_core_plugins') ||
    trimmed.includes('codex_core_skills') ||
    trimmed.includes('codex_analytics')
  ) {
    return null;
  }

  if (
    /^(OpenAI Codex|workdir:|model:|provider:|approval:|sandbox:|reasoning|session id:|user$|Rules:|Workspace:|Annotation ID:|Source target:|Selected element:|tokens used$|diff --git)/i.test(
      trimmed,
    )
  ) {
    return null;
  }

  if (/^[-–—]{3,}$/.test(trimmed)) return null;
  if (trimmed.startsWith('- ')) return null;
  if (/^[+-]{3} /.test(trimmed)) return null;
  if (/^@@ /.test(trimmed)) return null;
  if (/^[+-]\s/.test(trimmed)) return null;

  if (/^failed\b/i.test(trimmed)) {
    return `[agent] ${sanitizeAgentLine(trimmed)}`;
  }

  if (/^(exec|succeeded)\b/i.test(trimmed)) return null;
  if (/^\|.*\|$/.test(trimmed)) return null;

  if (
    /^(Verification|Changed|Updated|Done|Reduced|Increased|Adjusted|Made|Fixed|Created|Removed|Geaendert|Erledigt|Fertig|Angepasst|Reduziert)/i.test(
      trimmed,
    )
  ) {
    return `[agent] ${sanitizeAgentLine(trimmed)}`;
  }

  if (/error|failed|fehler/i.test(trimmed)) {
    return `[agent] ${sanitizeAgentLine(trimmed)}`;
  }

  return null;
}

function formatPinflowRunnerLine(line: string): string | null {
  if (
    line.includes('Run created:') ||
    line.includes('Run evidence:') ||
    line.includes('Claimed annotation')
  ) {
    return '[pinflow] Task started';
  }

  if (line.includes('Command exited with code 0')) {
    return '[pinflow] Done';
  }

  if (line.includes('Failed:')) {
    return `[pinflow] Failed: ${line.split('Failed:')[1]?.trim() ?? 'unknown error'}`;
  }

  if (/Command exited with code [1-9]/.test(line)) {
    return '[pinflow] Failed';
  }

  return null;
}

function formatPinflowExternalLine(line: string): string | null {
  if (line.includes('Claimed annotation')) return '[pinflow] Task started';
  if (line.includes('Completed')) return '[pinflow] Done';
  if (line.includes('Failed')) return '[pinflow] Failed';
  return null;
}

function sanitizeAgentLine(line: string): string {
  const normalized = line
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}
