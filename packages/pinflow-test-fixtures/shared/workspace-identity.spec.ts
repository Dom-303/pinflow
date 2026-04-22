import { describe, expect, it } from 'vitest';
import {
  buildInstallStampValue,
  getInstallStampFilename,
  parseWorkspaceIdentity,
} from './workspace-identity.js';

describe('workspace identity', () => {
  it('builds a pinflow-specific install stamp filename', () => {
    expect(getInstallStampFilename()).toBe('.pinflow-install-stamp');
  });

  it('parses the root package identity into product and version', () => {
    expect(
      parseWorkspaceIdentity({
        name: 'pinflow',
        version: '0.6.0-pinflow.0',
      }),
    ).toEqual({
      productSlug: 'pinflow',
      version: '0.6.0-pinflow.0',
      workspaceFingerprint: 'workspace',
    });
  });

  it('builds a stable install stamp value', () => {
    expect(
      buildInstallStampValue({
        productSlug: 'pinflow',
        version: '0.6.0-pinflow.0',
        workspaceFingerprint: 'abc123',
      }),
    ).toBe('pinflow@0.6.0-pinflow.0#abc123');
  });
});
