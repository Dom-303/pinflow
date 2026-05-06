/**
 * Pure config-content generator for the in-extension wizard.
 * No fs, no vscode, no spawn — safe to call in any context.
 * @module
 */

export interface SnippetInput {
  readonly agent: 'codex' | 'claude-code' | 'copilot' | 'other';
  readonly framework: 'vite' | 'webpack' | 'next' | 'nuxt';
  readonly appRoot: string;
}

type RunnerProvider = 'codex' | 'claude';

function agentToProvider(agent: SnippetInput['agent']): RunnerProvider {
  return agent === 'claude-code' ? 'claude' : 'codex';
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
    framework: input.framework,
    runner: {
      provider: agentToProvider(input.agent),
    },
  };

  return JSON.stringify(config, null, 2);
}
