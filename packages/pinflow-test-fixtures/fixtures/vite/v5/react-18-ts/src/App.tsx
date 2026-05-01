import { useState } from 'react';
import { Navigation } from './Navigation';
import architectureVisual from '../../../../../../../assets/architecture.webp';
import codeToUiVisual from '../../../../../../../assets/code-to-ui.webp';
import localSetupFlowVisual from '../../../../../../../assets/local-setup-flow.webp';
import pinflowOverviewVisual from '../../../../../../../assets/pinflow-overview.webp';
import pinflowStackedLight from '../../../../../../../assets/pinflow-stacked-light.png';
import pinflowWordmarkSloganLight from '../../../../../../../assets/pinflow-wordmark-slogan-light.png';
import uiToCodeVisual from '../../../../../../../assets/ui-to-code.webp';
import workflowLoopVisual from '../../../../../../../assets/workflow-loop.webp';
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
  testFocus: string;
  component?: React.ComponentType;
}

const components: ComponentConfig[] = [
  {
    id: 'home',
    title: 'Developer Canvas',
    description:
      'Technische Testflaeche fuer UI-Auswahl, Annotationen und Agenten-Workflows.',
    testFocus: 'Gesamtfluss von Auswahl bis Repo-Diff',
  },
  {
    id: 'advanced-hooks',
    title: 'Advanced Hooks',
    description:
      'Demo fuer komplexere Hook-Muster und interaktive Zustandslogik.',
    testFocus: 'Reducer, Refs, Custom Hooks und Layout-Effekte',
    component: AdvancedHooks,
  },
  {
    id: 'basic-elements',
    title: 'Basic Elements',
    description:
      'Kleine UI-Bausteine fuer Markierung, Mapping und erste Anmerkungen.',
    testFocus: 'Headings, Buttons, Inputs und einfache DOM-Ziele',
    component: BasicElements,
  },
  {
    id: 'children-manipulation',
    title: 'Children API',
    description:
      'Verschachtelte Child-Strukturen fuer Auswahlpfade und Komponentenauflosung.',
    testFocus: 'Children.map, cloneElement und erzeugte Child-Strukturen',
    component: ChildrenManipulation,
  },
  {
    id: 'compound-components',
    title: 'Compound Components',
    description:
      'Gekoppelte Komponenten mit geteiltem Zustand und enger Layout-Beziehung.',
    testFocus: 'Tabs, Accordion und Komponentenfamilien',
    component: CompoundComponents,
  },
  {
    id: 'conditional-rendering',
    title: 'Bedingtes Rendering',
    description:
      'Wechselnde Renderpfade fuer Zustandswechsel, Sichtbarkeit und Ausnahmen.',
    testFocus: 'Sichtbare, versteckte und ersetzte UI-Zweige',
    component: ConditionalRendering,
  },
  {
    id: 'context',
    title: 'Context API',
    description:
      'Kontextbasierte Komponentenhierarchie fuer Source-Mapping und Auswahl.',
    testFocus: 'Provider, Consumer und tiefe Kontext-Nutzung',
    component: Context,
  },
  {
    id: 'deeply-nested',
    title: 'Tiefe Hierarchien',
    description:
      'Komplexe Tiefe fuer robustes Element-Picking und Komponentenauflosung.',
    testFocus: 'Auswahl durch viele DOM- und Komponentenebenen',
    component: DeeplyNested,
  },
  {
    id: 'dynamic-content',
    title: 'Dynamische Inhalte',
    description:
      'Lebendige Inhalte fuer Annotationen an wechselnden UI-Stellen.',
    testFocus: 'Hinzufuegen, Entfernen und Umordnen dynamischer Elemente',
    component: DynamicContent,
  },
  {
    id: 'edge-cases',
    title: 'Edge Cases',
    description:
      'Sammelstelle fuer schwierige oder ungewoehnliche UI-Randfaelle.',
    testFocus: 'Null, undefined, leere Fragmente und seltene Renderwerte',
    component: EdgeCases,
  },
  {
    id: 'error-boundaries',
    title: 'Error Boundaries',
    description:
      'Fehlerszenarien fuer robuste Overlay- und Mapping-Pruefungen.',
    testFocus: 'Fehlerzustand, Recovery und stabile Overlay-Anbindung',
    component: ErrorBoundaries,
  },
  {
    id: 'event-handlers',
    title: 'Event-Handler',
    description: 'Interaktive Teststrecke fuer Klicks, Fokus und Delegation.',
    testFocus: 'Click, Change, Submit und Fokus-Flows',
    component: EventHandlers,
  },
  {
    id: 'fragments',
    title: 'Fragments',
    description:
      'Mehrteilige React-Strukturen fuer Auswahl, Mapping und Layoutlogik.',
    testFocus: 'Fragment-Grenzen ohne zusaetzliche DOM-Wrapper',
    component: Fragments,
  },
  {
    id: 'h-o-cs',
    title: 'HOCs',
    description:
      'Higher-Order-Component-Beispiele fuer Komponentennamen und Huelle.',
    testFocus: 'Gewrappte Komponenten und lesbare Source-Zuordnung',
    component: HOCs,
  },
  {
    id: 'lazy-loading',
    title: 'Lazy Loading',
    description: 'Asynchrone UI fuer Load-Zustaende und nachgeladene Bereiche.',
    testFocus: 'Suspense, Fallback und spaeter sichtbare Komponenten',
    component: LazyLoading,
  },
  {
    id: 'lists',
    title: 'Lists',
    description:
      'Listenansichten fuer wiederholte Elemente und strukturierte Auswahl.',
    testFocus: 'Wiederholte Items, Keys und stabile Zielauswahl',
    component: Lists,
  },
  {
    id: 'member-expressions',
    title: 'Member Expressions',
    description:
      'Komponentenreferenzen und Source-Zuordnung in tieferen Zugriffspfaden.',
    testFocus: 'Namespace- und Member-Komponenten im Source-Mapping',
    component: MemberExpressions,
  },
  {
    id: 'memo',
    title: 'Memo',
    description:
      'Memoisierte Komponentenflaeche fuer stabile Referenzen im Preview-Canvas.',
    testFocus: 'memo, callbacks und Ref-Forwarding',
    component: Memo,
  },
  {
    id: 'portals',
    title: 'Portals',
    description:
      'Portale und Layer fuer Overlay, Fokus und z-index-nahe Pruefungen.',
    testFocus: 'Modal-, Tooltip- und Portal-Ziele ausserhalb der Hierarchie',
    component: Portals,
  },
  {
    id: 'react18-features',
    title: 'React 18 Features',
    description: 'Aktuelle React-Features fuer moderne App-Flows in der Demo.',
    testFocus: 'Transitions, deferred values und useId',
    component: React18Features,
  },
  {
    id: 'ref-patterns',
    title: 'Ref Patterns',
    description: 'Ref-basierte Strukturen fuer Fokus und Elementzugriff.',
    testFocus: 'useRef, Callback-Refs, forwardRef und Messpunkte',
    component: RefPatterns,
  },
  {
    id: 'render-props',
    title: 'Render Props',
    description:
      'Dynamisch erzeugte UI ueber Render Props fuer Preview und Mapping.',
    testFocus: 'Render-Prop-Ausgabe und dynamische Child-Funktionen',
    component: RenderProps,
  },
  {
    id: 's-s-r-hydration',
    title: 'SSR & Hydration',
    description:
      'Hydrationsfaelle fuer serverseitig gerenderte Komponenten und Overlay-Start.',
    testFocus: 'Client-only Bereiche, Hydration und Browser-Guards',
    component: SSRHydration,
  },
  {
    id: 's-v-g-elements',
    title: 'SVG-Elemente',
    description: 'Vektorbasierte UI-Bausteine fuer Auswahl- und Tooltip-Flows.',
    testFocus: 'SVG-Knoten, Icons und grafische Auswahlziele',
    component: SVGElements,
  },
  {
    id: 'self-closing',
    title: 'Self-Closing Tags',
    description: 'Kompakte Syntaxfaelle fuer Parser und Komponentenauflosung.',
    testFocus: 'Self-closing JSX und kompakte Elementquellen',
    component: SelfClosing,
  },
  {
    id: 'smoke-test',
    title: 'Smoke-Test',
    description:
      'Schneller Gesamtcheck fuer PinFlow-Verhalten in der Vorschau.',
    testFocus: 'Basis-Auswahl, Kommentar, Status und stabiler Testlauf',
    component: SmokeTest,
  },
  {
    id: 'styling',
    title: 'Styling',
    description:
      'Designnahe UI fuer Stilvarianten, Zustandsfarben und Oberflaechen.',
    testFocus: 'Klassen, Inline-Styles und visuelle Varianten',
    component: Styling,
  },
  {
    id: 'type-script-features',
    title: 'TypeScript Features',
    description:
      'Typisierte Komponentenflaeche fuer robuste Source- und Runtime-Mappings.',
    testFocus: 'Generics, Props-Typen und typisierte Komponenten',
    component: TypeScriptFeatures,
  },
];

