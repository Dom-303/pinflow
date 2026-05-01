import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { isDistTargetExcluded } from './nx-plugin';

describe('nx plugin dist target exclusions', () => {
  it('does not add dist sync targets to non-npm packages', () => {
    expect(isDistTargetExcluded('pinflow-test-fixtures')).toBe(true);
    expect(isDistTargetExcluded('pinflow-vscode')).toBe(true);
  });

  it('keeps publishable packages eligible for dist sync targets', () => {
    expect(isDistTargetExcluded('pinflow-core')).toBe(false);
    expect(isDistTargetExcluded('pinflow-react')).toBe(false);
  });
});

describe('release project exclusions', () => {
  it('does not include non-npm packages in npm release publishing', () => {
    const nxConfig = JSON.parse(
      readFileSync(new URL('../nx.json', import.meta.url), 'utf-8'),
    ) as { release?: { projects?: string[] } };

    expect(nxConfig.release?.projects).toContain('!pinflow-test-fixtures');
    expect(nxConfig.release?.projects).toContain('!pinflow-vscode');
  });
});
