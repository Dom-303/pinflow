# PinFlow Finalization Checklist

Ziel dieser Restliste ist nicht ein weiterer grosser Umbau, sondern der letzte saubere Weg zu einem wirklich stimmigen `PinFlow`-Produkt. Der technische Kern ist weitgehend da; offen sind vor allem Produktqualitaet, UI-Konsistenz, Sprache und Workflow-Reife.

## Aktueller Stand

- `Repo-/Paket-/Namespace-Umbau`: praktisch abgeschlossen
- `main` enthaelt den aktuellen PinFlow-Stand
- `Preview-/Fixture-Pipeline`: laeuft wieder
- `rechte Arbeitsleiste`: technisch wieder sichtbar und oeffnbar
- `Branding`: weitgehend auf `PinFlow`
- `Produktreife`: noch nicht fertig

## Prioritaet 1: Muss fuer 100 %

### 1. Produktflaeche von Demo-Flaeche trennen

Warum:
- Die linke Demo-Navigation und die rechte eigentliche Arbeitsflaeche sind noch nicht klar genug als zwei verschiedene Dinge lesbar.
- Das fuehrt direkt zu Verwirrung beim ersten Eindruck.

Erledigt ist es erst, wenn:
- die linke Seite klar als `Demo`/`Preview` erkennbar ist
- die rechte Seite klar als `PinFlow-Arbeitsbereich` erkennbar ist
- die Demo nicht mehr wie die Hauptanwendung wirkt

### 2. Overlay-Arbeitsbereich visuell fertigziehen

Warum:
- Der Arbeitsbereich ist wieder da, fuehlt sich aber noch nicht wie das finale Produkt an.

Erledigt ist es erst, wenn:
- `Paper Glow` in der echten Arbeitsflaeche konsequent sichtbar ist
- `Light` und `Dark` beide hochwertig wirken
- Header, Input, Workflow-Panel, Verlauf und Statusgruppen gestalterisch aus einem Guss sind
- der rechte Launcher und das geoeffnete Panel dieselbe Designsprache sprechen

### 3. Sprache und Fachbegriffe sauber kuratieren

Warum:
- Ein Teil der Begriffe ist schon deutsch, ein Teil bewusst englisch, ein Teil ist aber noch sprachlich unsauber oder inkonsistent.

Erledigt ist es erst, wenn:
- Fachbegriffe nur dann uebersetzt werden, wenn das im Entwicklerkontext wirklich sinnvoll ist
- die Demo-Navigation sprachlich konsistent ist
- die eigentliche Arbeitsflaeche vollstaendig auf gutes, natuerliches Deutsch gebracht ist
- Hilfetexte, Labels, Tooltips und Statusmeldungen denselben Ton haben

### 4. Sichtbare Markenverwendung final bereinigen

Warum:
- Einige Stellen sind schon gut, andere noch nur „ok“.

Erledigt ist es erst, wenn:
- Logos in Sidebar, Launcher, Header und Home-Flaechen sauber proportioniert sind
- keine alten oder falschen Platzhalterbilder mehr sichtbar sind
- jede sichtbare Marke eindeutig `PinFlow` ist
- die Bildsprache auf Start-/Home-Flaechen final entschieden und stimmig ist

## Prioritaet 2: Sollte direkt danach kommen

### 5. Demo-Startseite produktwuerdig machen

Warum:
- Die Home-Seite ist als Einstieg schon hilfreich, aber noch nicht wie eine finale Produktflaeche komponiert.

Erledigt ist es erst, wenn:
- Hero, Intro, Platzhalterbereiche und Erklaerungen wie ein bewusst gestalteter Startpunkt wirken
- die Seite klar erklaert, wofuer die Demo dient
- die noch fehlenden Visuals (`Demo`, `Code zu UI`, `Architektur`) sauber ersetzt oder vorbereitet sind

### 6. Workflow-/Queue-Flaechen produktreif machen

Warum:
- Das Fundament ist angelegt, aber der Arbeitsfluss ist noch nicht „fertig“.

Erledigt ist es erst, wenn:
- Kanalwahl, Versandmodus, Queue-Status und Session-/Projektdefaults klar lesbar sind
- die Bedienung nicht technisch-fragil wirkt
- die wichtigsten Workflows ohne Nachdenken erkennbar sind

### 7. Theme-System mit echten Markenassets abschliessen

Warum:
- `Light`/`Dark` existieren, aber beide brauchen noch den letzten Produktfeinschliff.

Erledigt ist es erst, wenn:
- beide Modi dieselbe visuelle Qualitaet haben
- Theme-Wechsel sofort glaubwuerdig wirkt
- Light-/Dark-Logos und Oberflaechen konsistent zusammenpassen

## Prioritaet 3: Danach

### 8. Demo-Komponenten sprachlich und visuell vereinheitlichen

Warum:
- Der Demo-Canvas hat noch einzelne alte oder nur halb angepasste Stellen.

Erledigt ist es erst, wenn:
- die wichtigsten Demokomponenten nicht mehr wie ein alter Kitchen-Sink-Teststand wirken
- sichtbare Texte, Ueberschriften und kleine UI-Elemente dieselbe Sprache sprechen

### 9. Workflow-Automation von Fundament zu echtem Produkt machen

Warum:
- Modell und UI sind angelegt, aber die eigentliche Arbeitserleichterung steckt erst in der naechsten Ausbaustufe.

Erledigt ist es erst, wenn:
- Queue-Progression, Batch-Handling und Session-Overrides im Alltag sinnvoll benutzbar sind
- `Codex` und `Claude` als echte Kanaele ueberzeugend in den Workflow passen

### 10. Finaler Repo-Cleanup

Warum:
- Wenn die Produktflaechen fertig sind, lohnt sich erst der letzte Aufraeumschritt.

Erledigt ist es erst, wenn:
- uebrige Platzhalter, Alt-Demos, nicht mehr benoetigte Referenzen und Ueberbleibsel systematisch entfernt sind
- die Repo-Struktur fuer neue Weiterentwicklung ruhig und klar bleibt

## Empfohlene Reihenfolge

1. `Produktflaeche vs. Demo` sauber trennen
2. `Overlay-Arbeitsbereich` visuell finalisieren
3. `Sprache/Fachbegriffe` kuratieren
4. `Branding/Bilder/Logos` final sauberziehen
5. `Home-/Startseite` ausbauen
6. `Workflow-/Queue-Flaechen` produktreif machen
7. `Theme-/Asset-Finish`
8. `Demo-Komponenten` vereinheitlichen
9. `Automation` weiter ausbauen
10. `Final Cleanup`

## Definition von 100 %

Wir sind bei `100 %`, wenn gleichzeitig gilt:

- `PinFlow` ist technisch und sichtbar durchgaengig die einzige Produktidentitaet
- Demo und Arbeitsbereich sind klar getrennt
- die rechte Arbeitsflaeche wirkt wie ein echtes Produkt, nicht wie ein Dev-Overlay
- Sprache, Branding, Themes und Assets sind konsistent
- der Kernworkflow fuehlt sich im Alltag stabil und klar an
- der Repo-Stand ist ruhig genug, dass neue Features wieder ohne Umbau-Altlasten weitergebaut werden koennen
