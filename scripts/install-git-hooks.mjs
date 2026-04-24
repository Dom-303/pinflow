#!/usr/bin/env node
/**
 * One-shot activator for the repo's shared git hooks.
 *
 * Run once per clone with `pnpm hooks:install`. Points git's local
 * hooks config at `scripts/git-hooks/` — the hooks are version-tracked
 * in that directory so everyone gets the same advisory warnings.
 *
 * Deactivate with `git config --unset core.hooksPath`.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = 'scripts/git-hooks';

try {
  execFileSync('git', ['config', 'core.hooksPath', hooksDir], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
  console.log(
    `[pinflow] git hooks activated (core.hooksPath=${hooksDir}). Deactivate with \`git config --unset core.hooksPath\`.`,
  );
} catch (error) {
  console.error(
    `[pinflow] Failed to set git hooks: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}
