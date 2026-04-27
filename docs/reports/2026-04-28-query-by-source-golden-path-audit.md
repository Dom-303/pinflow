# PinFlow `query.bySource` Golden Path Audit

Stand: 2026-04-28

## Kurzfazit

`pinflow.query.bySource` ist bereits als echtes Source-to-Live-UI-Werkzeug
angelegt. Es kann heute eine Source-Datei und Zeile gegen das Manifest
aufloesen und optional Live-Runtime-Kontext aus einem verbundenen Browser
abfragen.

Fuer den neuen PinFlow-Fokus reicht der aktuelle Vertrag aber noch nicht ganz.
Das Tool ist funktional, aber noch nicht agentensicher genug: Es liefert genau
einen besten Treffer, keine Kandidatenliste, keine Confidence, keine
maschinenlesbaren Failure Reasons und keine klare Session-/Route-Einordnung.

Der naechste Schritt sollte deshalb nicht ein neues Tool sein, sondern eine
Haertung des bestehenden Vertrags.

## Umsetzungsstand nach erster P0-Runde

Nach dem ersten Umsetzungsschritt am 2026-04-28 sind diese Punkte bereits in
API, MCP und Tests nachgezogen:

- Kandidatenliste fuer Source-Matches
- `match` mit Confidence, Strategy, Line-Distance und Column-Distance
- maschinenlesbare `reasons`
- `browser` mit `connected` und `clientCount`
- `manifest` mit Entry-/File-/Component-Count und `lastUpdated`
- MCP-Hint fuer mehrdeutige Source-Matches
- korrigiertes MCP-README-Beispiel fuer `sourceLocation.start`
- technische Trennung von `elementFound` und `contextCaptured` in
  Browser/Relay Runtime-Antworten
- absolute Workspace-Pfade werden im ManifestReader auf die im Manifest
  gespeicherten relativen Pfade normalisiert
- eindeutige App-Root-Suffix-Pfade werden erkannt
- mehrdeutige App-Root-/Monorepo-Pfade liefern `ambiguous_source_path` und
  `pathCandidates`, statt still einen Treffer zu raten

Weiter offen:

- Session-/Route-Modell fuer mehrere Tabs spaeter bewusst einfuehren
- Runtime-Fehler noch feiner als eigene Reason-Kategorien auswerten

## Gepruefte Stellen

- MCP Tool:
  `packages/pinflow-relay/src/mcp/tools/query-by-source.tool.ts`
- MCP Tests:
  `packages/pinflow-relay/src/mcp/tools/query-by-source.tool.spec.ts`
- HTTP Route:
  `packages/pinflow-relay/src/server/routes/v1/query-by-source.route.ts`
- HTTP Route Tests:
  `packages/pinflow-relay/src/server/routes/v1/query-by-source.route.spec.ts`
- Shared Schema:
  `packages/pinflow-relay/src/schema.ts`
- HTTP Client:
  `packages/pinflow-relay/src/client/relay-http-client.ts`
- Manifest Lookup:
  `packages/pinflow-manifest/src/reader/manifest-reader.ts`
- Runtime WS Request:
  `packages/pinflow-relay/src/server/ws-server.ts`
- Overlay WS Response:
  `packages/pinflow-overlay/src/services/relay-service.ts`
- Runtime Capture:
  `packages/pinflow-runtime/src/core/runtime-manager.ts`
  `packages/pinflow-runtime/src/core/context-capturer.ts`

## Was heute schon gut ist

### 1. Source-to-manifest lookup existiert

Die Route `POST /api/v1/manifest/resolve-by-source` nimmt `file`, `line`,
optional `column`, `tolerance` und `includeRuntime` entgegen.

Der `ManifestReader.getEntryByPosition()` sucht pro Datei nach Eintraegen und
waehlt den naechsten Treffer nach Line-Distance und Column-Distance.

### 2. Live Runtime ist bereits angebunden

Wenn `includeRuntime` aktiv ist und ein Browser per WebSocket verbunden ist,
fragt der Relay ueber `requestContext(entry.id)` beim Browser nach:

- `rendered`
- `componentProps`
- `componentState`
- `domSnapshot`

### 3. MCP-Ausgabe ist agentenlesbar

Das MCP-Tool gibt strukturierte Inhalte und JSON-Text zurueck. Es hat bereits
Hints fuer:

- kein Manifest-Treffer
- kein Browser verbunden
- Element nicht gerendert

### 4. Tests decken den Basisvertrag ab

Es gibt Tests fuer:

