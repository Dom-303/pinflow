<p align="center">
  <img src="./assets/pinflow-overview.png" alt="PinFlow verbindet Browser UI, Kontextkarten und Coding Agenten" width="920" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/npm-v0.6.0--pinflow.0-D99545?style=flat-square&logo=npm&logoColor=white" alt="npm v0.6.0-pinflow.0" />
  <img src="https://img.shields.io/badge/CI-verified-2B2B2B?style=flat-square&logo=githubactions&logoColor=white" alt="CI verified" />
  <img src="https://img.shields.io/badge/coverage-local-2B2B2B?style=flat-square" alt="local coverage" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/MIT-License-D99545?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-D99545?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.x" />
  <img src="https://img.shields.io/badge/Node-%3E%3D18-2B2B2B?style=flat-square&logo=node.js&logoColor=white" alt="Node.js >= 18" />
  <img src="https://img.shields.io/badge/PRs-welcome-D99545?style=flat-square" alt="PRs welcome" />
  <img src="https://img.shields.io/badge/MCP-Compatible-2B2B2B?style=flat-square" alt="MCP Compatible" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-D99545?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vue-D99545?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/Next.js-2B2B2B?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Nuxt-D99545?style=flat-square&logo=nuxt&logoColor=white" alt="Nuxt" />
  <img src="https://img.shields.io/badge/Vite-2B2B2B?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Webpack-2B2B2B?style=flat-square&logo=webpack&logoColor=white" alt="Webpack" />
  <img src="https://img.shields.io/badge/Turbopack-D99545?style=flat-square&logo=turbo&logoColor=white" alt="Turbopack" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-D99545?style=flat-square" alt="Claude Code" />
  <img src="https://img.shields.io/badge/GitHub_Copilot-2B2B2B?style=flat-square&logo=githubcopilot&logoColor=white" alt="GitHub Copilot" />
  <img src="https://img.shields.io/badge/Cursor-2B2B2B?style=flat-square" alt="Cursor" />
  <img src="https://img.shields.io/badge/Gemini-D99545?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Kiro-2B2B2B?style=flat-square" alt="Kiro" />
</p>

---

**PinFlow verbindet dein laufendes Frontend mit deinem Coding Agenten.**

Du klickst im Browser auf ein Element, beschreibst die gewünschte Änderung und
PinFlow legt daraus eine präzise Aufgabe an: mit Source-Datei, Zeile,
Komponente, Props, State, DOM-Kontext und deiner Anweisung. Codex, Claude oder
jeder MCP-kompatible Agent kann den Kontext anschließend direkt verwenden,
statt im Code zu raten.

