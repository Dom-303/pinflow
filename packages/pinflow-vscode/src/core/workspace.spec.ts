import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
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
