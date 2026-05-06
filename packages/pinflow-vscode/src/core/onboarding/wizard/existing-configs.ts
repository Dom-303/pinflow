/**
 * Detects which app paths already have a `pinflow.config.json`.
 * Pure fs concern — no vscode imports.
 * @module
 */
import { access } from 'node:fs/promises';
import path from 'node:path';

export interface ExistingConfigsDeps {
  readonly access: (path: string) => Promise<void>;
}

const DEFAULT_DEPS: ExistingConfigsDeps = {
  access: (p) => access(p),
};

/**
 * For each app path, check whether `${appPath}/pinflow.config.json` exists.
 * Returns the subset that do exist. Runs `access()` calls in parallel.
 */
export async function detectExistingConfigs(
  appPaths: readonly string[],
  deps: ExistingConfigsDeps = DEFAULT_DEPS,
): Promise<string[]> {
  if (appPaths.length === 0) return [];

  const checks = appPaths.map(async (appPath) => {
    const configPath = path.join(appPath, 'pinflow.config.json');
    try {
      await deps.access(configPath);
      return appPath;
    } catch {
      return undefined;
    }
  });

  const results = await Promise.all(checks);
  return results.filter((p): p is string => p !== undefined);
}