PinFlow ist bewusst ein Developer-Tool für die lokale Arbeit: sichtbar im
Browser, nachvollziehbar im Repository, anschlussfähig für Agenten.
[Doom-Script / Domscribe](https://github.com/patchorbit/domscribe) bildet dafür
die starke technische Grundlage, auf der PinFlow als fokussierter,
produktisierter Agent-Workflow weiterbaut.

## Schnellstart

```bash
npx pinflow init
```

Der Wizard führt durch zwei Schritte:

1. **Agent verbinden** - Codex, Claude oder einen anderen MCP-Client auswählen.
2. **Frontend anbinden** - Framework und Bundler wählen, Package installieren,
   Config-Snippet übernehmen.

Danach startest du deinen Dev-Server und öffnest die App im Browser. Das
PinFlow-Overlay ist dann bereit für Markierungen, Aufgaben und Live-Kontext.

Alternativen:

- Installiert: `pinflow init`
- Ohne Installation: `npx pinflow init`

## Wie PinFlow lokal läuft

PinFlow ist kein separates Cloud-Dashboard und keine VS-Code-only Extension.
Es läuft in deinem normalen lokalen Entwicklungs-Setup: dein Repo liegt in der
IDE, dein Frontend läuft auf `localhost`, PinFlow hängt sich über Framework- und
Bundler-Integration in die App ein und dein Coding Agent verbindet sich über
MCP mit dem lokalen Relay.

<p align="center">
  <img src="./assets/local-setup-flow.png" alt="PinFlow lokaler Setup-Flow: IDE und Repo, Dev Server, Browser-App, Relay und Coding Agent" width="920" />
</p>

Der wichtige Punkt: Der Browser liefert den sichtbaren UI-Kontext, das Repo
liefert Source-Dateien und lokale Aufgaben, und der Agent fragt beides über
PinFlow ab. Dadurch bleibt der Workflow nah an deiner echten App, ohne dass du
Screenshots, DOM-Details oder Datei-Vermutungen manuell in den Chat tragen
musst.

## Was PinFlow löst

- **UI-Wünsche werden konkrete Code-Aufgaben.** Nicht "irgendwo ist ein Button
  falsch", sondern `PricingCard.tsx:118` plus Laufzeitkontext.
- **Agenten sehen den Browser-Kontext.** Mit `pinflow.query.bySource` kann ein
  Agent prüfen, was eine Source-Zeile gerade live rendert.
- **Der Arbeitsstand bleibt lokal.** Annotationen liegen in
  `.pinflow/annotations/`, Statuswechsel laufen über Relay, REST, WebSocket und
  MCP.
- **Production bleibt sauber.** Die Instrumentierung ist development-only und
  wird aus Production Builds entfernt.

## Der tägliche Loop

<p align="center">
  <img src="./assets/workflow-loop.png" alt="Der tägliche PinFlow Loop: UI sehen, Kontext sichern, Agent arbeitet, prüfen" width="920" />
</p>

Der Kern ist kein riesiger Prozess, sondern ein kurzer Kreislauf: im Browser
sehen, Kontext sichern, Agenten arbeiten lassen, Ergebnis wieder im Browser
prüfen.

## Zwei Arbeitsrichtungen

### UI -> Code

Du markierst im laufenden UI ein Element oder einen Bereich. PinFlow sammelt
Source-Position, Komponente, DOM, Props, State und deine Anweisung. Daraus wird
eine Aufgabe, die ein Agent claimen, bearbeiten und beantworten kann.

<p align="center">
  <img src="./assets/ui-to-code.png" alt="PinFlow UI zu Code Workflow" width="920" />
</p>

### Code -> UI

Der Agent kann auch andersherum arbeiten: Er fragt zu einer Datei und Zeile den
Live-Zustand im Browser ab, bevor er editiert.

<p align="center">
  <img src="./assets/code-to-ui.png" alt="PinFlow Code zu UI Workflow" width="920" />
</p>

> [!TIP]
> Agenten nutzen Runtime-Kontext nicht automatisch. Formuliere es ausdrücklich:
> _"Ändere den CTA. Nutze vorher `pinflow.query.bySource`, um den Live-Kontext
> im Browser zu prüfen."_ Die Zielseite sollte im Browser geöffnet bleiben.

## Features

- **Stabile Build-Time IDs** - deterministische `data-ds` Attribute per AST,
  stabil über HMR und Fast Refresh hinweg
- **Runtime Capture** - Props, State, Komponenten-Metadaten und DOM-Snapshots
  über React Fiber Walking und Vue VNode Inspection
- **Framework Support** - React 18-19, Vue 3, Next.js 15-16, Nuxt 3+ und ein
  [Adapter-Interface](./packages/pinflow-runtime/CUSTOM_ADAPTERS.md)
- **Bundler Support** - Vite 5-7, Webpack 5 und Turbopack
- **Agent Workflow** - Queue, Claim, Process, Respond, Retry, Undo und
  Failure-Status für Overlay und MCP
- **PII Redaction** - E-Mails, Tokens und sensible Muster werden vor dem
  Verlassen des Browsers bereinigt
- **Live Feedback** - WebSocket-Events streamen Antworten und Statuswechsel ins
  Overlay

## Workflow und Einstellungen

| Bereich      | Bedeutung                                                      |
| ------------ | -------------------------------------------------------------- |
| Picker-Modus | Einzelnes Element, Region oder Multi-Select markieren          |
| Dispatch     | Direkt an Codex/Claude senden oder erst nur sammeln            |
| Queue        | Aufgaben von `queued` über `claimed` bis `processed` verfolgen |
| Undo         | Lokale Auswahl zurücknehmen oder Follow-up-Aufgabe erzeugen    |
| Session      | Agent, Dispatch-Verhalten und Defaults sichtbar einstellen     |

Wenn Relay oder MCP nicht laufen, soll PinFlow das klar zeigen: Kontext kann
weiter gesammelt werden, Agent Processing braucht aber die lokale Verbindung.

## Architektur

<p align="center">
  <img src="./assets/architecture.png" alt="PinFlow Architektur: App Source, Bundler, Manifest, Runtime, Overlay, Relay, Queue und Agents" width="920" />
</p>

1. **Inject** - der Bundler injiziert stabile `data-ds` IDs und schreibt das
   Manifest nach `.pinflow/manifest.jsonl`.
2. **Capture** - Runtime Adapter sammeln DOM, Props, State und Komponenteninfos
   aus der laufenden App.
3. **Relay** - ein lokaler Fastify-Daemon verbindet Browser, Repository und MCP.
4. **Agent** - Codex, Claude oder andere MCP-Clients fragen Live-Kontext ab oder
   bearbeiten Annotationen.

## Installation im Detail

> [!NOTE]
> `npx pinflow init` erledigt die Setup-Schritte automatisch. Die manuelle
> Einrichtung ist vor allem für Monorepos oder bewusst kontrollierte Setups
> gedacht.

### App-Seite

<details>
<summary><strong>Next.js 15/16</strong> - <code>npm install -D @pinflow/next</code></summary>

```ts
// next.config.ts
import type { NextConfig } from 'next';
import { withPinFlow } from '@pinflow/next';

const nextConfig: NextConfig = {};

export default withPinFlow()(nextConfig);
```

</details>

<details>
<summary><strong>Nuxt 3+</strong> - <code>npm install -D @pinflow/nuxt</code></summary>

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinflow/nuxt'],
});
```

</details>

<details>
<summary><strong>React 18/19 mit Vite</strong> - <code>npm install -D @pinflow/react</code></summary>

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';

export default defineConfig({
  plugins: [react(), pinflow()],
});
```

