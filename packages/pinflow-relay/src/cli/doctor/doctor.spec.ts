import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PATHS } from '@pinflow/core';
import { afterEach, describe, expect, it } from 'vitest';

import { formatDoctorReport, runDoctor } from './doctor.js';

describe('pinflow doctor', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function createTempDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'pinflow-doctor-'));
    tempDirs.push(dir);
    return dir;
  }

  function writeApp(appRoot: string, options: { configured?: boolean } = {}) {
    const configured = options.configured ?? true;
    writeFileSync(
      path.join(appRoot, 'package.json'),
      JSON.stringify(
        {
          dependencies: {
            react: '^19.0.0',
            vite: '^7.0.0',
            ...(configured ? { '@pinflow/react': '^0.6.0' } : {}),
          },
        },
        null,
        2,
      ),
    );

    if (configured) {
      writeFileSync(
        path.join(appRoot, 'vite.config.ts'),
        "import { pinflow } from '@pinflow/react';\nexport default pinflow({});\n",
      );
    } else {
      writeFileSync(
        path.join(appRoot, 'vite.config.ts'),
        'export default {};\n',
      );
    }
  }

  function writeManifest(appRoot: string) {
    const manifestPath = path.join(appRoot, PATHS.MANIFEST_FILE);
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, '{"id":"abcdefgh","file":"src/App.tsx"}\n');
  }

  it('passes core checks for a configured app with relay and browser attached', async () => {
    const appRoot = createTempDir();
    writeApp(appRoot);
    writeManifest(appRoot);
    const nestedCwd = path.join(appRoot, 'src');
    mkdirSync(nestedCwd, { recursive: true });
    writeFileSync(
      path.join(appRoot, '.mcp.json'),
      '{"mcpServers":{"pinflow":{"command":"npx","args":["@pinflow/mcp","pinflow-mcp"]}}}',
    );

    const report = await runDoctor({
      cwd: nestedCwd,
      createRelayControl: () => ({
        getStatus: async () => ({
          running: true,
          runData: {
            pid: 123,
            nonce: 'nonce',
            workspaceRoot: appRoot,
            version: '0.6.0',
          },
          lockData: {
            pid: 123,
            host: '127.0.0.1',
            port: 4318,
            startedAt: new Date().toISOString(),
            workspaceRoot: appRoot,
            version: '0.6.0',
            nonce: 'nonce',
            status: 'claimed',
          },
        }),
      }),
      createRelayHttpClient: () => ({
        getStatus: async () => ({
          relay: { version: '0.6.0', uptime: 10, port: 4318 },
          manifest: {
            entryCount: 1,
            fileCount: 1,
            componentCount: 1,
            lastUpdated: null,
            cacheHitRate: 0,
          },
          annotations: {
            queued: 0,
            claimed: 0,
            processing: 0,
            processed: 0,
            failed: 0,
            archived: 0,
          },
          browser: {
            connected: true,
            clientCount: 1,
            sessions: [{ sessionId: 'tab-web', route: '/' }],
          },
        }),
      }),
    });

    expect(report.ok).toBe(true);
    expect(report.checks.map((check) => check.status)).not.toContain('fail');
    expect(
      report.checks.find((check) => check.id === 'browser_connection')?.summary,
    ).toContain('1 browser client');
  });

  it('reports clear repair hints when PinFlow has not been initialized', async () => {
    const appRoot = createTempDir();
    writeApp(appRoot, { configured: false });

    const report = await runDoctor({
      cwd: appRoot,
      createRelayControl: () => ({
        getStatus: async () => ({ running: false }),
      }),
    });

    expect(report.ok).toBe(false);
    expect(
      report.checks.find((check) => check.id === 'config_marker'),
    ).toMatchObject({
      status: 'fail',
      repairHint: expect.stringContaining('pinflow init'),
    });
    expect(
      report.checks.find((check) => check.id === 'pinflow_setup'),
    ).toMatchObject({
      status: 'fail',
      repairHint: expect.stringContaining('@pinflow/react'),
    });
  });

  it('keeps browser and MCP problems as warnings instead of setup failures', async () => {
    const appRoot = createTempDir();
    writeApp(appRoot);
    writeManifest(appRoot);

    const report = await runDoctor({
      cwd: appRoot,
      homeDir: path.join(appRoot, 'home'),
      createRelayControl: () => ({
        getStatus: async () => ({
          running: true,
          runData: {
            pid: 123,
            nonce: 'nonce',
            workspaceRoot: appRoot,
            version: '0.6.0',
          },
          lockData: {
            pid: 123,
            host: '127.0.0.1',
            port: 4318,
            startedAt: new Date().toISOString(),
            workspaceRoot: appRoot,
            version: '0.6.0',
            nonce: 'nonce',
            status: 'claimed',
          },
        }),
      }),
      createRelayHttpClient: () => ({
        getStatus: async () => ({
          relay: { version: '0.6.0', uptime: 10, port: 4318 },
          manifest: {
            entryCount: 1,
            fileCount: 1,
            componentCount: 1,
            lastUpdated: null,
            cacheHitRate: 0,
          },
          annotations: {
            queued: 0,
            claimed: 0,
            processing: 0,
            processed: 0,
            failed: 0,
            archived: 0,
          },
          browser: { connected: false, clientCount: 0, sessions: [] },
        }),
      }),
    });

    expect(report.ok).toBe(true);
    expect(report.hasWarnings).toBe(true);
    expect(
      report.checks.find((check) => check.id === 'browser_connection')?.status,
    ).toBe('warn');
    expect(
      report.checks.find((check) => check.id === 'mcp_config')?.status,
    ).toBe('warn');
  });

  it('formats checks with repair hints for CLI output', async () => {
    const report = await runDoctor({
      cwd: createTempDir(),
      createRelayControl: () => ({
        getStatus: async () => ({ running: false }),
      }),
    });

    const output = formatDoctorReport(report);

    expect(output).toContain('[pinflow-cli] PinFlow doctor');
    expect(output).toContain('[fail] App root');
    expect(output).toContain('Fix: Run pinflow init');
  });
});