interface ProductDemoProps {
  onOpenCanvas: () => void;
}

interface AreaHeaderProps {
  onOpenCanvas: () => void;
  onOpenPinFlow: () => void;
}

function AreaHeader({
  onOpenCanvas,
  onOpenPinFlow,
}: AreaHeaderProps) {
  return (
    <header className="area-header">
      <nav className="area-switcher" aria-label="Bereich wechseln">
        <button
          type="button"
          className="active"
          onClick={onOpenPinFlow}
        >
          PinFlow
        </button>
        <button
          type="button"
          onClick={onOpenCanvas}
        >
          Developer Canvas
        </button>
      </nav>
    </header>
  );
}

function ProductDemo({ onOpenCanvas }: ProductDemoProps) {
  return (
    <section className="product-demo">
      <section className="product-hero">
        <div className="product-hero-copy">
          <img
            className="product-hero-wordmark"
            src={pinflowWordmarkSloganLight}
            alt="PinFlow - Pin it. Flow it. Ship it."
          />
          <span className="product-kicker">Local UI-to-code workflow</span>
          <h1>Mark the UI. Ship the diff.</h1>
          <p>
            PinFlow verbindet Feedback direkt aus dem Browser mit dem lokalen
            Coding-Agent. Am Ende zaehlt nicht eine Notiz, sondern ein echter
            Git-Diff im Repo.
          </p>
          <div className="product-actions">
            <button type="button" onClick={onOpenCanvas}>
              Developer Canvas oeffnen
            </button>
            <a href="#workflow">Workflow ansehen</a>
          </div>
        </div>
        <figure className="product-hero-visual">
          <img src={pinflowOverviewVisual} alt="PinFlow Workflow-Uebersicht" />
        </figure>
      </section>

      <section id="workflow" className="product-flow">
        <div className="product-section-copy">
          <span className="product-kicker">Der Kern</span>
          <h2>Vom sichtbaren Problem zum lokalen Code-Diff.</h2>
          <p>
            Der Browser ist die Eingabe. Der lokale Runner ist die Ausfuehrung.
            Das Repo bleibt die Wahrheit.
          </p>
        </div>
        <div className="product-flow-grid">
          <article>
            <img src={uiToCodeVisual} alt="UI-Auswahl wird zu Code-Kontext" />
            <span>01</span>
            <strong>UI markieren</strong>
          </article>
          <article>
            <img src={workflowLoopVisual} alt="PinFlow Workflow Loop" />
            <span>02</span>
            <strong>Runner uebernimmt</strong>
          </article>
          <article>
            <img src={codeToUiVisual} alt="Code-Aenderung landet wieder in der UI" />
            <span>03</span>
            <strong>Diff pruefen</strong>
          </article>
        </div>
      </section>

      <section className="product-split">
        <div className="product-section-copy">
          <span className="product-kicker">Lokale Ausfuehrung</span>
          <h2>PinFlow startet dort, wo dein Projekt wirklich liegt.</h2>
          <p>
            Ein Dev-Befehl verbindet Preview, Relay und Runner. Der Nutzer sieht
            den Ablauf, waehrend der Agent im lokalen Workspace arbeitet.
          </p>
        </div>
        <img src={localSetupFlowVisual} alt="Lokaler PinFlow Setup Flow" />
      </section>

      <section className="product-split product-split-dark">
        <div className="product-section-copy">
          <span className="product-kicker">Architektur</span>
          <h2>Eine klare Schicht zwischen Browser und Coding-Agent.</h2>
          <p>
            Annotation, Kontext, Runner-Evidence und Repo-Diff bleiben getrennt,
            aber nachvollziehbar verbunden.
          </p>
        </div>
        <img src={architectureVisual} alt="PinFlow Architektur" />
      </section>
    </section>
  );
}

