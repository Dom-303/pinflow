import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const LEGACY_BRAND = ['Dom', 'scribe'].join('');

function readFixture(relativePath: string): string {
  return readFileSync(
    resolve(
      process.cwd(),
      'packages/pinflow-test-fixtures/fixtures',
      relativePath,
    ),
    'utf8',
  );
}

describe('pinflow visible fixture copy', () => {
  it('brands the canonical preview smoke-test globals and logs as PinFlow', () => {
    const smokeTest = readFixture('vite/v5/react-18-ts/src/pinflow-smoke-test.ts');
    const smokeComponent = readFixture('vite/v5/react-18-ts/src/components/SmokeTest.tsx');

    expect(smokeTest).toContain('const pinflowUtils = {');
    expect(smokeTest).toContain(
      '(window as unknown as Record<string, unknown>).pinflow = pinflowUtils;',
    );
    expect(smokeTest).toContain('[pinflow-preview] Runtime initialized');
    expect(smokeTest).toContain(
      '[pinflow-preview] Smoke test utilities loaded. Available commands:',
    );
    expect(smokeTest).toContain(
      '  pinflow.captureElement(element) - Capture context for element',
    );
    expect(smokeComponent).toContain('exposes pinflow.* to console');
    expect(smokeComponent).not.toContain(LEGACY_BRAND);
  });

  it('brands next fixture metadata as PinFlow', () => {
    const layout = readFixture('next/v15/ts/app/layout.tsx');
    const metadata = readFixture('next/v15/ts/src/components/Metadata.tsx');

    expect(layout).toContain("description: 'Test fixture for PinFlow transform validation'");
    expect(metadata).toContain("title: 'PinFlow Test Fixture'");
    expect(metadata).toContain("description: 'Next.js test fixture for PinFlow transform validation'");
    expect(metadata).toContain('PinFlow captures');
  });

  it('brands the Nuxt smoke utilities as PinFlow-only in the browser helper surface', () => {
    const plugin = readFixture('nuxt/v3/ts/plugins/pinflow.client.ts');
    const smokeModule = readFixture('nuxt/v3/ts/pinflow-smoke-test.ts');
    const nuxtConfig = readFixture('nuxt/v3/ts/nuxt.config.ts');

    expect(plugin).toContain('const pinflowUtils = {');
    expect(plugin).toContain(
      '(window as unknown as Record<string, unknown>).pinflow = pinflowUtils;',
    );
    expect(smokeModule).toContain(
      'Available commands: pinflow.captureElement(el), pinflow.captureSelector(sel), pinflow.listTracked(), pinflow.status()',
    );
    expect(nuxtConfig).toContain('pinflow: {');
    expect(nuxtConfig).not.toContain(LEGACY_BRAND);
  });

  it('localizes the most visible React preview components to natural German copy', () => {
    const basic = readFixture('vite/v5/react-18-ts/src/components/BasicElements.tsx');
    const lists = readFixture('vite/v5/react-18-ts/src/components/Lists.tsx');
    const events = readFixture('vite/v5/react-18-ts/src/components/EventHandlers.tsx');
    const portals = readFixture('vite/v5/react-18-ts/src/components/Portals.tsx');
    const ssr = readFixture('vite/v5/react-18-ts/src/components/SSRHydration.tsx');
    const conditional = readFixture(
      'vite/v5/react-18-ts/src/components/ConditionalRendering.tsx',
    );
    const dynamic = readFixture(
      'vite/v5/react-18-ts/src/components/DynamicContent.tsx',
    );
    const context = readFixture('vite/v5/react-18-ts/src/components/Context.tsx');
    const compound = readFixture(
      'vite/v5/react-18-ts/src/components/CompoundComponents.tsx',
    );
    const edgeCases = readFixture(
      'vite/v5/react-18-ts/src/components/EdgeCases.tsx',
    );

    expect(basic).toContain('Blockelement');
    expect(basic).toContain('Texteingabe');
    expect(basic).toContain('Beschriftetes Formular');
    expect(basic).toContain('Dies ist ein Button');

    expect(lists).toContain('Einfache Liste mit .map()');
    expect(lists).toContain('Liste mit Objektschluesseln');
    expect(lists).toContain('Verschachtelte Listen');

    expect(events).toContain('Klick-Handler');
    expect(events).toContain('Formular absenden');
    expect(events).toContain('Hover fuer Konsolenhinweis');

    expect(portals).toContain('Modal ueber Portal');
    expect(portals).toContain('Tooltip ueber Portal');
    expect(portals).toContain('Direktes Portal ohne Wrapper-Komponente');

    expect(ssr).toContain('Client-only-Inhalt');
    expect(ssr).toContain('Fensterpruefung');
    expect(ssr).toContain('Hydration-sicherer Zeitstempel');
    expect(ssr).toContain('Browser-API-Pruefungen');

    expect(conditional).toContain('Modusabhaengige Darstellung');
    expect(conditional).toContain('Inhalt umschalten');
    expect(conditional).toContain('Modus wechseln');

    expect(dynamic).toContain('Zaehler mit useState');
    expect(dynamic).toContain('Dynamische Liste mit useEffect');
    expect(dynamic).toContain('Zustandsabhaengige Hinweise');

    expect(context).toContain('Theme Context (useContext-Hook)');
    expect(context).toContain('Benutzerkontext');
    expect(context).toContain('Verschachtelte Kontexte');

    expect(compound).toContain('Tabs (Compound Component)');
    expect(compound).toContain('Karte (Slot-Pattern)');
    expect(compound).toContain('Polymorphe Komponente (as-Prop)');

    expect(edgeCases).toContain('Null- und Undefined-Rueckgaben');
    expect(edgeCases).toContain('Leeres Fragment');
    expect(edgeCases).toContain('Inline-Null/Undefined/Boolean');
  });
});
