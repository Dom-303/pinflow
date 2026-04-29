# PinFlow 60-Second Demo Definition

Stand: 2026-04-29

## Kurzfazit

Die 60-Sekunden-Demo soll nicht zeigen, dass PinFlow "auch eine UI" hat. Sie
soll den Kernbeweis liefern:

> PinFlow kann von einem sichtbaren UI-Element zu exaktem Source- und
> Runtime-Kontext springen, diesen Kontext an einen Agenten geben und nach der
> Aenderung dieselbe live UI-Stelle wieder pruefen.

Die Demo bleibt absichtlich klein. Ein klarer Golden Path ist wichtiger als
viele Frameworks, viele Agenten oder ein breites Feature-Feuerwerk.

## Demo-Ziel

Eine Person soll in ungefaehr einer Minute verstehen:

- welches UI-Element gemeint ist
- welche Source-Datei und Komponente dahinterliegen
- welche DOM-, Props- und State-Daten PinFlow live liefern kann
- dass ein Agent vor dem Editieren denselben Kontext abfragen kann
- dass PinFlow nach dem Edit wieder dieselbe live Stelle pruefen kann

## Primaerer Demo-Stack

Primaer:

- React
- Vite
- TypeScript
- Fixture: `vite-v5-react-18-ts`

Warum nicht sofort React/Next als erstes Demo-Fixture:

- Der vorhandene Preview-Pfad ist bereits fuer Vite React gut vorbereitet.
- Der Demo-Beweis ist source-exakte React-Runtime-Kontextuebergabe, nicht
  Framework-Marketing.
- React/Next bleibt der strategische Golden Path, aber die erste
  60-Sekunden-Demo darf auf dem stabilsten vorhandenen lokalen Fixture starten.

Spaeter kann derselbe Ablauf auf ein Next-Fixture uebertragen werden.

## Demo-Element

Das Demo-Element sollte ein sichtbarer, stabiler Bestandteil des React-Fixtures
sein:

- klar anklickbar
- mit `data-ds` im Manifest vorhanden
- in einer echten React-Komponente gerendert
- mit mindestens einem sichtbaren Textwert
- mit einfachen Props oder ableitbarem State
- ohne Abhaengigkeit von Netzwerkdaten

Bevorzugt ist ein kleines Demo-Panel oder Button im bestehenden
`vite-v5-react-18-ts` Fixture. Wenn kein vorhandenes Element alle Kriterien
erfuellt, wird in Paket F ein minimales Golden-Path-Element in das Fixture
eingebaut. Das waere Fixture-Code, aber keine sichtbare PinFlow-Overlay-Aenderung.

## Ablauf

### 1. Preview starten

Start:

```bash
corepack pnpm run pinflow:preview:vite-react
```

Erwartung:

- Fixture startet mit aktueller lokaler PinFlow-Version.
- Relay laeuft.
- Browser kann sich mit dem Relay verbinden.
- `pinflow doctor` findet App Root, Manifest, Relay und Browser-Verbindung.

### 2. Sichtbares Element markieren

Der Nutzer klickt ein sichtbares Element im Preview-Fixture an und erstellt
eine Annotation.

Erwartung:

- PinFlow erkennt das Element.
- PinFlow kann eine Source-Location zuordnen.
- Die Annotation bekommt lokale, lesbare Artefakte.

### 3. Source- und Runtime-Kontext zeigen

PinFlow oder der Agent fragt den Kontext fuer die erkannte Source-Location ab.

MCP-Beispiel:

```json
{
  "file": "src/App.tsx",
  "line": 270,
  "includeRuntime": true
}
```

Erwartung:

- `found: true`
- `match.confidence` ist hoch genug fuer den Golden Path
- `browserConnected: true`
- `rendered: true`
- `runtime.contextCaptured: true`
- DOM-Snapshot ist vorhanden
- Komponentenname ist vorhanden
- Props/State sind vorhanden oder nachvollziehbar leer
- sensible Werte sind redacted

### 4. Agent bearbeitet die richtige Datei

Der Agent nutzt den PinFlow-Kontext, bevor er editiert. Die Demo-Aenderung soll
klein sein, zum Beispiel:

- Button-Text aendern
- Label anpassen
- sichtbaren Statuswert aendern

Erwartung:

- Der Edit passiert in der von PinFlow genannten Datei.
- Keine Suche nach "wahrscheinlich richtiger" Datei ist noetig.
- Der Agent kann in seiner Antwort nennen, welche Source-Location verwendet
  wurde.

### 5. HMR aktualisiert die Preview

Nach dem Edit aktualisiert Vite per HMR.

Erwartung:

- Der Browser bleibt verbunden.
- Die Seite muss nicht komplett neu eingerichtet werden.
- Manifest und Source-Mapping bleiben gueltig oder melden klar, wenn sie stale
  sind.

### 6. PinFlow prueft dieselbe Stelle erneut

Der Agent oder Nutzer fragt erneut per `pinflow.query.bySource` oder
`pinflow.annotation.verify`.

Erwartung:

- PinFlow findet dieselbe live UI-Stelle wieder.
- Die neue DOM-/Text-Aussage ist sichtbar.
- Die Verifikation ist `verified`, `changed`, oder bewusst `uncertain` mit
  lesbarem Grund.
- Wenn etwas nicht klappt, nennt PinFlow den konkreten Grund:
  `browser_not_connected`, `manifest_stale`, `source_line_not_found`,
  `element_not_rendered`, `runtime_timeout`, oder Session-Ambiguitaet.

## Erfolgsdefinition

Die Demo gilt als erfolgreich, wenn sie diese Signale in einem Durchlauf zeigt:

- Preview laeuft mit aktueller PinFlow-Version.
- Ein sichtbares Element fuehrt zu einer konkreten Source-Datei und Zeile.
- Der Source-to-live Query liefert Runtime-Kontext aus dem Browser.
- Eine Annotation wird lokal angelegt und kann vom Agenten verarbeitet werden.
- Der Agent editiert die PinFlow-genannte Datei.
- Nach HMR kann PinFlow dieselbe Stelle erneut abfragen.
- Das Ergebnis ist nicht still geraten, sondern nachvollziehbar.

## Was die Demo bewusst nicht zeigt

- keine breite Framework-Paritaet
- keine Multi-App-Konfiguration
- keine grosse Overlay-Neugestaltung
- keine Public Benchmark Story
- kein eigener Browser
- kein Chat-UI-Ersatz
- kein automatisches "Agent macht alles allein" Versprechen

## Paket-F-Automatisierung

Der Ablauf ist jetzt als wiederholbarer Check umgesetzt.

Automatisierung:

1. Preview-Fixture starten.
2. Browser oeffnen.
3. Golden-Path-Element lokalisieren.
4. Source-Location aus Manifest oder Overlay-Kontext bestimmen.
5. `pinflow.query.bySource` gegen diese Source-Location ausfuehren.
6. Kleine Datei-Aenderung anwenden.
7. HMR abwarten.
8. Erneuten Source Query ausfuehren.
9. Ergebnis gegen klare Erwartungen pruefen.

Der Test liegt in
`packages/pinflow-test-fixtures/e2e/sixty-second-demo.spec.ts` und ist als
Nx-Target `demo-e2e` verknuepft:

```bash
corepack pnpm nx demo-e2e pinflow-test-fixtures
```

Das Fixture enthaelt dafuer ein eigenes minimales Golden-Path-Demo-Element:
ein Panel, ein Button, ein sichtbarer Textwert und ein einfacher State-Wert.
Das ist Fixture-Code, keine PinFlow-Overlay-Aenderung.
