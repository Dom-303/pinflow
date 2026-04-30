import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AnnotationProcessResponse } from '../schema.js';

export interface RunContextPayload {
  generatedAt: string;
  workspaceRoot: string;
  task: AnnotationProcessResponse;
  sourceSnippet?: SourceSnippet;
}

export interface SourceSnippet {
  file: string;
  startLine: number;
  endLine: number;
  targetLine?: number | null;
  text: string;
  truncated: boolean;
}

const SNIPPET_RADIUS = 30;
const MAX_SNIPPET_CHARS = 12_000;

export async function buildRunContextPayload(
  task: AnnotationProcessResponse,
  options: { workspaceRoot: string; now?: () => Date },
): Promise<RunContextPayload> {
  return {
    generatedAt: (options.now ?? (() => new Date()))().toISOString(),
    workspaceRoot: options.workspaceRoot,
    task,
    sourceSnippet: await readSourceSnippet(
      options.workspaceRoot,
      task.sourceLocation,
    ),
  };
}

async function readSourceSnippet(
  workspaceRoot: string,
  source: AnnotationProcessResponse['sourceLocation'],
): Promise<SourceSnippet | undefined> {
  if (!source?.file) return undefined;

  const sourcePath = path.resolve(workspaceRoot, source.file);
  const relativePath = path.relative(workspaceRoot, sourcePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined;
  }

  try {
    const content = await readFile(sourcePath, 'utf8');
    const lines = content.split('\n');
    const targetLine = source.line ?? 1;
    const startLine = Math.max(1, targetLine - SNIPPET_RADIUS);
    const endLine = Math.min(lines.length, targetLine + SNIPPET_RADIUS);
    const snippetLines = lines.slice(startLine - 1, endLine);
    let text = snippetLines
      .map((line, index) => `${startLine + index}: ${line}`)
      .join('\n');
    const truncated = text.length > MAX_SNIPPET_CHARS;
    if (truncated) {
      text = `${text.slice(0, MAX_SNIPPET_CHARS)}\n...`;
    }

    return {
      file: source.file,
      startLine,
      endLine,
      targetLine: source.line,
      text,
      truncated,
    };
  } catch {
    return undefined;
  }
}
