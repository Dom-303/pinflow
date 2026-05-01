import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('VS Code extension manifest', () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
  ) as {
    main?: string;
    contributes?: {
      commands?: Array<{ command: string; title: string; category?: string }>;
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
    ]);
  });
});
