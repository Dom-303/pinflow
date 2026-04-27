import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  detectFrontendApps,
  detectFrameworkForApp,
  getPinFlowSetupStatus,
} from './app-detection.js';

function makeTempProject(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'pinflow-init-detect-'));
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeFile(filePath: string, value: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
}

describe('app detection', () => {
  it('detects frontend apps with framework and setup status', () => {
    const cwd = makeTempProject();
    writeJson(path.join(cwd, 'apps/web/package.json'), {
      dependencies: {
        next: '16.0.0',
        '@pinflow/next': '0.6.0',
      },
    });
    writeFile(
      path.join(cwd, 'apps/web/next.config.ts'),
      "import { withPinFlow } from '@pinflow/next';\nexport default withPinFlow({});\n",
    );
    writeJson(path.join(cwd, 'apps/admin/package.json'), {
      dependencies: {
        react: '19.0.0',
        vite: '7.0.0',
      },
    });

    const apps = detectFrontendApps(cwd);

    expect(apps).toEqual([
      expect.objectContaining({
        appRoot: 'apps/admin',
        framework: 'react-vite',
        status: 'not_configured',
      }),
      expect.objectContaining({
        appRoot: 'apps/web',
        framework: 'next',
        status: 'configured',
      }),
    ]);
  });

  it('marks partially configured apps and explains what is missing', () => {
    const cwd = makeTempProject();
    writeJson(path.join(cwd, 'package.json'), {
      dependencies: {
        react: '19.0.0',
        vite: '7.0.0',
        '@pinflow/react': '0.6.0',
      },
    });

    const status = getPinFlowSetupStatus(cwd, 'react-vite');

    expect(status).toEqual({
      status: 'partial',
      missing: ['config'],
    });
  });

  it('detects the most specific framework for an app', () => {
    const cwd = makeTempProject();
    writeJson(path.join(cwd, 'package.json'), {
      dependencies: {
        next: '16.0.0',
        react: '19.0.0',
        vite: '7.0.0',
      },
    });

    expect(detectFrameworkForApp(cwd)).toBe('next');
  });
});
