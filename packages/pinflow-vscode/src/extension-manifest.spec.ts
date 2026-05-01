import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('VS Code extension manifest', () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
  ) as {
    activationEvents?: string[];
    main?: string;
    contributes?: {
      commands?: Array<{ command: string; title: string; category?: string }>;
      views?: Record<string, Array<{ id: string; name: string }>>;
    };
  };

  it('points VS Code at the compiled extension entrypoint', () => {
    expect(manifest.main).toBe('./dist/extension.js');
  });

  it('contributes the phase-one PinFlow commands', () => {
    expect(manifest.contributes?.commands).toEqual([
      {
        command: 'pinflow.openPanel',
        title: 'PinFlow: Open Panel',
        category: 'PinFlow',
      },
      {
        command: 'pinflow.followRuns',
        title: 'PinFlow: Follow Runs',
        category: 'PinFlow',
      },
      {
        command: 'pinflow.openLatestRun',
        title: 'PinFlow: Open Latest Run',
        category: 'PinFlow',
      },
      {
        command: 'pinflow.startWorkflow',
        title: 'PinFlow: Start Workflow',
        category: 'PinFlow',
      },
    ]);
  });

  it('contributes a PinFlow status view to the Explorer sidebar', () => {
    expect(manifest.activationEvents).toContain('onView:pinflow.status');
    expect(manifest.contributes?.views?.['explorer']).toEqual([
      {
        id: 'pinflow.status',
        name: 'PinFlow',
      },
    ]);
  });
});