</details>

<details>
<summary><strong>Vue 3 mit Vite</strong> - <code>npm install -D @pinflow/vue</code></summary>

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pinflow } from '@pinflow/vue/vite';

export default defineConfig({
  plugins: [vue(), pinflow()],
});
```

</details>

<details>
<summary><strong>Framework-unabhängig</strong> - <code>npm install -D @pinflow/transform</code></summary>

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { pinflow } from '@pinflow/transform/plugins/vite';

export default defineConfig({
  plugins: [pinflow()],
});
```

Diese Variante liefert DOM-zu-Source-Mapping, aber keine tiefen Framework-Props
oder State-Daten.

</details>

### Monorepos

```bash
npx pinflow init --app-root apps/web
```

Das erzeugt `pinflow.config.json` am Repo-Root. CLI, Relay und MCP lösen den
App-Pfad anschließend automatisch auf.

### Agent-Seite

#### Claude Code

```shell
claude plugin marketplace add Dom-303/pinflow
claude plugin install pinflow@pinflow
```

#### Codex

Codex Support liegt im Repo über `.codex-plugin/plugin.json` und
[AGENTS.md](./AGENTS.md).

#### Jeder MCP-Client

```json
{
  "mcpServers": {
    "pinflow": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@pinflow/mcp"]
    }
  }
}
```

## Herkunft und Einordnung