- exakten Source-Treffer
- Column-Tie-Breaking auf derselben Zeile
- `found:false`
- unbekannte Datei
- Tolerance-Match
- Browser nicht verbunden
- Runtime-Kontext bei verbundenem Browser
- `includeRuntime:false`
- MCP-Hints fuer wichtige Basisfaelle

### 5. Redaction ist im Runtime-Layer grundsaetzlich vorhanden

Props und State werden im Runtime Capture standardmaessig mit PII- und
Sensitive-Field-Redaction verarbeitet, solange der Nutzer `redactPII` nicht
deaktiviert.

## Kritische Luecken fuer den Golden Path

### P0: Keine Kandidaten und keine Confidence

Heute gibt `getEntryByPosition()` genau einen besten Treffer zurueck. Wenn
mehrere Elemente auf derselben Zeile oder innerhalb der Tolerance plausibel
sind, sieht der Agent nur die getroffene Entscheidung.

Risiko:

- Der Agent kann zu sicher wirken, obwohl mehrere UI-Elemente sinnvoll gepasst
  haetten.
- Bei JSX-Zeilen mit mehreren Elementen wird Ambiguitaet versteckt.

Gewuenschter Zustand:

- Response enthaelt `match.confidence`.
- Response enthaelt `candidates[]` mit Entry-ID, Source-Location,
  Line-Distance, Column-Distance und kurzer Match-Begruendung.
- Der beste Treffer bleibt vorhanden, aber Ambiguitaet wird sichtbar.

### P0: Failure Reasons sind nur freie Hints

Heute gibt es teilweise `hint` im MCP-Tool, aber kein maschinenlesbares Feld wie
`reason` oder `reasons[]` im API-Vertrag.

Risiko:

- Agents muessen Freitext interpretieren.
- Tests koennen nur schwer absichern, ob der richtige Fehlergrund geliefert
  wird.
- UI, CLI und MCP koennen Fehler nicht konsistent darstellen.

Gewuenschter Zustand:

- API und MCP liefern stabile Reasons, zum Beispiel:
  - `manifest_entry_not_found`
  - `browser_not_connected`
  - `runtime_not_requested`
  - `runtime_timeout`
  - `element_not_rendered`
  - `capture_failed`
  - `ambiguous_source_match`
  - `manifest_empty`
  - `file_not_in_manifest`

### P0: Runtime-Fehler werden zu stark vereinheitlicht

Wenn der Browser verbunden ist, aber `requestContext()` `null` liefert, bleibt
die Runtime leer. Fuer den Agenten ist nicht unterscheidbar, ob:

- der Browser nicht geantwortet hat
- die Anfrage getimeoutet ist
- das Element nicht in der aktuellen Route existiert
- RuntimeManager nicht bereit war
- Capture fehlgeschlagen ist

Risiko:

- Der Agent bekommt keine gute naechste Aktion.
- "Route nicht offen" und "Capture defekt" sehen gleich aus.

Gewuenschter Zustand:

- WS Response und Query Response bewahren `success`, `rendered`, `error` und
  einen stabilen `runtimeReason`.
- Timeout wird explizit als Timeout erkennbar.

### P1: Manifest-Staleness ist nicht im Query-Vertrag sichtbar

Der ManifestReader filtert alte Eintraege ueber `fileHash` bereits beim Laden.
Die Query sagt aber nicht, ob das Manifest aktuell, leer, neu geladen oder
potenziell stale ist.

Risiko:

- Bei HMR/Fast Refresh oder Source-Moves kann der Agent nicht erkennen, ob er
  gerade mit altem Mapping arbeitet.

Gewuenschter Zustand:

- Response enthaelt `manifest`-Metadaten wie `lastUpdated`, `entryCount` und
  optional `stale`/`freshness`.
- Bei leerem Manifest oder unbekannter Datei kommen spezifische Reasons.

### P1: Pfadnormalisierung ist fuer Agents noch fragil

Status: Absolute Pfade innerhalb des Manifest-Workspace werden inzwischen auf
relative Manifest-Pfade normalisiert. Eindeutige App-Root-Suffix-Pfade werden
genutzt. Mehrdeutige App-Root-/Monorepo-Faelle liefern `ambiguous_source_path`
und `pathCandidates`, damit Agents erneut mit einem eindeutigen Manifest-Pfad
fragen koennen.

Das Tool beschreibt `file` als "Absolute file path as stored in the manifest",
waehrend Manifest-Eintraege laut Core-Schema "File path from project root" sind.
Tests nutzen relative Pfade wie `src/components/Input.tsx`.

Risiko:

- Codex/Claude koennen absolute Repo-Pfade senden, waehrend das Manifest
  relative App-Root-Pfade erwartet.
- Monorepo/App-Root-Kontexte koennen unnötig zu `found:false` fuehren.

Gewuenschter Zustand:

- Ein klarer File-Path-Vertrag:
  - akzeptiere Manifest-Pfad direkt
  - akzeptiere absolute Repo-Pfade, wenn eindeutig normalisierbar
  - gib bei Mehrdeutigkeit Kandidaten/Repair-Hint aus

### P1: Session und Route fehlen

`requestContext()` broadcastet die Anfrage an alle verbundenen Clients und nimmt
die erste Antwort. Es gibt noch kein explizites Session-/Route-Modell.

Risiko:

- Bei mehreren Tabs oder Routen kann der erste Browser antworten, auch wenn ein
  anderer Tab fuer die Source-Stelle relevanter waere.

Gewuenschter Zustand:

- Kurzfristig: Response zeigt zumindest `browserClientCount`.
- Mittelfristig: Session-/Route-ID in Request und Response.
- Langfristig: mehrere Tabs/Routen bewusst modellieren.

### P1: `rendered:false` haengt am Context, nicht am Element

Status: Die technische Trennung von `elementFound` und `contextCaptured` ist
nachgezogen. Die darunterliegende Reason-Taxonomie kann spaeter noch weiter
verfeinert werden.

Die Overlay-Response setzt `rendered: context !== null`. Wenn das Element
existiert, aber Props/State-Capture nicht klappt, kann das wie "nicht gerendert"
wirken.

Risiko:

- Agent bekommt falsche Bedeutung: Element ist vielleicht sichtbar, aber
  Runtime Capture ist unvollstaendig.

Gewuenschter Zustand:

- `elementRendered`/`elementFound` und `contextCaptured` trennen.
- DOM Snapshot kann auch dann zurueckkommen, wenn Props/State fehlen.

### P2: Docs-Beispiel passt nicht exakt zum Schema

Das MCP-README zeigt im Beispiel `sourceLocation.line` und
`sourceLocation.column`. Das aktuelle Schema liefert aber
`sourceLocation.start.line` und `sourceLocation.start.column`.

Risiko:

- Agent-/Nutzererwartung und echter Vertrag laufen auseinander.

Gewuenschter Zustand:

- Docs-Beispiele an die echte Response anpassen oder einen bewusst
  agentenfreundlichen Flattening-Layer einfuehren.

## Empfohlene Umsetzung in kleinen Schritten

### Schritt 1: Query-Vertrag erweitern, ohne Verhalten zu brechen

Neue optionale Felder in API/MCP:

- `match`
  - `confidence`
  - `strategy`
  - `lineDistance`
  - `columnDistance`
- `candidates`
- `reasons`
- `manifest`
- `browser`

Bestehende Felder `found`, `entryId`, `sourceLocation`, `runtime` und
`browserConnected` bleiben fuer Kompatibilitaet erhalten.

### Schritt 2: ManifestReader Kandidaten liefern lassen

Neue Methode statt Ersatz:

- `getEntriesByPosition(file, line, column, tolerance)`

Sie gibt sortierte Kandidaten zurueck. `getEntryByPosition()` kann intern
weiterhin den ersten Kandidaten nehmen, damit bestehende Nutzer nicht brechen.

### Schritt 3: HTTP Route auf ehrliche Reasons erweitern

Die Route soll unterscheiden:

- keine Manifest-Datei/Manifest leer
- Datei nicht im Manifest
- Datei vorhanden, aber keine Line innerhalb Tolerance
- eindeutiger Treffer
- mehrdeutiger Treffer
- Browser nicht verbunden
- Browser verbunden, aber Runtime Timeout
- Element nicht gefunden/nicht gerendert
- Runtime Capture fehlgeschlagen

### Schritt 4: Overlay Runtime Response praezisieren

Ohne sichtbare UI-Aenderung:

- `elementFound`
- `contextCaptured`
- `error`
- optional `domSnapshot` auch ohne Props/State

Wichtig: Das ist eine technische Response-Aenderung. Sichtbare UI-Aenderungen
brauchen weiterhin vorherige Nutzerfreigabe.

### Schritt 5: MCP Tool Hints aus Reasons ableiten

Das MCP-Tool sollte Hints nicht aus groben Booleans erraten, sondern aus den
maschinenlesbaren Reasons ableiten. Dadurch werden CLI, MCP und spaetere UI
konsistent.

### Schritt 6: Docs korrigieren

