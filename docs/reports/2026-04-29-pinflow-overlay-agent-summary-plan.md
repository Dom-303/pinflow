# PinFlow Overlay Agent Summary Plan

Stand: 2026-04-29

## Kurzfazit

Die Overlay-Agent-Zusammenfassung soll keine neue grosse PinFlow-Oberflaeche
werden. Sie soll die vorhandenen Annotation- und Workflow-Bereiche klarer
machen:

> Nutzer sollen direkt sehen, welcher Agent eine Aufgabe uebernommen hat, was
> passiert ist, warum etwas fehlgeschlagen ist und was als naechstes sinnvoll
> ist.

Dieser Plan ist fuer die spaetere Umsetzung in Paket E freigegeben. Er ist noch
keine UI-Implementierung.

## Grundsatz

Keine grosse UI-Neustrukturierung:

- kein neuer Haupt-Tab
- keine neue Sidebar
- kein Redesign
- kein Chat-UI
- kein eigener Agent-Workspace

Stattdessen werden bestehende Flaechen erweitert:

- `ds-annotation-item`: pro Annotation mehr Agent-/Fehler-/Verification-Kontext
- `ds-workflow-panel`: kleine naechste-Schritt-Zusammenfassung fuer den
  aktuellen Queue-/Batch-Zustand

## Sichtbare Aenderungen

### 1. Annotation-Karte

In der geoeffneten Annotation soll ein kompakter Statusblock erscheinen. Er
nutzt vorhandene Daten aus der Annotation:

- `metadata.status`
- `metadata.errorDetails`
- `metadata.claim`
- `dispatch.target`
- `agentResponse.message`
- `verification.status`
- `verification.reasons`

Der Block soll nur zeigen, was wirklich vorhanden ist. Er darf nichts erfinden.

### 2. Agent/Channel

Wenn `dispatch.target` vorhanden ist, zeigt die Annotation:

- Codex
- Claude
- Manual
- Other
- optional das vorhandene Label

Wenn kein Dispatch vorhanden ist, wird nichts Spekulatives angezeigt. Dann ist
die Aufgabe einfach noch nicht uebergeben.

### 3. Antwort-Auszug

Wenn `agentResponse.message` vorhanden ist, bleibt der bestehende
Agent-Antwortbereich erhalten. Er bekommt nur mehr Kontext:

- Agent/Channel oberhalb oder neben dem Label
- kurze Antwort sichtbar
- keine lange neue Chat-Ansicht

Lange Antworten bleiben gekuerzt oder im bestehenden Kartenfluss lesbar. Die
Karte soll nicht zur Konversation werden.

### 4. Fehlergrund

Wenn `metadata.errorDetails` vorhanden ist, wird ein kurzer Fehlerhinweis direkt
in der Annotation sichtbar.

Beispiel:

- `Fehler: Browser nicht verbunden`
- `Fehler: Runtime-Kontext konnte nicht erfasst werden`
- `Fehler: Agent-Antwort fehlgeschlagen`

Der genaue Text kommt aus vorhandenen Daten. Wenn kein Fehlergrund vorhanden
ist, wird kein Grund geraten.

### 5. Verification

Wenn `verification` vorhanden ist, zeigt die Annotation:

| Status      | Sichtbarer Sinn         |
| ----------- | ----------------------- |
| `verified`  | Aenderung geprueft      |
| `uncertain` | Pruefung unsicher       |
| `unable`    | Pruefung nicht moeglich |

Wenn `verification.reasons` vorhanden sind, werden sie kurz lesbar gemacht.
Maschinenlesbare Reasons bleiben die Quelle; sichtbare Texte werden nur daraus
abgeleitet.

### 6. Naechster Schritt

Die Annotation bekommt einen kleinen naechsten-Schritt-Hinweis.

Vorschlag:

| Zustand                     | Naechster Schritt                  |
| --------------------------- | ---------------------------------- |
| `queued`                    | Freigeben oder sammeln             |
| `claimed`                   | Warten, Agent hat uebernommen      |
| `processing`                | Warten, Agent arbeitet             |
| `processed` mit Antwort     | Pruefen                            |
| `processed` mit `verified`  | Archivieren oder weiterarbeiten    |
| `processed` mit `uncertain` | Erneut pruefen oder Quelle oeffnen |
| `failed`                    | Fehler ansehen oder erneut senden  |
| `archived`                  | Keine Aktion noetig                |

Der Hinweis soll kurz bleiben und keine neuen Workflows erfinden.

## Workflow-Panel

Das bestehende `ds-workflow-panel` zeigt bereits:

- Uebergabeziel
- Queue-Status
- Live-Status
- Fortsetzung
- Batch-Historie

Paket E soll nur eine kleine Zusammenfassung ergaenzen:

- aktuelle Aufmerksamkeit: Fehler, wartende Freigaben oder laufende Aufgaben
- naechster sinnvoller Schritt fuer den Nutzer
- kein detaillierter Agent-Chat

Beispiele:

- `2 Aufgaben warten auf Freigabe.`
- `1 Batch laeuft bei Codex.`
- `1 Aufgabe ist fehlgeschlagen. Fehler in der Annotation pruefen.`
- `Letzter Batch fertig. Ergebnisse pruefen.`

## Datenquellen

Keine neue Backend-Quelle fuer Paket E erforderlich.

Vorhandene Daten reichen fuer die erste Version:

- Annotation-Metadaten
- Agent Response
- Dispatch-Ziel
- Verification
- Dispatch-Batches im Overlay Store

Wenn spaeter feinere Agent-Zusammenfassungen gebraucht werden, kann das Schema
gezielt erweitert werden. Das ist nicht Teil von Paket E.

## Nicht-Ziele

- keine neuen Agent-Protokolle
- keine automatische Bewertung der Agent-Qualitaet
- keine Volltext-Historie aller Agent-Antworten
- keine neue Persistenzschicht
- keine UI-Aenderungen ausserhalb Annotation-Karte und Workflow-Panel
- keine optische Neugestaltung der bestehenden PinFlow-Oberflaeche

## Umsetzungshinweise fuer Paket E

Paket E sollte klein bleiben:

1. Hilfsfunktionen fuer sichtbare Status-/Next-Step-Texte ergaenzen.
2. Annotation-Karte um kompakten Summary-Block erweitern.
3. Workflow-Panel um eine kurze Attention-/Next-Step-Zeile erweitern.
4. Tests fuer die Textableitung schreiben.
5. Bestehende UI-Struktur und Styling-Tokens weiterverwenden.

Vor der Umsetzung muss klar bleiben:

- sichtbare Texte sind bewusst kurz
- keine neue Oberflaechenhierarchie
- keine grossen Layout-Verschiebungen
- keine erfundenen Agent-Zustaende

## Freigabestand

Der Nutzer hat diesen Ansatz am 2026-04-29 freigegeben:

- vorhandene Annotation-Karte erweitern
- vorhandenes Workflow-Panel erweitern
- keine neue grosse UI
- keine Umsetzung vor separatem Paket E
