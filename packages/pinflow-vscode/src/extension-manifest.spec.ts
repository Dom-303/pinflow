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
      commands?: Array<{ command: string; title: string; category?: string; icon?: string }>;
      viewsContainers?: { activitybar?: Array<{ id: string; title: string; icon: string }> };
      views?: Record<string, Array<{ id: string; name: string }>>;
      menus?: Record<string, Array<{ command: string; when: string; group: string }>>;
      configuration?: {
        title?: string;
        properties?: Record<string, {
          type?: string | string[];
          default?: unknown;
          minimum?: number;
          maximum?: number;
          enum?: string[];
          description?: string;
        }>;
      };
      viewsWelcome?: Array<{ view: string; contents: string; when: string }>;
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
    expect(manifest.galleryBanner).toEqual({ color: '#111111', theme: 'dark' });
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(['pinflow', 'ui-to-code', 'coding-agent', 'vscode-extension']),
    );
    expect(manifest.homepage).toBe('https://github.com/Dom-303/pinflow#readme');
    expect(manifest.bugs?.url).toBe('https://github.com/Dom-303/pinflow/issues');
  });

  it('defines local packaging scripts but no publish script', () => {
    const packageVsix = manifest.scripts?.['package:vsix'] ?? '';
    expect(packageVsix).toContain(
      '@vscode/vsce package --no-dependencies --out ../../tmp/pinflow-vscode.vsix',
    );
    expect(packageVsix).toContain('nx build pinflow-vscode');
    expect(manifest.scripts?.publish).toBeUndefined();
  });

  it('contributes the package-2 PinFlow commands', () => {
    expect(manifest.contributes?.commands?.map((c) => c.command)).toEqual([
      'pinflow.openPanel',
      'pinflow.openContainer',
      'pinflow.followRuns',
      'pinflow.openLatestRun',
      'pinflow.startWorkflow',
      'pinflow.refreshPanel',
      'pinflow.externalClaim',
      'pinflow.externalComplete',
      'pinflow.externalFail',
      'pinflow.openRunDirectory',
      'pinflow.openRunDiff',
      'pinflow.openSettings',
      'pinflow.runInit',
      'pinflow.openDocumentation',
      'pinflow.openPreview',
    ]);
  });

  it('contributes the PinFlow Activity-Bar container with three views', () => {
    expect(manifest.contributes?.viewsContainers?.activitybar).toEqual([
      { id: 'pinflow', title: 'PinFlow', icon: 'media/sidebar-icon.svg' },
    ]);
    expect(existsSync(path.join(packageRoot, 'media', 'sidebar-icon.svg'))).toBe(true);
    expect(manifest.contributes?.views?.['pinflow']).toEqual([
      { id: 'pinflow.status', name: 'Status' },
      { id: 'pinflow.runs', name: 'Runs' },
      { id: 'pinflow.actions', name: 'Actions' },
    ]);
    expect(manifest.contributes?.views?.['explorer']).toBeUndefined();
    expect(manifest.activationEvents).toEqual(
      expect.arrayContaining([
        'onView:pinflow.status',
        'onView:pinflow.runs',
        'onView:pinflow.actions',
        'onCommand:pinflow.openContainer',
        'onCommand:pinflow.openRunDiff',
        'onCommand:pinflow.openRunDirectory',
      ]),
    );
  });

  it('wires refresh and inline run actions into the menus contribution', () => {
    expect(manifest.contributes?.menus?.['view/title']).toEqual([
      { command: 'pinflow.openSettings',  when: 'view == pinflow.status',  group: 'navigation' },
      { command: 'pinflow.refreshPanel', when: 'view == pinflow.runs',    group: 'navigation' },
      { command: 'pinflow.refreshPanel', when: 'view == pinflow.actions', group: 'navigation' },
    ]);
    expect(manifest.contributes?.menus?.['view/item/context']).toEqual([
      { command: 'pinflow.openRunDiff',      when: 'viewItem == pinflow.run', group: 'inline' },
      { command: 'pinflow.openRunDirectory', when: 'viewItem == pinflow.run', group: 'inline' },
    ]);
  });

  it('contributes the package-2.5 user settings', () => {
    expect(manifest.contributes?.configuration?.title).toBe('PinFlow');
    const props = manifest.contributes?.configuration?.properties ?? {};
    expect(Object.keys(props)).toEqual([
      'pinflow.refreshIntervalMs',
      'pinflow.runs.todayExpandedByDefault',
      'pinflow.timeFormat',
      'pinflow.notifications.runFailed',
      'pinflow.externalHandoff.defaultProvider',
      'pinflow.workspace.preferredFolder',
    ]);
    expect(props['pinflow.refreshIntervalMs'].default).toBe(3000);
    expect(props['pinflow.refreshIntervalMs'].minimum).toBe(500);
    expect(props['pinflow.refreshIntervalMs'].maximum).toBe(60000);
    expect(props['pinflow.timeFormat'].enum).toEqual(['24h', '12h']);
    expect(props['pinflow.externalHandoff.defaultProvider'].enum).toEqual(['codex', 'claude']);
  });

  it('contributes the openSettings command and Status-view toolbar button', () => {
    const commandIds = manifest.contributes?.commands?.map((c) => c.command) ?? [];
    expect(commandIds).toContain('pinflow.openSettings');

    const viewTitle = manifest.contributes?.menus?.['view/title'] ?? [];
    expect(viewTitle).toContainEqual({
      command: 'pinflow.openSettings',
      when: 'view == pinflow.status',
      group: 'navigation',
    });
  });

  it('contributes the package-3a welcome blocks for not-configured and empty-workspace states', () => {
    const welcome = manifest.contributes?.viewsWelcome;
    expect(welcome).toBeDefined();
    expect(welcome).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          view: 'pinflow.status',
          when: expect.stringContaining('pinflow.notConfigured'),
        }),
        expect.objectContaining({
          view: 'pinflow.status',
          when: 'workbenchState == empty',
        }),
      ]),
    );
    const notConfigured = welcome?.find((entry) =>
      entry.when.includes('pinflow.notConfigured'),
    );
    expect(notConfigured?.contents).toContain('command:pinflow.runInit');
    expect(notConfigured?.contents).toContain('command:pinflow.openDocumentation');
    const emptyWorkspace = welcome?.find(
      (entry) => entry.when === 'workbenchState == empty',
    );
    expect(emptyWorkspace?.contents).toContain('command:vscode.openFolder');
  });

  it('contributes the package-3a commands and activation events', () => {
    const commands = manifest.contributes?.commands?.map((c) => c.command) ?? [];
    expect(commands).toEqual(
      expect.arrayContaining([
        'pinflow.runInit',
        'pinflow.openDocumentation',
        'pinflow.openPreview',
      ]),
    );
    expect(manifest.activationEvents).toEqual(
      expect.arrayContaining([
        'onCommand:pinflow.runInit',
        'onCommand:pinflow.openDocumentation',
        'onCommand:pinflow.openPreview',
      ]),
    );
  });

  it('contributes the package-3a preferredFolder user setting', () => {
    const props = manifest.contributes?.configuration?.properties ?? {};
    expect(props['pinflow.workspace.preferredFolder']).toBeDefined();
    expect(props['pinflow.workspace.preferredFolder'].type).toBe('string');
    expect(props['pinflow.workspace.preferredFolder'].default).toBe('');
  });
});
