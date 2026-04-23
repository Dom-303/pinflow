import { useState } from 'react';
import { Navigation } from './Navigation';
import pinflowStackedLight from '../../../../../../../assets/pinflow-stacked-light.png';
import {
  AdvancedHooks,
  BasicElements,
  ChildrenManipulation,
  CompoundComponents,
  ConditionalRendering,
  Context,
  DeeplyNested,
  DynamicContent,
  EdgeCases,
  ErrorBoundaries,
  EventHandlers,
  Fragments,
  HOCs,
  LazyLoading,
  Lists,
  MemberExpressions,
  Memo,
  Portals,
  React18Features,
  RefPatterns,
  RenderProps,
  SSRHydration,
  SVGElements,
  SelfClosing,
  SmokeTest,
  Styling,
  TypeScriptFeatures,
} from './components';

interface ComponentConfig {
  id: string;
  title: string;
  description: string;
  component?: React.ComponentType;
}

const components: ComponentConfig[] = [
  {
    id: 'home',
    title: 'PinFlow',
    description:
      'Visuelle Arbeitsoberflaeche fuer UI-Auswahl, Annotationen und Agenten-Workflows.',
  },
  {
    id: 'advanced-hooks',
    title: 'Advanced Hooks',
    description: 'Demo fuer komplexere Hook-Muster und interaktive Zustandslogik.',
    component: AdvancedHooks,
  },
  {
    id: 'basic-elements',
    title: 'Basic Elements',
    description:
      'Kleine UI-Bausteine fuer Markierung, Mapping und erste Anmerkungen.',
    component: BasicElements,
  },
  {
    id: 'children-manipulation',
    title: 'Children Manipulation',
    description:
      'Verschachtelte Child-Strukturen fuer Auswahlpfade und Komponentenauflosung.',
    component: ChildrenManipulation,
  },
  {
    id: 'compound-components',
    title: 'Compound Components',
    description:
      'Gekoppelte Komponenten mit geteiltem Zustand und enger Layout-Beziehung.',
    component: CompoundComponents,
  },
  {
    id: 'conditional-rendering',
    title: 'Conditional Rendering',
    description:
      'Wechselnde Renderpfade fuer Zustandswechsel, Sichtbarkeit und Ausnahmen.',
    component: ConditionalRendering,
  },
  {
    id: 'context',
    title: 'Context API',
    description:
      'Kontextbasierte Komponentenhierarchie fuer Source-Mapping und Auswahl.',
    component: Context,
  },
  {
    id: 'deeply-nested',
    title: 'Deeply Nested',
    description:
      'Komplexe Tiefe fuer robustes Element-Picking und Komponentenauflosung.',
    component: DeeplyNested,
  },
  {
    id: 'dynamic-content',
    title: 'Dynamic Content',
    description:
      'Lebendige Inhalte fuer Annotationen an wechselnden UI-Stellen.',
    component: DynamicContent,
  },
  {
    id: 'edge-cases',
    title: 'Edge Cases',
    description: 'Sammelstelle fuer schwierige oder ungewoehnliche UI-Randfaelle.',
    component: EdgeCases,
  },
  {
    id: 'error-boundaries',
    title: 'Error Boundaries',
    description: 'Fehlerszenarien fuer robuste Overlay- und Mapping-Pruefungen.',
    component: ErrorBoundaries,
  },
  {
    id: 'event-handlers',
    title: 'Event Handlers',
    description: 'Interaktive Teststrecke fuer Klicks, Fokus und Delegation.',
    component: EventHandlers,
  },
  {
    id: 'fragments',
    title: 'Fragments',
    description:
      'Mehrteilige React-Strukturen fuer Auswahl, Mapping und Layoutlogik.',
    component: Fragments,
  },
  {
    id: 'h-o-cs',
    title: 'HOCs',
    description:
      'Higher-Order-Component-Beispiele fuer Komponentennamen und Huelle.',
    component: HOCs,
  },
  {
    id: 'lazy-loading',
    title: 'Lazy Loading',
    description: 'Asynchrone UI fuer Load-Zustaende und nachgeladene Bereiche.',
    component: LazyLoading,
  },
  {
    id: 'lists',
    title: 'Lists',
    description:
      'Listenansichten fuer wiederholte Elemente und strukturierte Auswahl.',
    component: Lists,
  },
  {
    id: 'member-expressions',
    title: 'Member Expressions',
    description:
      'Komponentenreferenzen und Source-Zuordnung in tieferen Zugriffspfaden.',
    component: MemberExpressions,
  },
  {
    id: 'memo',
    title: 'Memo',
    description:
      'Memoisierte Komponentenflaeche fuer stabile Referenzen im Preview-Canvas.',
    component: Memo,
  },
  {
    id: 'portals',
    title: 'Portals',
    description: 'Portale und Layer fuer Overlay, Fokus und z-index-nahe Pruefungen.',
    component: Portals,
  },
  {
    id: 'react18-features',
    title: 'React 18 Features',
    description: 'Aktuelle React-Features fuer moderne App-Flows in der Demo.',
    component: React18Features,
  },
  {
    id: 'ref-patterns',
    title: 'Ref Patterns',
    description: 'Ref-basierte Strukturen fuer Fokus und Elementzugriff.',
    component: RefPatterns,
  },
  {
    id: 'render-props',
    title: 'Render Props',
    description:
      'Dynamisch erzeugte UI ueber Render Props fuer Preview und Mapping.',
    component: RenderProps,
  },
  {
    id: 's-s-r-hydration',
    title: 'SSR Hydration',
    description:
      'Hydrationsfaelle fuer serverseitig gerenderte Komponenten und Overlay-Start.',
    component: SSRHydration,
  },
  {
    id: 's-v-g-elements',
    title: 'SVG Elements',
    description:
      'Vektorbasierte UI-Bausteine fuer Auswahl- und Tooltip-Flows.',
    component: SVGElements,
  },
  {
    id: 'self-closing',
    title: 'Self Closing',
    description: 'Kompakte Syntaxfaelle fuer Parser und Komponentenauflosung.',
    component: SelfClosing,
  },
  {
    id: 'smoke-test',
    title: 'Smoke Test',
    description: 'Schneller Gesamtcheck fuer PinFlow-Verhalten in der Vorschau.',
    component: SmokeTest,
  },
  {
    id: 'styling',
    title: 'Styling',
    description: 'Designnahe UI fuer Stilvarianten, Zustandsfarben und Oberflaechen.',
    component: Styling,
  },
  {
    id: 'type-script-features',
    title: 'TypeScript Features',
    description:
      'Typisierte Komponentenflaeche fuer robuste Source- und Runtime-Mappings.',
    component: TypeScriptFeatures,
  },
];

