<p align="center">
  <img src="./assets/pinflow-overview.png" alt="PinFlow verbindet Browser UI, Kontextkarten und Coding Agenten" width="920" />
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/MIT-License-D99545?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-D99545?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.x" />
  <img src="https://img.shields.io/badge/Node-%3E%3D18-2B2B2B?style=flat-square&logo=node.js&logoColor=white" alt="Node.js >= 18" />
  <img src="https://img.shields.io/badge/MCP-Compatible-2B2B2B?style=flat-square" alt="MCP Compatible" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-D99545?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vue-D99545?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/Next.js-2B2B2B?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Nuxt-D99545?style=flat-square&logo=nuxt&logoColor=white" alt="Nuxt" />
  <img src="https://img.shields.io/badge/Vite-2B2B2B?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Webpack-2B2B2B?style=flat-square&logo=webpack&logoColor=white" alt="Webpack" />
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
präziser zu machen. DoomScript war dabei die frühere Arbeitsrichtung: stark als
Konzept und Experiment, aber noch nicht als rundes, friend-ready Repository.
PinFlow führt diese Richtung weiter und verbindet sie mit einer
source-genauen Runtime-Grundlage.

| Bereich       | DoomScript / frühe Idee            | Source-Mapping-Grundlage         | PinFlow heute                       |
| ------------- | ---------------------------------- | -------------------------------- | ----------------------------------- |
| Ziel          | Agenten näher an UI-Arbeit bringen | DOM-Elemente auf Source abbilden | Voller UI-zu-Agent Workflow         |
| Oberfläche    | Konzeptuell, noch roh              | Technische Primitive             | Overlay, Picker, Queue, Settings    |
| Agenten       | Gedacht als Workflow               | MCP-nahe Bausteine               | Codex/Claude-ready MCP Flow         |
| Repo-Eindruck | Noch nicht fertig zum Teilen       | Technisch erklärbar              | Deutsche README, Visuals, Setup     |
| Fokus         | Idee und Richtung                  | Präzision der Zuordnung          | Produktisierte Entwickler-Erfahrung |

## Vergleich

| Fähigkeit                  | PinFlow                | DoomScript    | Stagewise  | DevInspector MCP | React Grab | Frontman      |
| -------------------------- | ---------------------- | ------------- | ---------- | ---------------- | ---------- | ------------- |
| UI -> Code Aufgabe         | Ja                     | Idee/Prototyp | Ja         | Teilweise        | Teilweise  | Ja            |
| Code -> Live-UI Query      | Ja                     | Nein          | Nein       | Nein             | Nein       | Nein          |
| Stabile Build-Time IDs     | Ja                     | Nein          | Nein       | Teilweise        | Nein       | Nein          |
| Tiefer Props/State-Kontext | Ja                     | Nein          | Teilweise  | Teilweise        | Nein       | Teilweise     |
| MCP-first                  | Ja                     | Nein          | Nein       | Ja               | Add-on     | Intern        |
| Framework-Breite           | React, Vue, Next, Nuxt | Offen         | React      | Mehrere          | React      | Eingeschränkt |
| Lokaler Repo-Workflow      | `.pinflow/annotations` | Nein          | App-intern | Tooling          | Capture    | App-intern    |
| Lizenz                     | MIT                    | intern/früh   | AGPL       | MIT              | MIT        | gemischt      |

PinFlows Stärke ist die Kombination: stabile Source-Zuordnung, Live-Kontext,
visuelles Markieren, lokale Queue und MCP-Werkzeuge in einem zusammenhängenden
Workflow.

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

## License

[MIT](./LICENSE)