PinFlow ist aus der Idee entstanden, Frontend-Arbeit für Agenten sichtbarer und
präziser zu machen. Domscribe, das ursprüngliche DOM-Skript, war dabei die
technische Grundlage: stark als Konzept und Experiment, aber noch nicht als
rundes, friend-ready Repository. PinFlow führt diese Richtung weiter und
verbindet sie mit einer source-genauen Runtime-Grundlage.

| Bereich       | Domscribe / Grundlage              | Source-Mapping-Grundlage         | PinFlow heute                       |
| ------------- | ---------------------------------- | -------------------------------- | ----------------------------------- |
| Ziel          | Agenten näher an UI-Arbeit bringen | DOM-Elemente auf Source abbilden | Voller UI-zu-Agent Workflow         |
| Oberfläche    | Konzeptuell, noch roh              | Technische Primitive             | Overlay, Picker, Queue, Settings    |
| Agenten       | Gedacht als Workflow               | MCP-nahe Bausteine               | Codex/Claude-ready MCP Flow         |
| Repo-Eindruck | Noch nicht fertig zum Teilen       | Technisch erklärbar              | Deutsche README, Visuals, Setup     |
| Fokus         | Idee und Richtung                  | Präzision der Zuordnung          | Produktisierte Entwickler-Erfahrung |

## Vergleich

Legende: ✅ klar vorhanden · ◐ teilweise/anderer Fokus · ✕ nicht erkennbar

