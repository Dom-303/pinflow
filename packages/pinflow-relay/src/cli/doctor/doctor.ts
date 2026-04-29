import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { PATHS } from '@pinflow/core';

import { RelayHttpClient } from '../../client/relay-http-client.js';
import type { StatusResponse } from '../../schema.js';
import {
  RelayControl,
  type RelayStatus,
} from '../../lifecycle/relay-control.js';
import { findConfigFile, loadAppRoot } from '../config-loader.js';
import {
  detectFrameworkForApp,
  getPinFlowSetupStatus,
} from '../init/app-detection.js';
import { FRAMEWORKS, type FrameworkId } from '../init/types.js';

export type DoctorCheckStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheck {
  readonly id:
    | 'app_root'
    | 'config_marker'
    | 'framework_package'
    | 'pinflow_setup'
    | 'manifest'
    | 'relay_health'
    | 'browser_connection'
    | 'runner_connection'
    | 'mcp_config';
  readonly label: string;
  readonly status: DoctorCheckStatus;
  readonly summary: string;
  readonly repairHint?: string;
  readonly details?: readonly string[];
}

export interface DoctorReport {
  readonly appRoot?: string;
  readonly configPath?: string;
  readonly framework?: FrameworkId;
  readonly checks: readonly DoctorCheck[];
  readonly ok: boolean;
  readonly hasWarnings: boolean;
}

interface WorkspaceDiscovery {
  readonly appRoot?: string;
  readonly configPath?: string;
  readonly markerPath?: string;
  readonly source: 'pinflow-dir' | 'config' | 'frontend-app' | 'none';
}

interface RelayControlLike {
  getStatus(): Promise<RelayStatus>;
}

interface RelayHttpClientLike {
  getStatus(): Promise<StatusResponse>;
}

export interface DoctorDependencies {
  readonly cwd?: string;
  readonly homeDir?: string;
  readonly createRelayControl?: (workspaceRoot: string) => RelayControlLike;
  readonly createRelayHttpClient?: (
    host: string,
    port: number,
  ) => RelayHttpClientLike;
}

