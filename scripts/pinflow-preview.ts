import { execSync, spawn } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  buildPreviewPlan,
  PINFLOW_PREVIEW_REGISTRY_PORT,
  PINFLOW_PREVIEW_REGISTRY_URL,
  type PinflowPreviewOptions,
} from '../packages/pinflow-test-fixtures/shared/pinflow-preview.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..');
const baseVerdaccioConfigPath = resolve(workspaceRoot, '.verdaccio/config.yml');
const previewRegistryDir = resolve(
  workspaceRoot,
  'tmp/pinflow-preview-registry',
);
const previewRegistryStorageDir = resolve(previewRegistryDir, 'storage');
const previewRegistryConfigPath = resolve(previewRegistryDir, 'config.yml');
const REGISTRY_PING_URL = `${PINFLOW_PREVIEW_REGISTRY_URL}/-/ping`;

function parseArgs(argv: string[]): PinflowPreviewOptions {
  const options: PinflowPreviewOptions = {
    fixtureId: 'vite-v5-react-18-ts',
    port: 4301,
    prepareOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--fixture') {
      options.fixtureId = argv[index + 1] ?? options.fixtureId;
      index += 1;
      continue;
    }

    if (value === '--port') {
      const parsed = Number(argv[index + 1]);
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.port = parsed;
      }
      index += 1;
      continue;
    }

    if (value === '--prepare-only') {
      options.prepareOnly = true;
    }
  }

  return options;
}

async function isRegistryReady(): Promise<boolean> {
  try {
    const response = await fetch(REGISTRY_PING_URL);
    return response.ok;
  } catch {
    return false;
  }
}

function stopRegistryOnPreviewPort(): void {
  try {
    const output = execSync(`lsof -ti tcp:${PINFLOW_PREVIEW_REGISTRY_PORT}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, FORCE_COLOR: '0' },
    })
      .toString()
      .trim();

    if (!output) {
      return;
    }

    for (const pid of output.split('\n')) {
      execSync(`kill ${pid}`, {
        stdio: 'ignore',
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0' },
      });
    }
  } catch {
    // No existing preview registry is fine.
  }
}

function resetPreviewRegistryStorage(): void {
  rmSync(previewRegistryDir, { recursive: true, force: true });
  mkdirSync(previewRegistryDir, { recursive: true });
}

function writePreviewRegistryConfig(): void {
  const source = readFileSync(baseVerdaccioConfigPath, 'utf-8');
  const updated = source.replace(
    /^storage:.*$/m,
    `storage: ${previewRegistryStorageDir}`,
  );

  writeFileSync(previewRegistryConfigPath, updated);
}

async function ensurePreviewRegistry(): Promise<void> {
  stopRegistryOnPreviewPort();
  resetPreviewRegistryStorage();
  writePreviewRegistryConfig();

  const child = spawn(
    'corepack',
    [
      'pnpm',
      'exec',
      'verdaccio',
      '--listen',
      `127.0.0.1:${PINFLOW_PREVIEW_REGISTRY_PORT}`,
      '--config',
      previewRegistryConfigPath,
    ],
    {
      cwd: workspaceRoot,
      detached: true,
      stdio: 'ignore',
    },
  );

  child.unref();

  const startedAt = Date.now();
  while (Date.now() - startedAt < 15_000) {
    if (await isRegistryReady()) {
      return;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error('PinFlow preview registry did not become ready within 15 seconds.');
}

function runCommand(command: string, cwd: string): void {
  execSync(command, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  console.log(`[pinflow-preview] Preparing ${options.fixtureId}`);
  await ensurePreviewRegistry();

  const plan = buildPreviewPlan(options, workspaceRoot);

  for (const step of plan.steps) {
    console.log(`[pinflow-preview] ${step.label}: ${step.command}`);
    runCommand(step.command, step.cwd);
  }

  if (plan.prepareOnly) {
    console.log(
      `[pinflow-preview] Ready. Start the fixture manually in ${plan.fixturePath}`,
    );
    return;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