function HomeIntro() {
  return (
    <section className="preview-home">
      <article className="preview-home-hero">
        <div className="preview-home-hero-art">
          <div className="preview-home-device" aria-hidden="true">
            <img
              className="preview-home-hero-image"
              src={pinflowStackedLight}
              alt=""
            />
            <div className="preview-home-proof">
              <span>Picker</span>
              <strong>Element erkannt</strong>
            </div>
            <div className="preview-home-proof preview-home-proof-alt">
              <span>Runner</span>
              <strong>Diff geschrieben</strong>
            </div>
          </div>
        </div>
        <div className="preview-home-hero-copy">
          <span className="preview-kicker">PinFlow Vorschau</span>
          <img
            className="preview-home-wordmark"
            src={pinflowWordmarkSloganLight}
            alt="PinFlow - Pin it. Flow it. Ship it."
          />
          <h1 className="preview-home-title">UI markieren. Code aendern.</h1>
          <p className="page-description">
            Diese Vorschau ist ein lokales Test-Labor: links echte React-Muster,
            rechts der PinFlow-Arbeitsbereich fuer Kommentare, Runner und
            Repo-Diffs.
          </p>
          <div className="preview-home-flowline" aria-label="PinFlow Ablauf">
            <span>Element waehlen</span>
            <span>Kommentar senden</span>
            <span>Diff im Repo pruefen</span>
          </div>
          <div className="preview-home-statusbar" aria-label="Laborstatus">
            <div>
              <span>Canvas</span>
              <strong>28 Tests</strong>
            </div>
            <div>
              <span>Runner</span>
              <strong>Live</strong>
            </div>
            <div>
              <span>Truth</span>
              <strong>Git diff</strong>
            </div>
          </div>
        </div>
      </article>

      <GoldenPathDemo />

      <section className="preview-home-system">
        <article>
          <span className="preview-rail-label">Canvas</span>
          <strong>React-Muster bleiben sichtbar.</strong>
          <p>
            Die Navigation links sammelt echte Komponentenfaelle fuer Picker,
            Source-Mapping und Runtime-Kontext.
          </p>
        </article>
        <article>
          <span className="preview-rail-label">Workflow</span>
          <strong>PinFlow arbeitet rechts.</strong>
          <p>
            Der Launcher oeffnet Kommentare, Warteliste, Runner-Status und den
            Nachweis, ob ein Code-Diff entstanden ist.
          </p>
        </article>
        <article>
          <span className="preview-rail-label">Wahrheit</span>
          <strong>Das Repo entscheidet.</strong>
          <p>
            Ein erledigter Auftrag zaehlt erst, wenn die Aenderung als normaler
            lokaler Git-Diff sichtbar ist.
          </p>
        </article>
      </section>

      <section className="preview-home-section preview-home-assets">
        <div className="preview-home-section-head">
          <h2>Produkt-Visuals</h2>
          <p>
            Dieselben Bilder erklaeren auch die Produktdemo. Im Canvas bleiben
            sie als schnelle technische Referenz sichtbar.
          </p>
        </div>
        <div className="preview-home-asset-list">
          <div>
            <img src={uiToCodeVisual} alt="UI zu Code" />
            <span>Demo</span>
            <strong>UI-Auswahl wird Code-Kontext</strong>
          </div>
          <div>
            <img src={workflowLoopVisual} alt="Workflow Loop" />
            <span>Code zu UI</span>
            <strong>Runner fuehrt lokal aus</strong>
          </div>
          <div>
            <img src={architectureVisual} alt="Architektur" />
            <span>Architektur</span>
            <strong>Browser, Relay und Agent sauber getrennt</strong>
          </div>
        </div>
      </section>
    </section>
  );
}

