/**
 * Regex-based vite.config patcher with backup, idempotency, and validation.
 * @module
 */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type ViteFramework = 'react-vite' | 'vue-vite';

export type PatchStatus = 'patched' | 'already-patched' | 'no-config-file' | 'pattern-miss';

export interface PatchResult {
  readonly status: PatchStatus;
  readonly configFile?: string;
  readonly backupFile?: string;
  readonly importLine?: number;
  readonly pluginLine?: number;
}

export interface VitePatcherDeps {
  readonly readFile: (p: string) => Promise<string>;
  readonly writeFile: (p: string, content: string) => Promise<void>;
  readonly copyFile: (src: string, dest: string) => Promise<void>;
  readonly fileExists: (p: string) => boolean;
}

const CONFIG_CANDIDATES = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'] as const;

const FRAMEWORK_BINDINGS: Record<ViteFramework, { importLine: string; factoryName: string }> = {
  'react-vite': {
    importLine: "import { pinflow } from '@pinflow/react/vite';",
    factoryName: 'react',
  },
  'vue-vite': {
    importLine: "import { pinflow } from '@pinflow/vue/vite';",
    factoryName: 'vue',
  },
};

const ALREADY_PATCHED_RE = /@pinflow\/(react|vue)\/vite/;
const TOP_LEVEL_IMPORT_RE = /^import .+;?\s*$/;
const PLUGINS_ARRAY_RE = /plugins\s*:\s*\[/;
const PINFLOW_CALL_RE = /\bpinflow\s*\(\s*\)/;
const FACTORY_COUNT_RE = /\b\w+\(/g;

function defaultDeps(): VitePatcherDeps {
  return {
    readFile: (p) => readFile(p, 'utf8'),
    writeFile: (p, content) => writeFile(p, content, 'utf8'),
    copyFile: (src, dest) => copyFile(src, dest),
    fileExists: (p) => existsSync(p),
  };
}

function locateConfigFile(appPath: string, deps: VitePatcherDeps): string | undefined {
  for (const candidate of CONFIG_CANDIDATES) {
    const full = path.join(appPath, candidate);
    if (deps.fileExists(full)) return full;
  }
  return undefined;
}

function countFactoryCalls(source: string): number {
  return (source.match(FACTORY_COUNT_RE) ?? []).length;
}

function insertImport(
  lines: string[],
  importLine: string,
): { lines: string[]; lineNumber: number } | undefined {
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (TOP_LEVEL_IMPORT_RE.test(lines[i])) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) return undefined;

  const result = [
    ...lines.slice(0, lastImportIndex + 1),
    importLine,
    ...lines.slice(lastImportIndex + 1),
  ];

  return { lines: result, lineNumber: lastImportIndex + 2 };
}

function buildFactoryRe(factoryName: string): RegExp {
  return new RegExp(`(^|[^A-Za-z0-9_])${factoryName}\\s*\\([^)]*\\)`);
}

function insertPlugin(
  lines: string[],
  factoryName: string,
): { lines: string[]; lineNumber: number } | undefined {
  // Find the plugins: [ line
  const pluginsLineIndex = lines.findIndex((l) => PLUGINS_ARRAY_RE.test(l));
  if (pluginsLineIndex === -1) return undefined;

  const factoryRe = buildFactoryRe(factoryName);

  // Search for the factory call in subsequent lines
  let factoryLineIndex = -1;
  for (let i = pluginsLineIndex; i < lines.length; i++) {
    if (factoryRe.test(lines[i])) {
      factoryLineIndex = i;
      break;
    }
  }

  if (factoryLineIndex !== -1) {
    // Insert pinflow() immediately after the factory line, preserving indent
    const factoryLine = lines[factoryLineIndex];
    const indent = factoryLine.match(/^(\s*)/)?.[1] ?? '';

    // Add a trailing comma to the factory line if missing
    const trimmed = factoryLine.trimEnd();
    const withComma = trimmed.endsWith(',') ? trimmed : trimmed + ',';
    const updatedFactoryLine = withComma;

    const pinflowLine = `${indent}pinflow(),`;
    const insertAt = factoryLineIndex + 1;

    const result = [
      ...lines.slice(0, factoryLineIndex),
      updatedFactoryLine,
      pinflowLine,
      ...lines.slice(insertAt),
    ];

    return { lines: result, lineNumber: insertAt + 1 };
  }

  // Fallback: insert after the opening [ of plugins array
  // Find the [ on the plugins line or the next line
  let bracketLineIndex = pluginsLineIndex;
  let bracketCol = lines[pluginsLineIndex].indexOf('[', lines[pluginsLineIndex].search(PLUGINS_ARRAY_RE));

  if (bracketCol === -1) {
    // Opening [ might be on a subsequent line
    for (let i = pluginsLineIndex + 1; i < lines.length; i++) {
      const col = lines[i].indexOf('[');
      if (col !== -1) {
        bracketLineIndex = i;
        bracketCol = col;
        break;
      }
    }
    if (bracketCol === -1) return undefined;
  }

  // Splice '\n    pinflow(),' after the [ on bracketLineIndex
  const bracketLine = lines[bracketLineIndex];
  const before = bracketLine.slice(0, bracketCol + 1);
  const after = bracketLine.slice(bracketCol + 1);

  const updatedLine = `${before}\n    pinflow(),${after}`;
  const result = [...lines.slice(0, bracketLineIndex), updatedLine, ...lines.slice(bracketLineIndex + 1)];

  // The plugin call lands on the line after the bracket line (logically)
  return { lines: result, lineNumber: bracketLineIndex + 2 };
}

function validate(original: string, patched: string): boolean {
  if (!ALREADY_PATCHED_RE.test(patched)) return false;
  if (!PINFLOW_CALL_RE.test(patched)) return false;
  if (countFactoryCalls(patched) < countFactoryCalls(original)) return false;
  return true;
}

export async function patchViteConfig(
  appPath: string,
  framework: ViteFramework,
  deps: VitePatcherDeps = defaultDeps(),
): Promise<PatchResult> {
  // Step 1: Locate config
  const configFile = locateConfigFile(appPath, deps);
  if (configFile === undefined) {
    return { status: 'no-config-file' };
  }

  // Step 2: Idempotency check
  const original = await deps.readFile(configFile);
  if (ALREADY_PATCHED_RE.test(original)) {
    return { status: 'already-patched', configFile };
  }

  // Step 3: Backup
  const backupFile = configFile + '.pinflow-backup';
  await deps.copyFile(configFile, backupFile);

  const bindings = FRAMEWORK_BINDINGS[framework];

  // Step 4: Insert import
  const lines = original.split('\n');
  const importResult = insertImport(lines, bindings.importLine);
  if (importResult === undefined) {
    return { status: 'pattern-miss', configFile, backupFile };
  }

  // Step 5: Insert plugin
  const pluginResult = insertPlugin(importResult.lines, bindings.factoryName);
  if (pluginResult === undefined) {
    return { status: 'pattern-miss', configFile, backupFile };
  }

  const patched = pluginResult.lines.join('\n');

  // Step 6: Validate
  if (!validate(original, patched)) {
    return { status: 'pattern-miss', configFile, backupFile };
  }

  // Step 7: Write
  await deps.writeFile(configFile, patched);

  return {
    status: 'patched',
    configFile,
    backupFile,
    importLine: importResult.lineNumber,
    pluginLine: pluginResult.lineNumber,
  };
}
