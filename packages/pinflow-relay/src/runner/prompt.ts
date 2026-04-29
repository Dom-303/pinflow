import type { AnnotationProcessResponse } from '../schema.js';

export function buildRunnerPrompt(
  task: AnnotationProcessResponse,
  options: { workspaceRoot: string },
): string {
  const source = task.sourceLocation;
  const element = task.element;
  const lines = [
    'You are processing one PinFlow UI task from the local relay.',
    '',
    'Rules:',
    '- Make only the requested change.',
    '- Use the source location and element context below as the primary target.',
    '- Do not use external APIs for this handoff; this task is already running inside the local agent client.',
    '- Run focused verification when it is practical.',
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
      `- Text: ${element.innerText ?? ''}`,
    );
  }

  if (task.runtimeContext) {
    lines.push(
      '',
      'Runtime context:',
      JSON.stringify(task.runtimeContext, null, 2),
    );
  }

  lines.push(
    '',
    'After finishing, return a short final summary. PinFlow Runner will update the local task status based on the process exit code.',
  );

  return lines.join('\n');
}
