import { execSync, spawn, type ChildProcess } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  buildPreviewPlan,
  PINFLOW_PREVIEW_REGISTRY_PORT,
  PINFLOW_PREVIEW_REGISTRY_URL,
  type PinflowPreviewOptions,
  type PinflowPreviewStep,
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

interface SmokeProbe {
  readonly label: string;
  readonly path: string;
  readonly mustContain?: string;
}

const PREVIEW_READY_TIMEOUT_MS = 30_000;
const PREVIEW_READY_POLL_MS = 500;

function getPreviewSmokeProbes(): SmokeProbe[] {
  const overlaySrc = `/@fs${resolve(
    workspaceRoot,
    'packages/pinflow-overlay/src/components/ds-overlay.ts',
  )}`;

  return [
    { label: 'root page', path: '/' },
    { label: 'overlay init shim', path: '/pinflow-local-overlay-init.ts' },
    {
      label: 'overlay root component (decorators transformed)',
      path: overlaySrc,
      mustContain: '__decorateClass',
    },
  ];
}

async function waitForDevServer(port: number): Promise<void> {
  const startedAt = Date.now();
  const baseUrl = `http://127.0.0.1:${port}/`;

  while (Date.now() - startedAt < PREVIEW_READY_TIMEOUT_MS) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not yet listening.
    }
    await new Promise((resolveDelay) =>
      setTimeout(resolveDelay, PREVIEW_READY_POLL_MS),
    );
  }

  throw new Error(
    `PinFlow preview dev server did not become ready on port ${port} within ${PREVIEW_READY_TIMEOUT_MS / 1000}s.`,
  );
}

async function runPreviewSmokeCheck(port: number): Promise<void> {
  const probes = getPreviewSmokeProbes();
  const failures: string[] = [];

  for (const probe of probes) {
    const url = `http://127.0.0.1:${port}${probe.path}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        failures.push(`${probe.label}: HTTP ${response.status} on ${probe.path}`);
        continue;
      }

      if (probe.mustContain) {
        const body = await response.text();
        if (!body.includes(probe.mustContain)) {
          failures.push(
            `${probe.label}: expected body to contain "${probe.mustContain}" (path: ${probe.path})`,
          );
        }
      }
    } catch (error) {
      failures.push(
        `${probe.label}: request failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures.length === 0) {
    console.log('[pinflow-preview] smoke check passed');
    return;
  }

  const reporter =
    process.env['CI'] || process.env['PINFLOW_PREVIEW_STRICT']
      ? console.error
      : console.warn;

  reporter(
    '[pinflow-preview] smoke check FAILED — overlay preview likely broken:',
  );
  for (const failure of failures) {
    reporter(`  - ${failure}`);
  }

  if (process.env['CI'] || process.env['PINFLOW_PREVIEW_STRICT']) {
    // In CI or under PINFLOW_PREVIEW_STRICT=1 we fail loudly so a broken
    // preview never ships silently. Interactive local runs stay warn-only
    // so you can still poke at the dev server while diagnosing.
    throw new Error(
      `[pinflow-preview] smoke check failed with ${failures.length} issue(s)`,
    );
  }

  reporter(
    '[pinflow-preview] dev server is still running; inspect logs above.',
  );
}

function startDevStep(step: PinflowPreviewStep): ChildProcess {
  console.log(`[pinflow-preview] ${step.label}: ${step.command}`);

  const child = spawn('sh', ['-c', step.command], {
    cwd: step.cwd,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  const forwardSignal = (signal: NodeJS.Signals) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  return child;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  console.log(`[pinflow-preview] Preparing ${options.fixtureId}`);
  await ensurePreviewRegistry();

  const plan = buildPreviewPlan(options, workspaceRoot);
  const prepSteps = plan.steps.filter((step) => step.label !== 'dev');
  const devStep = plan.steps.find((step) => step.label === 'dev');

  for (const step of prepSteps) {
    console.log(`[pinflow-preview] ${step.label}: ${step.command}`);
    runCommand(step.command, step.cwd);
  }

  if (plan.prepareOnly) {
    console.log(
      `[pinflow-preview] Ready. Start the fixture manually in ${plan.fixturePath}`,
    );
    return;
  }

  if (!devStep) {
    return;
  }

  const devChild = startDevStep(devStep);

  try {
    await waitForDevServer(plan.port);
    await runPreviewSmokeCheck(plan.port);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (process.env['CI'] || process.env['PINFLOW_PREVIEW_STRICT']) {
      console.error(`[pinflow-preview] ${message}`);
      devChild.kill('SIGTERM');
      process.exit(1);
    }

    console.warn(`[pinflow-preview] smoke check skipped — ${message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
