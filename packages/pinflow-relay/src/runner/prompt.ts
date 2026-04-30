import type { AnnotationProcessResponse } from '../schema.js';

export function buildRunnerPrompt(
  task: AnnotationProcessResponse,
  options: { workspaceRoot: string; contextPath?: string },
): string {
  const source = task.sourceLocation;
  const element = task.element;
  const lines = [
    'PinFlow task. Edit the local repo.',
    '',
    'Rules:',
    '- Make only the requested change.',
    '- Use the source target first. Do not guess a different file unless the target is clearly wrong.',
    '- Read the context file only if the target is ambiguous or more UI/runtime detail is needed.',
    '- Do not use external APIs for this handoff.',
    '- Run the smallest focused verification that proves the change. Use broad checks only when needed.',
    '- End with a concise summary of what changed.',
    '',
    `Workspace: ${options.workspaceRoot}`,
    `Annotation ID: ${task.annotationId ?? 'unknown'}`,
    '',
    'User request:',
    task.userIntent ?? '(no user message)',
  ];

  if (source) {
    lines.push(
      '',
      'Source target:',
      `- File: ${source.file}`,
      `- Line: ${source.line ?? 'unknown'}`,
      `- Column: ${source.column ?? 'unknown'}`,
      `- Component: ${source.componentName ?? 'unknown'}`,
      `- Tag: ${source.tagName ?? 'unknown'}`,
    );
  }

  if (element) {
    lines.push(
      '',
      'Selected element:',
      `- Tag: ${element.tagName}`,
      `- data-ds: ${element.dataDs ?? 'unknown'}`,
      `- Selector: ${element.selector}`,
      `- Text: ${trimText(element.innerText ?? '', 180)}`,
    );
  }

  const runtimeSummary = summarizeRuntimeContext(task.runtimeContext);
  if (runtimeSummary.length > 0) {
    lines.push(
      '',
      'Runtime summary:',
      ...runtimeSummary,
    );
  }

  if (options.contextPath) {
    lines.push(
      '',
      `Full context file: ${options.contextPath}`,
      'Use it only when the compact task above is not enough.',
    );
  }

  lines.push(
    '',
    'Return a short final summary. PinFlow Runner will record the diff and status.',
  );

  return lines.join('\n');
}

function summarizeRuntimeContext(
  runtimeContext: AnnotationProcessResponse['runtimeContext'],
): string[] {
  if (!runtimeContext) return [];

  const lines: string[] = [];
  const props = runtimeContext.componentProps;
  const state = runtimeContext.componentState;
  const propKeys = objectKeys(props);
  const stateKeys = objectKeys(state);

  if (propKeys.length > 0) {
    lines.push(`- Props keys: ${propKeys.slice(0, 12).join(', ')}`);
  }
  if (stateKeys.length > 0) {
    lines.push(`- State keys: ${stateKeys.slice(0, 12).join(', ')}`);
  }
  return lines;
}

function objectKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.keys(value);
}

function trimText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}
