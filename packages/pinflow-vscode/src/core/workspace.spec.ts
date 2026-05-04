import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getBestPinFlowWorkspaceStatus,
  getPinFlowWorkspaceStatus,
  type ProcessProbe,
} from './workspace.js';

async function createTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'pinflow-vscode-'));
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

async function writePinFlowMonorepo(root: string) {
  const demoAppRoot = path.join(
    root,
    'packages',
    'pinflow-test-fixtures',
    'fixtures',
    'vite',
    'v5',
    'react-18-ts',
  );
  await writeJson(path.join(root, 'package.json'), {
    name: 'pinflow',
    private: true,
  });
  await mkdir(path.join(demoAppRoot, '.pinflow'), { recursive: true });
  return demoAppRoot;
}

describe('getPinFlowWorkspaceStatus', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns not-configured for a plain workspace folder', () => {
    const status = getPinFlowWorkspaceStatus(workspaceRoot);

    expect(status).toEqual({
      status: 'not-configured',
      workspaceFolder: workspaceRoot,
      message: 'PinFlow app not configured',
    });
  });

  it('detects a PinFlow app package without a running relay', async () => {
    await writeJson(path.join(workspaceRoot, 'package.json'), {
      dependencies: {
        '@pinflow/react': '0.6.0',
      },
    });

    const status = getPinFlowWorkspaceStatus(workspaceRoot);

    expect(status).toMatchObject({
      status: 'relay-missing',
      workspaceFolder: workspaceRoot,
      appRoot: workspaceRoot,
      workspaceRoot,
      message: 'PinFlow relay is not running',
    });
  });

  it('detects the PinFlow monorepo package itself without a running relay', async () => {
    const demoAppRoot = await writePinFlowMonorepo(workspaceRoot);

    const status = getPinFlowWorkspaceStatus(workspaceRoot);

    expect(status).toMatchObject({
      status: 'relay-missing',
      workspaceFolder: workspaceRoot,
      appRoot: demoAppRoot,
      workspaceRoot: demoAppRoot,
      message: 'PinFlow relay is not running',
    });
  });

  it('resolves a configured app root from pinflow.config.json', async () => {
    const appRoot = path.join(workspaceRoot, 'apps', 'web');
    await mkdir(appRoot, { recursive: true });
    await writeJson(path.join(workspaceRoot, 'pinflow.config.json'), {
      appRoot: './apps/web',
    });

    const status = getPinFlowWorkspaceStatus(workspaceRoot);

    expect(status).toMatchObject({
      status: 'relay-missing',
      workspaceFolder: workspaceRoot,
      workspaceRoot: appRoot,
      appRoot,
      configPath: path.join(workspaceRoot, 'pinflow.config.json'),
    });
  });

  it('reports ready when the configured app has a live relay lock', async () => {
    const pinflowDir = path.join(workspaceRoot, '.pinflow');
    await mkdir(pinflowDir, { recursive: true });
    await writeJson(path.join(pinflowDir, 'relay.lock'), {
      pid: 12345,
      host: '127.0.0.1',
      port: 4317,
      nonce: 'nonce',
      status: 'claimed',
      startedAt: new Date().toISOString(),
    });

    const processProbe: ProcessProbe = () => true;
    const status = getPinFlowWorkspaceStatus(workspaceRoot, { processProbe });

    expect(status).toMatchObject({
      status: 'ready',
      workspaceFolder: workspaceRoot,
      workspaceRoot,
      relay: {
        host: '127.0.0.1',
        port: 4317,
        pid: 12345,
      },
      message: 'PinFlow ready',
    });
  });
});

describe('getBestPinFlowWorkspaceStatus', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('prefers a configured PinFlow folder over an earlier plain folder', async () => {
    const plainRoot = path.join(workspaceRoot, 'plain');
    const pinflowRoot = path.join(workspaceRoot, 'pinflow');
    await mkdir(plainRoot, { recursive: true });
    const demoAppRoot = await writePinFlowMonorepo(pinflowRoot);

    const status = getBestPinFlowWorkspaceStatus([plainRoot, pinflowRoot]);

    expect(status).toMatchObject({
      status: 'relay-missing',
      workspaceFolder: pinflowRoot,
      workspaceRoot: demoAppRoot,
    });
  });

  it('finds a configured PinFlow repo inside a parent workspace folder', async () => {
    const pinflowRoot = path.join(workspaceRoot, 'pinflow');
    const demoAppRoot = await writePinFlowMonorepo(pinflowRoot);

    const status = getBestPinFlowWorkspaceStatus([workspaceRoot]);

    expect(status).toMatchObject({
      status: 'relay-missing',
      workspaceFolder: pinflowRoot,
      workspaceRoot: demoAppRoot,
    });
  });

  it('finds a configured PinFlow repo two levels below a workspace folder', async () => {
    const pinflowRoot = path.join(workspaceRoot, 'dev', 'pinflow');
    const demoAppRoot = await writePinFlowMonorepo(pinflowRoot);

    const status = getBestPinFlowWorkspaceStatus([workspaceRoot]);

    expect(status).toMatchObject({
      status: 'relay-missing',
      workspaceFolder: pinflowRoot,
      workspaceRoot: demoAppRoot,
    });
  });
});