| Feature          | PinFlow | [Domscribe](https://github.com/patchorbit/domscribe) | [stagewise](https://github.com/stagewise-io/stagewise) | [DevInsp.](https://sveltethemes.dev/mcpc-tech/dev-inspector-mcp) | [React Grab](https://github.com/aidenybai/react-grab) | [Frontman](https://frontman.sh/vs/cursor) |
| ---------------- | :-----: | :--------------------------------------------------: | :----------------------------------------------------: | :--------------------------------------------------------------: | :---------------------------------------------------: | :---------------------------------------: |
| Build-time IDs   |   ✅    |                          ✅                          |                           ✕                            |                                ◐                                 |                           ✕                           |                     ✕                     |
| DOM → Source     |   ✅    |                          ✅                          |                           ◐                            |                                ✅                                |                           ◐                           |                    ✅                     |
| Code → Live-UI   |   ✅    |                          ✅                          |                           ✕                            |                                ✅                                |                           ✕                           |                    ✅                     |
| Props/State/DOM  |   ✅    |                          ✅                          |                           ◐                            |                                ✅                                |                           ◐                           |                    ✅                     |
| MCP Tools        |   ✅    |                          ✅                          |                           ◐                            |                                ✅                                |                           ✕                           |                     ◐                     |
| Agent-agnostisch |   ✅    |                          ✅                          |                           ✕                            |                                ✅                                |                           ◐                           |                     ◐                     |
| Multi-Framework  |   ✅    |                          ✅                          |                           ✅                           |                                ✅                                |                           ✕                           |                     ◐                     |
| Multi-Bundler    |   ✅    |                          ✅                          |                           ◐                            |                                ✅                                |                           ✕                           |                     ◐                     |
| Picker-Modi      |   ✅    |                          ◐                           |                           ◐                            |                                ◐                                 |                           ◐                           |                     ◐                     |
| Dispatch-Regeln  |   ✅    |                          ✕                           |                           ✕                            |                                ◐                                 |                           ✕                           |                     ✕                     |
| Session Settings |   ✅    |                          ✕                           |                           ✕                            |                                ✕                                 |                           ✕                           |                     ✕                     |
| Lokale Queue     |   ✅    |                          ✅                          |                           ✕                            |                                ◐                                 |                           ✕                           |                     ✕                     |
| Lizenz           |   MIT   |                         MIT                          |                          AGPL                          |                               MIT                                |                          MIT                          |                     ◐                     |

PinFlows Stärke ist die Kombination: stabile Source-Zuordnung, Live-Kontext,
visuelles Markieren, lokale Queue und MCP-Werkzeuge in einem zusammenhängenden
Workflow.

Quellen und Einordnung:

- [Domscribe](https://github.com/patchorbit/domscribe) ist die ursprüngliche
  Grundlage: Build-time IDs, DOM→Source Manifest, Code→Live DOM Query,
  Runtime-Kontext, MCP Tools sowie React/Vue/Next/Nuxt, Vite/Webpack/Turbopack.
- [stagewise](https://stagewise.io/docs) positioniert sich als Browser-Agent
  für laufende Web-Apps mit DOM-Kontext, kompatiblen Frameworks und eigenem
  Agentenflow; das GitHub-Repo nennt AGPL-3.0.
- [DevInspector MCP](https://sveltethemes.dev/mcpc-tech/dev-inspector-mcp)
  beschreibt MCP/ACP-Flows mit Source Location, DOM, Styles, Network, Console,
  Screenshots und Framework-Support für React, Vue, Svelte, SolidJS, Preact und
  Next.js.
- [React Grab](https://github.com/aidenybai/react-grab) fokussiert React:
  Element auswählen, Kontext kopieren, darunter HTML, React-Komponente,
  File-Source und Hierarchie.
- [Frontman](https://frontman.sh/vs/cursor) läuft browserbasiert über
  Framework-Plugins, nutzt einen browserseitigen MCP-Server für DOM, Screenshots
  und computed CSS und editiert Source-Dateien mit Hot Reload.

### PinFlow vs. Doom-Script / Domscribe

| Bereich                   | PinFlow heute                                     | [Doom-Script / Domscribe](https://github.com/patchorbit/domscribe) |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Rolle                     | Produktisierte Weiterentwicklung für Agent-Flows  | Technisch starke Grundlage und ursprüngliches DOM-Skript           |
| Sprache & Repo-Eindruck   | Deutsche README, eigene PinFlow-Visuals, CTA      | Englische technische README mit Demo und API-Fokus                 |
| Picker                    | Element, Region und Multi-Select                  | Element-Picker für UI→Code Annotationen                            |
| Dispatch                  | Auto, Codex, Claude oder Queue-only               | Agent verarbeitet Annotationen über MCP                            |
| Dispatch-Modus            | Manual, Immediate oder Threshold                  | Claim/Process/Respond Lifecycle                                    |
| Fortsetzung               | Manual, Confirm oder Automatic                    | Agent-Loop über Annotation Tools                                   |
| Einstellungen             | Projektdefaults plus Session-Overrides im Overlay | Setup- und Tooling-Konfiguration                                   |
| Queue-Oberfläche          | Batch-/Run-Status im Overlay sichtbar             | Annotation Lifecycle und WebSocket Feedback                        |
| Lokales Setup-Verständnis | IDE, Repo, Dev Server, Browser, Relay und Agent   | App-side plus Agent-side Setup                                     |
| Technische Basis          | Bewahrt Source Mapping, Runtime Capture und MCP   | Build-time IDs, JSONL Manifest, Runtime Context und MCP Tools      |

Kurz gesagt: Domscribe ist die profunde Grundlage. PinFlow übernimmt diese
starke technische Basis und legt darüber eine stärker geführte Produkt-,
Settings- und Dispatch-Erfahrung für Codex-, Claude- und MCP-Workflows.

## MCP Tools

| Tool                              | Zweck                                                       |
| --------------------------------- | ----------------------------------------------------------- |
| `pinflow.query.bySource`          | Source-Datei und Zeile im Live-Browser abfragen             |
| `pinflow.manifest.query`          | Manifest nach Datei, Komponente oder Element-ID durchsuchen |
| `pinflow.manifest.stats`          | Manifest-Statistiken abrufen                                |
| `pinflow.resolve`                 | `data-ds` ID zu Source-Position auflösen                    |
| `pinflow.resolve.batch`           | Mehrere IDs auf einmal auflösen                             |
| `pinflow.annotation.process`      | Nächste Queue-Aufgabe claimen                               |
| `pinflow.annotation.respond`      | Agent-Antwort speichern und Aufgabe abschließen             |
| `pinflow.annotation.updateStatus` | Status manuell ändern                                       |
| `pinflow.annotation.get`          | Annotation per ID laden                                     |
| `pinflow.annotation.list`         | Annotationen filtern und listen                             |
| `pinflow.annotation.search`       | Volltextsuche über Annotationen                             |
| `pinflow.status`                  | Relay-, Manifest- und Queue-Status abrufen                  |

Details stehen im [`@pinflow/mcp` README](./packages/pinflow-mcp/README.md).

## Annotation Lifecycle

| Von          | Nach         | Auslöser                                           |
| ------------ | ------------ | -------------------------------------------------- |
| `queued`     | `processing` | Agent claimt die nächste Aufgabe per MCP           |
| `processing` | `processed`  | Agent speichert Antwort und schließt die Aufgabe   |
| `processing` | `failed`     | Agent-Fehler, Abbruch oder Timeout                 |
| `processed`  | `archived`   | Entwickler räumt erledigte Aufgaben im Overlay auf |

Der praktische Ablauf: Du markierst ein Element im Browser, PinFlow speichert
die Aufgabe lokal in `.pinflow/annotations`, der Agent claimt sie atomar,
ändert die passende Datei und schreibt seine Antwort zurück. Das Overlay erhält
Statuswechsel über WebSocket.

## Packages

| Package              | Inhalt                                           |
| -------------------- | ------------------------------------------------ |
| `@pinflow/core`      | Schemas, Fehlerformat, IDs, PII Redaction        |
| `@pinflow/manifest`  | JSONL Manifest, IDStabilizer, BatchWriter        |
| `@pinflow/relay`     | Fastify HTTP/WS Server, MCP stdio Adapter        |
| `@pinflow/transform` | AST Injection, Vite/Webpack/Turbopack Plugins    |
| `@pinflow/runtime`   | ElementTracker, ContextCapturer, BridgeDispatch  |
| `@pinflow/overlay`   | Lit Web Components, Picker, Annotation UI        |
| `@pinflow/react`     | React Fiber Adapter, Vite/Webpack Plugins        |
| `@pinflow/vue`       | Vue VNode Adapter, Vite/Webpack Plugins          |
| `@pinflow/next`      | `withPinFlow()` für Next.js                      |
| `@pinflow/nuxt`      | Nuxt Modul mit Runtime Plugin                    |
| `pinflow`            | CLI für `init`, `serve`, `status`, `stop`, `mcp` |
| `@pinflow/mcp`       | Standalone MCP Server                            |

## Lokale Prüfung

```bash
pnpm run pinflow:preview:vite-react
```

Für den vollständigen Repo-Check:

```bash
nx run-many -t=lint,test,build --exclude pinflow-test-fixtures
```

## Contributing

```bash
pnpm install
nx run-many -t build test lint typecheck
```

Konventionen liegen in `.claude/rules/`. PRs sind willkommen.

---

<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="./assets/pinflow-stacked-dark.png"
    />
    <img src="./assets/pinflow-stacked-light.png" alt="PinFlow" width="360" />
  </picture>
</p>

<h2 align="center">Pin it. Flow it. Ship it.</h2>

<p align="center">
  Starte in deinem Frontend-Repo, öffne die App lokal im Browser und gib deinem
  Coding Agenten den Kontext, den er wirklich braucht.
</p>

<p align="center">
  Besonderer Dank an
  <a href="https://github.com/patchorbit/domscribe">Doom-Script / Domscribe</a>:
  eine außergewöhnlich starke Grundlage, auf der PinFlow weiterbauen konnte.
</p>

<p align="center">
  <code>npx pinflow init</code>
</p>

## License

[MIT](./LICENSE)
