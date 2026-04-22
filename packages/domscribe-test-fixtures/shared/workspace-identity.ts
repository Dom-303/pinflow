import { readFileSync } from 'fs';
import { join } from 'path';

export interface WorkspaceIdentity {
  productSlug: string;
  version: string;
}

export function parseWorkspaceIdentity(input: {
  name?: string;
  version?: string;
}): WorkspaceIdentity {
  return {
    productSlug: (input.name ?? 'pinflow').trim() || 'pinflow',
    version: (input.version ?? '0.0.0').trim() || '0.0.0',
  };
}

export function readWorkspaceIdentity(
  workspaceRoot: string,
): WorkspaceIdentity {
  const pkgPath = join(workspaceRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
    name?: string;
    version?: string;
  };

  return parseWorkspaceIdentity(pkg);
}

export function getInstallStampFilename(): string {
  return '.pinflow-install-stamp';
}

export function buildInstallStampValue(identity: WorkspaceIdentity): string {
  return `${identity.productSlug}@${identity.version}`;
}
