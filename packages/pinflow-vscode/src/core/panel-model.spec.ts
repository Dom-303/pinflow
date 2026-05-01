import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PinFlowWorkspaceResult } from './workspace.js';
import { buildPinFlowPanelItems } from './panel-model.js';

async function createTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'pinflow-vscode-panel-'));
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

describe('buildPinFlowPanelItems', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('shows a short not-configured state', async () => {
    const items = await buildPinFlowPanelItems({
      status: 'not-configured',
      workspaceFolder: workspaceRoot,
      message: 'PinFlow app not configured',
    });

    expect(items.map((item) => item.label)).toEqual([
      'PinFlow app not configured',
      'Run pinflow init in this workspace',
    ]);
  });

  it('shows relay and runner placeholders before a run exists', async () => {
    const status: PinFlowWorkspaceResult = {
      status: 'relay-missing',
      workspaceFolder: workspaceRoot,
      workspaceRoot,
      appRoot: workspaceRoot,
      message: 'PinFlow relay is not running',
    };

    const items = await buildPinFlowPanelItems(status);

    expect(items.map((item) => item.label)).toEqual([
      'Relay missing',
      'Runner idle',
      'No run evidence yet',
      'Start with PinFlow: Start Workflow',
    ]);
  });

  it('shows relay endpoint and latest run summary when available', async () => {
    const runDir = path.join(
      workspaceRoot,
      '.pinflow',
      'runs',
      '2026-05',
      '2026-05-01',
      '120000-ann_abc12345_1',
    );
    await writeJson(path.join(runDir, 'summary.json'), {
      annotationId: 'ann_abc12345_1',
      runId: '120000-ann_abc12345_1',
      status: 'processed',
      provider: 'codex',
      label: 'Codex',
      startedAt: '2026-05-01T12:00:00.000Z',
      finishedAt: '2026-05-01T12:01:00.000Z',
      diffPath:
        '.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/diff.patch',
    });

    const status: PinFlowWorkspaceResult = {
      status: 'ready',
      workspaceFolder: workspaceRoot,
      workspaceRoot,
      appRoot: workspaceRoot,
      relay: {
        host: '127.0.0.1',
        port: 4317,
        pid: 12345,
      },
      message: 'PinFlow ready',
    };

    const items = await buildPinFlowPanelItems(status);

    expect(items.map((item) => item.label)).toEqual([
      'Relay ready at 127.0.0.1:4317',
      'Runner done via codex',
      'Latest run: ann_abc12345_1',
      'Diff evidence recorded',
    ]);
  });
});