function HomeIntro() {
  return (
    <section className="preview-home">
      <section className="preview-rail">
        <article className="preview-rail-card">
          <span className="preview-rail-label">Linke Seite</span>
          <strong>Vorschau-Demo</strong>
          <p>
            Diese linke Seite bleibt bewusst eine Vorschau fuer echte React-
            Muster, Auswahlpfade und Mapping-Faelle.
          </p>
        </article>
        <article className="preview-rail-card">
          <span className="preview-rail-label">Rechte Seite</span>
          <strong>PinFlow-Arbeitsbereich</strong>
          <p>
            Der eigentliche Arbeitsbereich fuer Annotationen, Queue und
            Agenten-Flow liegt rechts und wird ueber den Launcher geoeffnet.
          </p>
        </article>
      </section>

      <article className="preview-home-hero">
        <div className="preview-home-hero-art">
          <img
            className="preview-home-hero-image"
            src={pinflowStackedLight}
            alt="PinFlow"
          />
        </div>
        <div className="preview-home-hero-copy">
          <span className="preview-kicker">Preview Einstieg</span>
          <h1 className="page-title">PinFlow</h1>
          <p className="page-description">
            Vorschau fuer reale UI-Muster links, eigentliche Arbeitsflaeche
            rechts. So bleibt Test-Coverage sichtbar, ohne den Produktbereich
            zu verwischen.
          </p>
          <div className="preview-callout">
            <strong>Wichtig:</strong> Die eigentliche PinFlow-Arbeitsflaeche
            liegt rechts. Klicke auf das halb sichtbare PinFlow-Logo am rechten
            Bildschirmrand, um den Arbeitsbereich auszuklappen.
          </div>
        </div>
      </article>

      <section className="preview-home-section">
        <div className="preview-home-section-head">
          <h2>Wofuer diese Demo gedacht ist</h2>
          <p>
            Diese Flaeche simuliert echte React-Oberflaechen, damit du Picker,
            Kommentare, Mapping und spaetere Agenten-Workflows gegen
            realistische UI-Muster pruefen kannst.
          </p>
        </div>
        <div className="preview-home-points">
          <article>
            <strong>UI auswaehlen</strong>
            <p>
              Komponenten, verschachtelte Bereiche und dynamische Zustandswechsel
              lassen sich direkt im Canvas markieren.
            </p>
          </article>
          <article>
            <strong>Kommentarfluss testen</strong>
            <p>
              Die rechte PinFlow-Flaeche ist der eigentliche Arbeitsbereich fuer
              Annotationen, Queue und Versand.
            </p>
          </article>
          <article>
            <strong>Technische Sonderfaelle pruefen</strong>
            <p>
              Advanced Hooks, Portals, SSR und andere Muster bleiben bewusst
              in der Navigation, damit die Demo fachlich aussagekraeftig bleibt.
            </p>
          </article>
        </div>
      </section>

      <section className="preview-home-section">
        <div className="preview-home-section-head">
          <h2>Bildmaterial, das noch ersetzt wird</h2>
          <p>
            Die alten Platzhalter-Visuals sind absichtlich raus. Diese drei
            Bereiche bleiben als Platzhalter stehen, bis die finalen PinFlow-
            Bilder vorliegen.
          </p>
        </div>
        <div className="preview-home-placeholders">
          <article className="placeholder-card">
            <span className="placeholder-label">Demo</span>
            <strong>PinFlow Demo-Visual wird aktualisiert</strong>
            <p>
              Hier kommt spaeter die neue Vorschau-Grafik fuer den linken
              Demo-Canvas hinein.
            </p>
          </article>
          <article className="placeholder-card">
            <span className="placeholder-label">Code zu UI</span>
            <strong>Visual fuer Rueckmeldung zu Frontend</strong>
            <p>
              Der alte Uebergang von Code zu UI wird durch ein neues PinFlow-
              Motiv ersetzt.
            </p>
          </article>
          <article className="placeholder-card">
            <span className="placeholder-label">Architektur</span>
            <strong>Architektur-Grafik wird ueberarbeitet</strong>
            <p>
              Die technische Uebersicht bleibt bewusst als Platzhalter, bis das
              neue PinFlow-Diagramm vorliegt.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
}

export function App() {
  const [activeComponent, setActiveComponent] = useState('home');

  const currentComponent =
    components.find((c) => c.id === activeComponent) || components[0];
  const Component = currentComponent.component;
  const isHome = currentComponent.id === 'home';

  return (
    <div className="app">
      <Navigation activeItem={activeComponent} onNavigate={setActiveComponent} />

      <main className="main-content">
        <div className="content-wrapper">
          {isHome ? (
            <HomeIntro />
          ) : (
            <>
              <header className="page-header">
                <div className="preview-kicker">Preview-Demo</div>
                <h1 className="page-title">{currentComponent.title}</h1>
                <p className="page-description">{currentComponent.description}</p>
                <div className="preview-callout">
                  <strong>Hinweis:</strong> Die linke Seite bleibt bewusst eine
                  Vorschau fuer echte UI-Muster. Die rechte PinFlow-Flaeche ist
                  der eigentliche Arbeitsbereich.
                </div>
              </header>

              <div className="component-section">{Component ? <Component /> : null}</div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