export async function runDoctor(
  deps: DoctorDependencies = {},
): Promise<DoctorReport> {
  const cwd = path.resolve(deps.cwd ?? process.cwd());
  const homeDir = deps.homeDir ?? process.env.HOME;
  const workspace = discoverWorkspace(cwd);
  const appRoot = workspace.appRoot;
  const framework = appRoot ? detectFrameworkForApp(appRoot) : undefined;
  const checks: DoctorCheck[] = [];

  checks.push(checkAppRoot(workspace));
  checks.push(checkConfigMarker(workspace));
  checks.push(checkFramework(appRoot, framework));
  checks.push(checkPinFlowSetup(appRoot, framework));
  checks.push(checkManifest(appRoot));

  const relayCheck = await checkRelayHealth(appRoot, deps.createRelayControl);
  checks.push(relayCheck.check);
  checks.push(
    await checkBrowserConnection(relayCheck.status, deps.createRelayHttpClient),
  );
  checks.push(
    await checkRunnerConnection(relayCheck.status, deps.createRelayHttpClient),
  );
  checks.push(checkMcpConfig(cwd, appRoot, homeDir));

  const ok = checks.every((check) => check.status !== 'fail');
  const hasWarnings = checks.some((check) => check.status === 'warn');

  return {
    appRoot,
    configPath: workspace.configPath,
    framework,
    checks,
    ok,
    hasWarnings,
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = ['[pinflow-cli] PinFlow doctor'];

  if (report.appRoot) {
    lines.push(`App root: ${report.appRoot}`);
  }
  if (report.configPath) {
    lines.push(`Config:   ${report.configPath}`);
  }

  lines.push('');
  for (const check of report.checks) {
    lines.push(`[${check.status}] ${check.label}: ${check.summary}`);
    if (check.details?.length) {
      for (const detail of check.details) {
        lines.push(`  - ${detail}`);
      }
    }
    if (check.repairHint) {
      lines.push(`  Fix: ${check.repairHint}`);
    }
  }

  return lines.join('\n');
}

function discoverWorkspace(cwd: string): WorkspaceDiscovery {
  const start = safeDirectory(cwd) ?? process.cwd();
  let dir = start;

  while (true) {
    const markerPath = path.join(dir, PATHS.PINFLOW_DIR);
    if (existsSync(markerPath)) {
      return {
        appRoot: dir,
        markerPath,
        source: 'pinflow-dir',
      };
    }

    const configPath = findConfigFile(dir);
    if (configPath) {
      return {
        appRoot: loadAppRoot(configPath),
        configPath,
        markerPath: undefined,
        source: 'config',
      };
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (detectFrameworkForApp(start)) {
    return {
      appRoot: start,
      source: 'frontend-app',
    };
  }

  return { source: 'none' };
}

function checkAppRoot(workspace: WorkspaceDiscovery): DoctorCheck {
  if (workspace.appRoot) {
    return {
      id: 'app_root',
      label: 'App root',
      status: 'pass',
      summary:
        workspace.source === 'frontend-app'
          ? `frontend app detected at ${workspace.appRoot}`
          : `PinFlow app root is ${workspace.appRoot}`,
    };
  }

  return {
    id: 'app_root',
    label: 'App root',
    status: 'fail',
    summary: 'no PinFlow app root or supported frontend app found',
    repairHint: 'Run pinflow init from your frontend app or repo root.',
  };
}

function checkConfigMarker(workspace: WorkspaceDiscovery): DoctorCheck {
  if (workspace.configPath) {
    return {
      id: 'config_marker',
      label: 'Config marker',
      status: 'pass',
      summary: `found ${path.basename(workspace.configPath)}`,
    };
  }

  if (workspace.markerPath) {
    return {
      id: 'config_marker',
      label: 'Config marker',
      status: 'pass',
      summary: 'found .pinflow directory',
    };
  }

  return {
    id: 'config_marker',
    label: 'Config marker',
    status: 'fail',
    summary: 'PinFlow has not been initialized for this app',
    repairHint: 'Run pinflow init and choose this app.',
  };
}

function checkFramework(
  appRoot: string | undefined,
  framework: FrameworkId | undefined,
): DoctorCheck {
  if (!appRoot) {
    return blockedCheck(
      'framework_package',
      'Framework package',
      'app root is unknown',
    );
  }

  if (!framework) {
    return {
      id: 'framework_package',
      label: 'Framework package',
      status: 'fail',
      summary: 'no supported frontend framework package found',
      repairHint:
        'Install or select an app using Next, Nuxt, React, Vue, Vite, or Webpack.',
    };
  }

  return {
    id: 'framework_package',
    label: 'Framework package',
    status: 'pass',
    summary: `detected ${framework}`,
  };
}

function checkPinFlowSetup(
  appRoot: string | undefined,
  framework: FrameworkId | undefined,
): DoctorCheck {
  if (!appRoot || !framework) {
    return blockedCheck(
      'pinflow_setup',
      'PinFlow setup',
      'framework could not be detected',
    );
  }

  const setup = getPinFlowSetupStatus(appRoot, framework);
  const expectedPackage = getExpectedPinFlowPackage(framework);

  if (setup.status === 'configured') {
    return {
      id: 'pinflow_setup',
      label: 'PinFlow setup',
      status: 'pass',
      summary: `${expectedPackage} and framework config are present`,
    };
  }

  const missing = setup.missing.join(', ');
  return {
    id: 'pinflow_setup',
    label: 'PinFlow setup',
    status: setup.status === 'partial' ? 'warn' : 'fail',
    summary: `missing ${missing}`,
    repairHint: `Run pinflow init for this app or add ${expectedPackage} and the PinFlow framework config.`,
  };
}

function checkManifest(appRoot: string | undefined): DoctorCheck {
  if (!appRoot) {
    return blockedCheck('manifest', 'Manifest', 'app root is unknown');
  }

  const manifestPath = path.join(appRoot, PATHS.MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return {
      id: 'manifest',
      label: 'Manifest',
      status: 'warn',
      summary: 'manifest file has not been generated yet',
      repairHint:
        'Start your dev app once so the PinFlow adapter can write the manifest.',
    };
  }

  const size = statSync(manifestPath).size;
  if (size === 0) {
    return {
      id: 'manifest',
      label: 'Manifest',
      status: 'warn',
      summary: 'manifest file exists but is empty',
      repairHint: 'Reload the app in development mode and check adapter setup.',
    };
  }

  return {
    id: 'manifest',
    label: 'Manifest',
    status: 'pass',
    summary: `found ${path.relative(appRoot, manifestPath)}`,
  };
}

async function checkRelayHealth(
  appRoot: string | undefined,
  createRelayControl: DoctorDependencies['createRelayControl'],
): Promise<{ check: DoctorCheck; status?: RelayStatus }> {
  if (!appRoot) {
    return {
      check: blockedCheck(
        'relay_health',
        'Relay health',
        'app root is unknown',
      ),
    };
  }

  const relayControl =
    createRelayControl?.(appRoot) ?? new RelayControl(appRoot);
  const status = await relayControl.getStatus();

  if (!status.running || !status.runData || !status.lockData) {
    return {
      status,
      check: {
        id: 'relay_health',
        label: 'Relay health',
        status: 'fail',
        summary: 'relay is not running for this app',
        repairHint:
          'Start it with pinflow serve, or start your dev app if it manages the relay.',
      },
    };
  }

  return {
    status,
    check: {
      id: 'relay_health',
      label: 'Relay health',
      status: 'pass',
      summary: `running on ${status.lockData.host}:${status.lockData.port}`,
      details: [
        `pid ${status.runData.pid}`,
        `version ${status.runData.version}`,
      ],
    },
  };
}

async function checkBrowserConnection(
  relayStatus: RelayStatus | undefined,
  createRelayHttpClient: DoctorDependencies['createRelayHttpClient'],
): Promise<DoctorCheck> {
  if (
    !relayStatus?.running ||
    !relayStatus.lockData?.host ||
    !relayStatus.lockData.port
  ) {
    return blockedCheck(
      'browser_connection',
      'Browser connection',
      'relay is not running',
    );
  }

  const client =
    createRelayHttpClient?.(
      relayStatus.lockData.host,
      relayStatus.lockData.port,
    ) ??
    new RelayHttpClient(relayStatus.lockData.host, relayStatus.lockData.port);

  try {
    const status = await client.getStatus();
    const browser = status.browser;

    if (!browser) {
      return {
        id: 'browser_connection',
        label: 'Browser connection',
        status: 'warn',
        summary: 'relay status does not expose browser connection data',
        repairHint:
          'Restart the relay so the latest PinFlow status endpoint is active.',
      };
    }

    if (!browser.connected) {
      return {
        id: 'browser_connection',
        label: 'Browser connection',
        status: 'warn',
        summary: 'no browser tab is connected to the relay',
        repairHint: 'Open the app in your browser and reload the page.',
      };
    }

    return {
      id: 'browser_connection',
      label: 'Browser connection',
      status: 'pass',
      summary: `${browser.clientCount} browser client(s) connected`,
      details: browser.sessions?.map(formatBrowserSession),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: 'browser_connection',
      label: 'Browser connection',
      status: 'warn',
      summary: `could not read browser status: ${message}`,
      repairHint: 'Check pinflow status, then retry pinflow doctor.',
    };
  }
}

async function checkRunnerConnection(
  relayStatus: RelayStatus | undefined,
  createRelayHttpClient: DoctorDependencies['createRelayHttpClient'],
): Promise<DoctorCheck> {
  if (
    !relayStatus?.running ||
    !relayStatus.lockData?.host ||
    !relayStatus.lockData.port
  ) {
    return blockedCheck(
      'runner_connection',
      'Runner connection',
      'relay is not running',
    );
  }

  const client =
    createRelayHttpClient?.(
      relayStatus.lockData.host,
      relayStatus.lockData.port,
    ) ??
    new RelayHttpClient(relayStatus.lockData.host, relayStatus.lockData.port);

  try {
    const status = await client.getStatus();
    const runner = status.runner;

    if (!runner) {
      return {
        id: 'runner_connection',
        label: 'Runner connection',
        status: 'warn',
        summary: 'relay status does not expose runner connection data',
        repairHint:
          'Restart the relay so the latest PinFlow status endpoint is active.',
      };
    }

    if (!runner.connected) {
      return {
        id: 'runner_connection',
        label: 'Runner connection',
        status: 'warn',
        summary: 'no local autostart runner is connected',
        repairHint:
          'Start your app dev server with runner.autoStart enabled, or run pinflow runner manually for your configured provider.',
      };
    }

    return {
      id: 'runner_connection',
      label: 'Runner connection',
      status: 'pass',
      summary: `${runner.activeCount} runner(s) connected: ${runner.sessions[0]?.label ?? 'unknown runner'}`,
      details: runner.sessions.map(formatRunnerSession),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: 'runner_connection',
      label: 'Runner connection',
      status: 'warn',
      summary: `could not read runner status: ${message}`,
      repairHint: 'Check pinflow status, then retry pinflow doctor.',
    };
  }
}

function checkMcpConfig(
  cwd: string,
  appRoot: string | undefined,
  homeDir: string | undefined,
): DoctorCheck {
  const matches = getMcpConfigCandidates(cwd, appRoot, homeDir).filter(
    (candidate) => fileContainsPinFlowMcp(candidate),
  );

  if (matches.length > 0) {
    return {
      id: 'mcp_config',
      label: 'MCP config',
      status: 'pass',
      summary: 'found PinFlow MCP config',
      details: matches,
    };
  }

  return {
    id: 'mcp_config',
    label: 'MCP config',
    status: 'warn',
    summary: 'no PinFlow MCP config found in common agent config files',
    repairHint:
      'Run pinflow init for your coding agent, or add the PinFlow MCP server manually.',
  };
}

function getMcpConfigCandidates(
  cwd: string,
  appRoot: string | undefined,
  homeDir: string | undefined,
): string[] {
  const localRoots = Array.from(
    new Set([cwd, appRoot].filter((entry): entry is string => Boolean(entry))),
  );
  const local = localRoots.flatMap((root) =>
    ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', 'mcp.json'].map(
      (file) => path.join(root, file),
    ),
  );

  const home = homeDir
    ? [
        '.codex/config.toml',
        '.claude.json',
        '.claude/settings.json',
        '.config/claude/mcp.json',
      ].map((file) => path.join(homeDir, file))
    : [];

  return [...local, ...home];
}

function fileContainsPinFlowMcp(filePath: string): boolean {
  if (!existsSync(filePath)) return false;

  try {
    const content = readFileSync(filePath, 'utf-8');
    return (
      /pinflow/i.test(content) &&
      /(@pinflow\/mcp|pinflow-mcp|pinflow mcp|pinflow")/i.test(content)
    );
  } catch {
    return false;
  }
}

function getExpectedPinFlowPackage(framework: FrameworkId): string {
  return (
    FRAMEWORKS.find((entry) => entry.id === framework)?.package ??
    '@pinflow/transform'
  );
}

function safeDirectory(input: string): string | undefined {
  try {
    const resolved = path.resolve(input);
    const stat = statSync(resolved);
    return stat.isDirectory() ? resolved : path.dirname(resolved);
  } catch {
    return undefined;
  }
}

function formatBrowserSession(session: {
  readonly sessionId: string;
  readonly pageUrl?: string;
  readonly route?: string;
  readonly pageTitle?: string;
}): string {
  const location = session.route ?? session.pageUrl ?? 'unknown route';
  const title = session.pageTitle ? ` (${session.pageTitle})` : '';
  return `${session.sessionId}: ${location}${title}`;
}

function formatRunnerSession(session: {
  readonly runnerId: string;
  readonly provider: string;
  readonly label: string;
  readonly status: string;
  readonly currentAnnotationId?: string;
}): string {
  const current = session.currentAnnotationId
    ? ` (${session.currentAnnotationId})`
    : '';
  return `${session.label}: ${session.provider}, ${session.status}${current}`;
}

function blockedCheck(
  id: DoctorCheck['id'],
  label: string,
  reason: string,
): DoctorCheck {
  return {
    id,
    label,
    status: 'warn',
    summary: `skipped because ${reason}`,
  };
}
