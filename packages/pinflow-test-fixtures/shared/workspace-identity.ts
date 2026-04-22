import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface WorkspaceIdentity {
  productSlug: string;
  version: string;
  workspaceFingerprint: string;
}

export function parseWorkspaceIdentity(input: {
  name?: string;
  version?: string;
  workspaceFingerprint?: string;
}): WorkspaceIdentity {
  return {
    productSlug: (input.name ?? 'pinflow').trim() || 'pinflow',
    version: (input.version ?? '0.0.0').trim() || '0.0.0',
    workspaceFingerprint:
      (input.workspaceFingerprint ?? 'workspace').trim() || 'workspace',
  };
}

function hashValue(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 12);
}

function readOptionalFile(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

function buildFallbackFingerprint(workspaceRoot: string): string {
  const pkg = readOptionalFile(join(workspaceRoot, 'package.json'));
  const lockfile = readOptionalFile(join(workspaceRoot, 'pnpm-lock.yaml'));
  return hashValue(`${pkg}\n---\n${lockfile}`);
}

function buildGitFingerprint(workspaceRoot: string): string {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: workspaceRoot,
    encoding: 'utf-8',
  }).trim();

  const status = execFileSync(
    'git',
    ['status', '--porcelain', '--untracked-files=all'],
    {
      cwd: workspaceRoot,
      encoding: 'utf-8',
    },
  ).trim();

  return hashValue(`${head}\n${status}`);
}

function resolveWorkspaceFingerprint(workspaceRoot: string): string {
  try {
    return buildGitFingerprint(workspaceRoot);
  } catch {
    return buildFallbackFingerprint(workspaceRoot);
  }
}

export function readWorkspaceIdentity(
  workspaceRoot: string,
): WorkspaceIdentity {
  const pkgPath = join(workspaceRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
    name?: string;
    version?: string;
  };

  return parseWorkspaceIdentity({
    ...pkg,
    workspaceFingerprint: resolveWorkspaceFingerprint(workspaceRoot),
  });
}

export function getInstallStampFilename(): string {
  return '.pinflow-install-stamp';
}

export function buildInstallStampValue(identity: WorkspaceIdentity): string {
  return `${identity.productSlug}@${identity.version}#${identity.workspaceFingerprint}`;
}
