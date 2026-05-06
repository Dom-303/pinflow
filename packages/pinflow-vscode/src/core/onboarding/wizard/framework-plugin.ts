/**
 * Per-app orchestrator: detects PM, installs the framework package, and
 * either auto-patches vite.config or falls back to showing a snippet.
 * @module
 */

import { detectPackageManager } from './package-manager.js';
import { installPackage } from './package-installer.js';
import { patchViteConfig } from './vite-config-patcher.js';
import { getFrameworkConfig } from './app-detection.js';
import { getFrameworkSnippet } from './framework-snippets.js';
import type { FrameworkId } from './app-detection.js';
import type { PackageManagerConfig } from './package-manager.js';

export type FrameworkPluginStatus = 'patched' | 'snippet-only' | 'install-failed';

export interface FrameworkPluginResult {
  readonly status: FrameworkPluginStatus;
  readonly framework: FrameworkId;
  readonly appPath: string;
  readonly detail?: string;
}

export interface FrameworkPluginDeps {
  readonly detectPackageManager: (workspaceRoot: string) => PackageManagerConfig;
  readonly installPackage: (
    appPath: string,
    pkg: string,
    pm: PackageManagerConfig,
    onOutput: (line: string) => void,
  ) => Promise<{ status: 'installed' | 'already-present' | 'failed'; stderr?: string }>;
  readonly patchViteConfig: (
    appPath: string,
    framework: 'react-vite' | 'vue-vite',
  ) => Promise<{ status: 'patched' | 'already-patched' | 'no-config-file' | 'pattern-miss'; configFile?: string }>;
  readonly showSnippetFallback: (input: {
    appPath: string;
    framework: FrameworkId;
    snippet: string;
  }) => Promise<void>;
}

/** No-op stub — the wizard supplies the real VS Code surface. */
async function defaultShowSnippetFallback(_input: {
  appPath: string;
  framework: FrameworkId;
  snippet: string;
}): Promise<void> {
  // intentional no-op
}

const DEFAULT_DEPS: FrameworkPluginDeps = {
  detectPackageManager,
  installPackage,
  patchViteConfig,
  showSnippetFallback: defaultShowSnippetFallback,
};

function isViteFramework(id: FrameworkId): id is 'react-vite' | 'vue-vite' {
  return id === 'react-vite' || id === 'vue-vite';
}

export async function installFrameworkPlugin(
  appPath: string,
  framework: FrameworkId,
  workspaceRoot: string,
  onOutput: (line: string) => void,
  deps: FrameworkPluginDeps = DEFAULT_DEPS,
): Promise<FrameworkPluginResult> {
  // Step 1: Detect package manager from workspace root
  const pm = deps.detectPackageManager(workspaceRoot);

  // Step 2: Resolve framework config (gives package name etc.)
  const fwConfig = getFrameworkConfig(framework);

  // Step 3: Install the framework package
  const installResult = await deps.installPackage(appPath, fwConfig.package, pm, onOutput);

  if (installResult.status === 'failed') {
    return {
      status: 'install-failed',
      framework,
      appPath,
      detail: installResult.stderr,
    };
  }

  // Step 4: Vite frameworks — try auto-patch
  if (isViteFramework(framework)) {
    const patchResult = await deps.patchViteConfig(appPath, framework);

    if (patchResult.status === 'patched' || patchResult.status === 'already-patched') {
      return { status: 'patched', framework, appPath };
    }

    // pattern-miss or no-config-file — fall back to snippet
    const snippet = getFrameworkSnippet(framework);
    await deps.showSnippetFallback({ appPath, framework, snippet });

    return {
      status: 'snippet-only',
      framework,
      appPath,
      detail: patchResult.status,
    };
  }

  // Step 5: All other frameworks — always snippet-only after install
  const snippet = getFrameworkSnippet(framework);
  await deps.showSnippetFallback({ appPath, framework, snippet });

  return { status: 'snippet-only', framework, appPath };
}
