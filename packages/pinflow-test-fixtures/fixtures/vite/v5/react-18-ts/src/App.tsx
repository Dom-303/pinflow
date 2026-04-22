import { useState } from 'react';
import { Navigation } from './Navigation';
import codeToUiImage from '../../../../../../../assets/code-to-ui.png';
import uiToCodeImage from '../../../../../../../assets/ui-to-code.png';
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
  component: React.ComponentType;
}

const components: ComponentConfig[] = [
  {
    id: 'advanced-hooks',
    title: 'Erweiterte Hooks',
    description: 'Demoflaeche fuer komplexere Hook-Muster und Interaktionen.',
    component: AdvancedHooks,
  },
  {
    id: 'basic-elements',
    title: 'Grundelemente',
    description:
      'Einfacher Vorschau-Baustein fuer Markierung, Mapping und Kommentare.',
    component: BasicElements,
  },
  {
    id: 'children-manipulation',
    title: 'Kinder-Elemente',
    description: 'Beispiel fuer verschachtelte Child-Strukturen und Auswahlpfade.',
    component: ChildrenManipulation,
  },
  {
    id: 'compound-components',
    title: 'Verbundene Komponenten',
    description: 'Testflaeche fuer gekoppelte UI-Bausteine mit geteiltem Zustand.',
    component: CompoundComponents,
  },
  {
    id: 'conditional-rendering',
    title: 'Bedingte Darstellung',
    description:
      'Ansicht fuer dynamische UI-Zustaende und unterschiedliche Renderpfade.',
    component: ConditionalRendering,
  },
  {
    id: 'context',
    title: 'Kontext',
    description:
      'Kontextbasierte Komponentenhierarchie fuer Source-Mapping und Auswahl.',
    component: Context,
  },
  {
    id: 'deeply-nested',
    title: 'Tief verschachtelt',
    description: 'Komplexe Tiefe fuer den Picker und robuste Komponentenauflosung.',
    component: DeeplyNested,
  },
  {
    id: 'dynamic-content',
    title: 'Dynamische Inhalte',
    description: 'Wechselnde Inhalte fuer Annotationen an lebendigen UI-Stellen.',
    component: DynamicContent,
  },
  {
    id: 'edge-cases',
    title: 'Sonderfaelle',
    description: 'Sammelstelle fuer schwierige oder ungewohnliche UI-Randfaelle.',
    component: EdgeCases,
  },
  {
    id: 'error-boundaries',
    title: 'Fehlergrenzen',
    description: 'Fehlerszenarien fuer robuste Overlay- und Mapping-Prufungen.',
    component: ErrorBoundaries,
  },
  {
    id: 'event-handlers',
    title: 'Ereignis-Handler',
    description: 'Interaktive Teststrecke fuer Klicks, Fokus und Event-Delegation.',
    component: EventHandlers,
  },
  {
    id: 'fragments',
    title: 'Fragmente',
    description: 'Mehrteilige React-Strukturen fuer die PinFlow-Auswahl.',
    component: Fragments,
  },
  {
    id: 'h-o-cs',
    title: 'HOCs',
    description: 'Higher-Order-Component-Beispiele fuer Mapping und Komponentennamen.',
    component: HOCs,
  },
  {
    id: 'lazy-loading',
    title: 'Verzoegertes Laden',
    description: 'Asynchrone Oberflaeche fuer Load-Zustaende und nachgeladene UI.',
    component: LazyLoading,
  },
  {
    id: 'lists',
    title: 'Listen',
    description: 'Listenansichten fuer wiederholte Elemente und strukturierte Auswahl.',
    component: Lists,
  },
  {
    id: 'member-expressions',
    title: 'Member-Ausdruecke',
    description:
      'Beispiel fuer tiefer gebaute Komponentenreferenzen und Source-Zuordnung.',
    component: MemberExpressions,
  },
  {
    id: 'memo',
    title: 'Memo',
    description: 'Memoisierte Komponentenflaeche fuer stabile Referenzen im Preview-Canvas.',
    component: Memo,
  },
  {
    id: 'portals',
    title: 'Portale',
    description: 'Portale und Layer fuer Overlay, Fokus und z-index-nahe Pruefungen.',
    component: Portals,
  },
  {
    id: 'react18-features',
    title: 'React-18-Funktionen',
    description: 'Aktuelle React-Features fuer moderne App-Flows in der Demo.',
    component: React18Features,
  },
  {
    id: 'ref-patterns',
    title: 'Ref-Muster',
    description: 'Ref-basierte Komponentenstrukturen fuer Fokus und Elementzugriff.',
    component: RefPatterns,
  },
  {
    id: 'render-props',
    title: 'Render Props',
    description: 'Dynamisch erzeugte UI ueber Render Props fuer Preview und Mapping.',
    component: RenderProps,
  },
  {
    id: 's-s-r-hydration',
    title: 'SSR-Hydration',
    description:
      'Hydrationsfaelle fuer serverseitig gerenderte Komponenten und Overlay-Start.',
    component: SSRHydration,
  },
  {
    id: 's-v-g-elements',
    title: 'SVG-Elemente',
    description:
      'Vektorbasierte UI-Bausteine fuer komplexere Auswahl- und Tooltip-Flows.',
    component: SVGElements,
  },
  {
    id: 'self-closing',
    title: 'Selbstschliessend',
    description:
      'Kompakte Syntaxfaelle fuer Parser, Mapping und Komponentenauflosung.',
    component: SelfClosing,
  },
  {
    id: 'smoke-test',
    title: 'Smoke-Test',
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
    title: 'TypeScript-Funktionen',
    description:
      'Typisierte Komponentenflaeche fuer robuste Source- und Runtime-Mappings.',
    component: TypeScriptFeatures,
  },
];

export function App() {
  const [activeComponent, setActiveComponent] = useState('advanced-hooks');

  const currentComponent =
    components.find((c) => c.id === activeComponent) || components[0];
  const Component = currentComponent.component;

  return (
    <div className="app">
      <Navigation
        activeItem={activeComponent}
        onNavigate={setActiveComponent}
      />

      <main className="main-content">
        <div className="content-wrapper">
          <header className="page-header">
            <div className="preview-kicker">Vorschau-Flaeche</div>
            <h1 className="page-title">{currentComponent.title}</h1>
            <p className="page-description">{currentComponent.description}</p>
            <div className="preview-callout">
              <strong>Hinweis:</strong> Die eigentliche PinFlow-Arbeitsflaeche
              liegt rechts. Diese linke Flaeche ist nur die Demo, damit du
              Auswahl, Mapping und Kommentare an echten UI-Bausteinen testen
              kannst.
            </div>
            <div className="preview-hero-grid">
              <article className="preview-hero-card">
                <img
                  className="preview-hero-image"
                  src={uiToCodeImage}
                  alt="UI zu Code Visual"
                />
                <div className="preview-hero-copy">
                  <span className="preview-hero-eyebrow">UI zu Code</span>
                  <strong>Markieren, beschreiben, direkt in Arbeit ueberfuehren.</strong>
                </div>
              </article>
              <article className="preview-hero-card">
                <img
                  className="preview-hero-image"
                  src={codeToUiImage}
                  alt="Code zu UI Visual"
                />
                <div className="preview-hero-copy">
                  <span className="preview-hero-eyebrow">Code zu UI</span>
                  <strong>Rueckmeldung, Mapping und visuelle Kontrolle an einem Ort.</strong>
                </div>
              </article>
            </div>
          </header>

          <div className="component-section">
            <Component />
          </div>
        </div>
      </main>
    </div>
  );
}
