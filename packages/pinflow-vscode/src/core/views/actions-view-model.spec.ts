import type { ExternalHandoffClaim } from '../external-handoff.js';
import { buildActionsViewItems } from './actions-view-model.js';

describe('buildActionsViewItems', () => {
  it('returns the four default actions when no external claim is active', () => {
    const items = buildActionsViewItems(null);

    expect(items.map((item) => item.id)).toEqual([
      'startWorkflow',
      'followRuns',
      'openLatestRun',
      'externalClaim',
    ]);
  });

  it('prepends complete and fail actions when an external claim is active', () => {
    const claim: ExternalHandoffClaim = {
      annotationId: 'ann_ext',
      promptPath: '/tmp/p',
      runDir: '/tmp',
    };

    const items = buildActionsViewItems(claim);

    expect(items.map((item) => item.id)).toEqual([
      'externalComplete',
      'externalFail',
      'startWorkflow',
      'followRuns',
      'openLatestRun',
      'externalClaim',
    ]);
  });

  it('binds each item to a registered command', () => {
    const items = buildActionsViewItems(null);

    expect(items.map((item) => item.command)).toEqual([
      'pinflow.startWorkflow',
      'pinflow.followRuns',
      'pinflow.openLatestRun',
      'pinflow.externalClaim',
    ]);
  });
});
