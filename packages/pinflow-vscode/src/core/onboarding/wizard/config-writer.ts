/**
 * File-system writer for the in-extension wizard.
 * Writes `pinflow.config.json` and appends `.pinflow/` to `.gitignore`.
 * No vscode imports — pure fs operations.
 * @module
 */

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generatePinflowConfigJson } from './snippets.js';
import type { SnippetInput } from './snippets.js';

export interface WriteConfigInput {
  readonly cwd: string;
  readonly agent: SnippetInput['agent'];
  readonly framework: SnippetInput['framework'];
  readonly appRoot: string;
}

const GITIGNORE_BLOCK = '# PinFlow artifacts\n.pinflow/\n';

/**
 * Returns true when the gitignore content already contains `.pinflow/`.
 *
 * Uses a literal substring match — sufficient because `.pinflow/` is the
 * canonical form we write, and the check is idempotent by design.
 */
function hasGitignoreEntry(content: string): boolean {
  return content.includes('.pinflow/');
}

/**
 * Append the `.pinflow/` block to an existing `.gitignore`.
 * Ensures exactly one newline separates the existing content from the block.
 */
function buildAppendedContent(existing: string): string {
  const separator = existing.endsWith('\n') ? '' : '\n';
  return `${existing}${separator}${GITIGNORE_BLOCK}`;
}

/**
 * Write `pinflow.config.json` + update `.gitignore` for the given wizard inputs.
 *
 * @remarks
 * - Throws if `pinflow.config.json` already exists — caller must guard.
 * - `.gitignore` is created if absent, appended if present without the entry,
 *   and left untouched if the entry is already present.
 */
export async function writeWizardConfig(input: WriteConfigInput): Promise<void> {
  const configPath = path.join(input.cwd, 'pinflow.config.json');

  // Guard: throw early if config already exists.
  const configExists = await access(configPath).then(
    () => true,
    () => false,
  );
  if (configExists) {
    throw new Error(`pinflow.config.json already exists at ${configPath}`);
  }

  // Write pinflow.config.json first — it is the configured-state marker.
  const configContent = generatePinflowConfigJson({
    agent: input.agent,
    framework: input.framework,
    appRoot: input.appRoot,
  });
  await writeFile(configPath, configContent, 'utf-8');

  // Update .gitignore second — non-load-bearing.
  await updateGitignore(path.join(input.cwd, '.gitignore'));
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
    // Already contains .pinflow/ — no-op.
    return;
  }

  await writeFile(gitignorePath, buildAppendedContent(existing), 'utf-8');
}