describe('getBestPinFlowWorkspaceStatus with preferredFolder', () => {
  let workspaceA: string;
  let workspaceB: string;

  beforeEach(async () => {
    workspaceA = await mkdtemp(path.join(tmpdir(), 'pinflow-prefer-a-'));
    workspaceB = await mkdtemp(path.join(tmpdir(), 'pinflow-prefer-b-'));
    // Both folders configured; B happens to come second.
    await mkdir(path.join(workspaceA, '.pinflow'), { recursive: true });
    await mkdir(path.join(workspaceB, '.pinflow'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspaceA, { recursive: true, force: true });
    await rm(workspaceB, { recursive: true, force: true });
  });

  it('honors an absolute preferredFolder path that matches one of the candidates', () => {
    const status = getBestPinFlowWorkspaceStatus([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: workspaceB,
    });

    expect(status?.workspaceRoot).toBe(workspaceB);
  });

  it('falls back to auto-priority when preferredFolder does not match any candidate', () => {
    const status = getBestPinFlowWorkspaceStatus([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: '/no/such/path',
    });

    expect(status?.workspaceRoot).toBe(workspaceA);
  });

  it('falls back to auto-priority when preferredFolder is empty', () => {
    const status = getBestPinFlowWorkspaceStatus([workspaceA, workspaceB], {
      processProbe: () => false,
      preferredFolder: '',
    });

    expect(status?.workspaceRoot).toBe(workspaceA);
  });

  it('falls back to auto-priority when preferredFolder points at a not-configured folder', async () => {
    const workspaceC = await mkdtemp(path.join(tmpdir(), 'pinflow-prefer-c-'));
    try {
      const status = getBestPinFlowWorkspaceStatus(
        [workspaceA, workspaceC],
        {
          processProbe: () => false,
          preferredFolder: workspaceC,
        },
      );

      expect(status?.workspaceRoot).toBe(workspaceA);
    } finally {
      await rm(workspaceC, { recursive: true, force: true });
    }
  });
});

describe('dev-lock detection', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'pinflow-vscode-devlock-'));
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns no devServer when .pinflow/dev.lock is absent', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: () => true,
    });

    expect(status.devServer).toBeUndefined();
  });

  it('returns the parsed devServer when .pinflow/dev.lock is valid and pid is live', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'dev.lock'),
      JSON.stringify({
        host: 'localhost',
        port: 5173,
        url: 'http://localhost:5173/',
        pid: 9999,
      }),
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: (pid) => pid === 1 || pid === 9999,
    });

    expect(status.devServer).toEqual({
      host: 'localhost',
      port: 5173,
      url: 'http://localhost:5173/',
      pid: 9999,
    });
  });

  it('returns no devServer when dev.lock pid is dead', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'dev.lock'),
      JSON.stringify({
        host: 'localhost',
        port: 5173,
        url: 'http://localhost:5173/',
        pid: 9999,
      }),
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: (pid) => pid === 1, // only the relay pid is alive
    });

    expect(status.devServer).toBeUndefined();
  });

  it('returns no devServer when dev.lock JSON is malformed', async () => {
    await mkdir(path.join(workspaceRoot, '.pinflow'), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'relay.lock'),
      JSON.stringify({ host: '127.0.0.1', port: 4317, pid: 1 }),
      'utf8',
    );
    await writeFile(
      path.join(workspaceRoot, '.pinflow', 'dev.lock'),
      'this is not json',
      'utf8',
    );

    const status = getPinFlowWorkspaceStatus(workspaceRoot, {
      processProbe: () => true,
    });

    expect(status.devServer).toBeUndefined();
  });
});