Das `pinflow.query.bySource` Beispiel in `packages/pinflow-mcp/README.md`
sollte den echten Vertrag zeigen. Falls wir ein neues Flattening einfuehren,
dann bewusst und getestet.

## Minimaler Zielvertrag

Ein guter erster Zielvertrag koennte so aussehen:

```json
{
  "found": true,
  "entryId": "aB3dEf7h",
  "sourceLocation": {
    "file": "src/components/Button.tsx",
    "start": { "line": 10, "column": 4 },
    "end": { "line": 10, "column": 30 },
    "tagName": "button",
    "componentName": "Button"
  },
  "match": {
    "confidence": "high",
    "strategy": "exact_line_and_column",
    "lineDistance": 0,
    "columnDistance": 0
  },
  "candidates": [
    {
      "entryId": "aB3dEf7h",
      "confidence": "high",
      "lineDistance": 0,
      "columnDistance": 0,
      "sourceLocation": {
        "file": "src/components/Button.tsx",
        "start": { "line": 10, "column": 4 },
        "tagName": "button",
        "componentName": "Button"
      }
    }
  ],
  "runtime": {
    "rendered": true,
    "elementFound": true,
    "contextCaptured": true,
    "componentProps": { "variant": "primary" },
    "componentState": { "loading": false },
    "domSnapshot": {
      "tagName": "button",
      "attributes": { "type": "submit" },
      "innerText": "Save"
    }
  },
  "browser": {
    "connected": true,
    "clientCount": 1
  },
  "manifest": {
    "entryCount": 128,
    "lastUpdated": "2026-04-28T10:00:00.000Z"
  },
  "reasons": []
}
```

Bei Unsicherheit:

```json
{
  "found": true,
  "entryId": "aB3dEf7h",
  "match": {
    "confidence": "medium",
    "strategy": "nearest_within_tolerance",
    "lineDistance": 2
  },
  "candidates": [{ "entryId": "aB3dEf7h" }, { "entryId": "xY9zK2pQ" }],
  "reasons": ["ambiguous_source_match"]
}
```

Bei nicht gerendertem Element:

```json
{
  "found": true,
  "entryId": "aB3dEf7h",
  "runtime": {
    "rendered": false,
    "elementFound": false,
    "contextCaptured": false
  },
  "browser": {
    "connected": true,
    "clientCount": 1
  },
  "reasons": ["element_not_rendered"]
}
```

## Testplan fuer die naechste Implementierung

### ManifestReader

- gibt alle Kandidaten sortiert nach Line- und Column-Distance zurueck
- markiert exakten Treffer als hohe Confidence
- markiert Tolerance-Treffer als mittlere/niedrigere Confidence
- zeigt Ambiguitaet, wenn mehrere Kandidaten gleich gut sind
- unterscheidet "file not in manifest" von "line not matched"

### HTTP Route

- liefert `candidates`, `match`, `reasons`, `manifest`, `browser`
- bleibt kompatibel mit bestehenden Feldern
- liefert `browser.clientCount`
- unterscheidet `browser_not_connected`, `runtime_timeout`,
  `element_not_rendered`, `capture_failed`
- liefert Runtime-DOM soweit moeglich auch bei fehlendem Props/State-Kontext

### MCP Tool

- uebernimmt neue Felder strukturiert
- erzeugt Hints aus Reasons
- testet mehrere Reasons in einer Response
- testet Agent-Hinweis bei Ambiguitaet

### Docs

- MCP README Beispiel entspricht dem echten Schema
- README beschreibt `query.bySource` als Source-to-Live-UI Werkzeug mit
  ehrlicher Confidence und Failure Reasons

## Prioritaet

1. P0: Kandidaten, Confidence und maschinenlesbare Reasons.
2. P0: Runtime-Fehler genauer durchreichen.
3. P1: Pfadnormalisierung und Manifest-Metadaten.
4. P1: Browser client count, spaeter Session/Route.
5. P1: Element-Found und Context-Captured trennen.
6. P2: Docs-Beispiele nachziehen.

## Entscheidung

`pinflow.query.bySource` sollte nicht ersetzt werden. Es ist genau das richtige
Hero-Tool, aber sein Vertrag muss ehrlicher und reichhaltiger werden.

Der wichtigste Unterschied fuer PinFlow ist nicht mehr Magie, sondern bessere
Wahrheit: mehrere Kandidaten zeigen, Confidence ausdruecken, Failure Reasons
maschinenlesbar machen und Runtime-Kontext nur so sicher behaupten, wie er
wirklich vorliegt.