function GoldenPathDemo() {
  const [checks, setChecks] = useState(1);

  return (
    <section
      className="preview-home-section golden-path-demo"
      data-demo-id="pinflow-60-second-golden-path"
    >
      <div className="preview-home-section-head">
        <h2>60-Sekunden Golden Path</h2>
        <p>
          Dieses Element bleibt bewusst klein und stabil, damit PinFlow den Weg
          von sichtbarer UI zu Source, Runtime-Kontext und Re-Capture pruefen
          kann.
        </p>
      </div>
      <div className="golden-path-demo-body">
        <button
          className="golden-path-action"
          type="button"
          onClick={() => setChecks((value) => value + 1)}
        >
          Start source-exact edit
        </button>
        <p>
          Live-Checks: <strong>{checks}</strong>
        </p>
      </div>
    </section>
  );
}

export function App() {
  const [activeComponent, setActiveComponent] = useState('product-demo');

  const currentComponent =
    components.find((c) => c.id === activeComponent) || components[0];
  const Component = currentComponent.component;
  const isHome = currentComponent.id === 'home';
  const isProductDemo = activeComponent === 'product-demo';
  const openPinFlow = () => setActiveComponent('product-demo');
  const openCanvas = () => setActiveComponent('home');

  return (
    <div className={`app ${isProductDemo ? 'product-mode' : 'canvas-mode'}`}>
      {isProductDemo ? (
        <AreaHeader onOpenCanvas={openCanvas} onOpenPinFlow={openPinFlow} />
      ) : null}
      {!isProductDemo ? (
        <Navigation
          activeItem={activeComponent}
          onNavigate={setActiveComponent}
          onOpenPinFlow={openPinFlow}
        />
      ) : null}

      <main className="main-content">
        <div className="content-wrapper">
          {isProductDemo ? (
            <ProductDemo onOpenCanvas={openCanvas} />
          ) : isHome ? (
            <HomeIntro />
          ) : (
            <>
              <header className="page-header">
                <div className="page-header-main">
                  <div>
                    <div className="preview-kicker">Labor-Testflaeche</div>
                    <h1 className="page-title">{currentComponent.title}</h1>
                    <p className="page-description">
                      {currentComponent.description}
                    </p>
                  </div>
                  <div className="page-header-signal" aria-hidden="true">
                    <span>UI</span>
                    <span>Context</span>
                    <span>Diff</span>
                  </div>
                </div>
                <div className="preview-lab-strip" aria-label="Testziel">
                  <div>
                    <span>Testet</span>
                    <strong>{currentComponent.testFocus}</strong>
                  </div>
                  <div>
                    <span>Ablauf</span>
                    <strong>Element markieren, Kommentar senden, Diff pruefen</strong>
                  </div>
                </div>
              </header>

              <div className="component-section">
                {Component ? <Component /> : null}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
