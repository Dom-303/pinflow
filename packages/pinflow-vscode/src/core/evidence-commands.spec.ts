import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { openLatestRunEvidence } from './evidence-commands.js';

async function createTempWorkspace() {
  return mkdtemp(path.join(tmpdir(), 'pinflow-vscode-open-evidence-'));
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

async function writeJson(filePath: string, value: unknown) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

describe('openLatestRunEvidence', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('opens prompt, transcript, and diff files for the latest run', async () => {
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
      startedAt: '2026-05-01T12:00:00.000Z',
      finishedAt: '2026-05-01T12:01:00.000Z',
      promptPath:
        '.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/prompt.md',
      transcriptPath:
        '.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/transcript.log',
      diffPath:
        '.pinflow/runs/2026-05/2026-05-01/120000-ann_abc12345_1/diff.patch',
    });
    await writeText(path.join(runDir, 'prompt.md'), '# Prompt\n');
    await writeText(path.join(runDir, 'transcript.log'), 'done\n');
    await writeText(path.join(runDir, 'diff.patch'), 'diff --git a/a b/a\n');
    const opened: string[] = [];

    await openLatestRunEvidence(workspaceRoot, {
      openFile: (filePath) => opened.push(filePath),
      showInformationMessage: () => undefined,
    });

    expect(opened).toEqual([
      path.join(runDir, 'prompt.md'),
      path.join(runDir, 'transcript.log'),
      path.join(runDir, 'diff.patch'),
    ]);
  });

  it('shows a short message when no run evidence exists', async () => {
    const messages: string[] = [];

    await openLatestRunEvidence(workspaceRoot, {
      openFile: () => {
        throw new Error('No files should be opened');
      },
      showInformationMessage: (message) => messages.push(message),
    });

    expect(messages).toEqual(['No PinFlow run evidence found yet.']);
  });
});
