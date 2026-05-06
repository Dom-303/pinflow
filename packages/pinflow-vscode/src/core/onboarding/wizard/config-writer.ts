/**
 * File-system writer for the in-extension wizard.
 * Writes one `pinflow.config.json` per app + appends `.pinflow/` to the
 * workspace-root `.gitignore` once. No vscode imports — pure fs operations.
 *
 * @remarks
 * Always overwrites existing config files. Reconfigure consent is the
 * wizard's responsibility (see `wizard.ts`), not the writer's.
 *
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generatePinflowConfigJson } from './snippets.js';
import type { SnippetInput } from './snippets.js';

export interface WriteConfigBatchInput {
  /** Workspace root — used only for the `.gitignore` location. */
  readonly cwd: string;
  readonly agent: SnippetInput['agent'];
  readonly perApp: readonly {
    readonly appPath: string;
    readonly framework: SnippetInput['framework'];
  }[];
}

const GITIGNORE_BLOCK = '# PinFlow artifacts\n.pinflow/\n';

function hasGitignoreEntry(content: string): boolean {
  return content.includes('.pinflow/');
}

function buildAppendedContent(existing: string): string {
  const separator = existing.endsWith('\n') ? '' : '\n';
  return `${existing}${separator}${GITIGNORE_BLOCK}`;
}

/**
 * Write `pinflow.config.json` for each entry in `perApp` and ensure the
 * workspace-root `.gitignore` contains `.pinflow/` exactly once.
 */
export async function writeWizardConfig(input: WriteConfigBatchInput): Promise<void> {
  // Write per-app configs in parallel — independent files, no race.
  await Promise.all(
    input.perApp.map((entry) => writeAppConfig(entry.appPath, input.agent, entry.framework)),
  );

  // Update gitignore once at the workspace root — non-load-bearing.
  await updateGitignore(path.join(input.cwd, '.gitignore'));
}

async function writeAppConfig(
  appPath: string,
  agent: SnippetInput['agent'],
  framework: SnippetInput['framework'],
): Promise<void> {
  const configPath = path.join(appPath, 'pinflow.config.json');
  const content = generatePinflowConfigJson({ agent, framework, appRoot: appPath });
  await writeFile(configPath, content, 'utf-8');
}

async function updateGitignore(gitignorePath: string): Promise<void> {
  let existing: string | undefined;

  try {
    existing = await readFile(gitignorePath, 'utf-8');
  } catch {
    // File doesn't exist — create it with the block.
  }

  if (existing === undefined) {
    await writeFile(gitignorePath, GITIGNORE_BLOCK, 'utf-8');
    return;
  }

  if (hasGitignoreEntry(existing)) {
    return;
  }

  await writeFile(gitignorePath, buildAppendedContent(existing), 'utf-8');
}
