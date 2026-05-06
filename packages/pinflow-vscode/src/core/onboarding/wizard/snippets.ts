/**
 * Pure config-content generator for the in-extension wizard.
 * No fs, no vscode, no spawn — safe to call in any context.
 * @module
 */

import type { FrameworkId } from './app-detection.js';

export interface SnippetInput {
  readonly agent: 'codex' | 'claude-code' | 'copilot' | 'other';
  readonly framework: FrameworkId;
  readonly appRoot: string;
}

type RunnerProvider = 'codex' | 'claude';

function agentToProvider(agent: SnippetInput['agent']): RunnerProvider {
  return agent === 'claude-code' ? 'claude' : 'codex';
}

/**
 * Map FrameworkId back to the legacy runtime bucket that
 * `pinflow.config.json` and `@pinflow/core` schema accept.
 */
function frameworkBucket(id: FrameworkId): 'vite' | 'webpack' | 'next' | 'nuxt' {
  if (id === 'next') return 'next';
  if (id === 'nuxt') return 'nuxt';
  if (id.endsWith('-vite')) return 'vite';
  return 'webpack';
}

/**
 * Generate the content of `pinflow.config.json` for the given wizard inputs.
 *
 * Shape matches what `pinflow init` produces:
 * ```json
 * {
 *   "appRoot": ".",
 *   "framework": "vite",
 *   "runner": { "provider": "codex" }
 * }
 * ```
 */
export function generatePinflowConfigJson(input: SnippetInput): string {
  const config = {
    appRoot: '.',
    framework: frameworkBucket(input.framework),
    runner: {
      provider: agentToProvider(input.agent),
    },
  };

  return JSON.stringify(config, null, 2);
}
