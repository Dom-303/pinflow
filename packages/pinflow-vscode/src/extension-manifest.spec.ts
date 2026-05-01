import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('VS Code extension manifest', () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
  ) as {
    activationEvents?: string[];
    bugs?: { url?: string };
    description?: string;
    displayName?: string;
    galleryBanner?: { color?: string; theme?: string };
    homepage?: string;
    icon?: string;
    keywords?: string[];
    license?: string;
    main?: string;
    preview?: boolean;
    private?: boolean;
    publisher?: string;
    repository?: { type?: string; url?: string; directory?: string };
    scripts?: Record<string, string>;
    contributes?: {
      commands?: Array<{ command: string; title: string; category?: string }>;
      views?: Record<string, Array<{ id: string; name: string }>>;
    };
  };
  const packageRoot = path.resolve(__dirname, '..');

  it('points VS Code at the compiled extension entrypoint', () => {
    expect(manifest.main).toBe('./dist/extension.js');
  });

  it('has marketplace-ready package metadata without publishing by default', () => {
    expect(manifest.displayName).toBe('PinFlow');
    expect(manifest.description).toContain('local PinFlow workflow');
    expect(manifest.publisher).toBe('dom-303');
    expect(manifest.license).toBe('MIT');
    expect(manifest.private).toBeUndefined();
    expect(manifest.preview).toBe(true);
    expect(manifest.icon).toBe('media/icon.png');
    expect(existsSync(path.join(packageRoot, manifest.icon))).toBe(true);
    expect(existsSync(path.join(packageRoot, 'LICENSE'))).toBe(true);
    expect(existsSync(path.join(packageRoot, '.vscodeignore'))).toBe(true);
    expect(manifest.galleryBanner).toEqual({
      color: '#111111',
      theme: 'dark',
    });
    expect(manifest.keywords).toEqual(
      expect.arrayContaining([
        'pinflow',
        'ui-to-code',
        'coding-agent',
        'vscode-extension',
      ]),
    );
    expect(manifest.homepage).toBe('https://github.com/Dom-303/pinflow#readme');
    expect(manifest.bugs?.url).toBe(
      'https://github.com/Dom-303/pinflow/issues',
    );
  });

  it('defines local packaging scripts but no publish script', () => {
    expect(manifest.scripts?.['package:vsix']).toBe(
      'corepack pnpm dlx @vscode/vsce package --no-dependencies --out ../../tmp/pinflow-vscode.vsix',
    );
    expect(manifest.scripts?.publish).toBeUndefined();
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
      {
        command: 'pinflow.refreshPanel',
        title: 'PinFlow: Refresh Panel',
        category: 'PinFlow',
      },
      {
        command: 'pinflow.externalClaim',
        title: 'PinFlow: Claim External Task',
        category: 'PinFlow',
      },
      {
        command: 'pinflow.externalComplete',
        title: 'PinFlow: Complete External Task',
        category: 'PinFlow',
      },
      {
        command: 'pinflow.externalFail',
        title: 'PinFlow: Fail External Task',
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
