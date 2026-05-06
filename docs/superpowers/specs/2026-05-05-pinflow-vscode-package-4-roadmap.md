# PinFlow VS Code Extension — Package 4 Roadmap

**Status:** Roadmap-Dokument. Living Document — nach jeder Phase aktualisiert.

**Phase-Status** (Stand 2026-05-06):
- ✅ **Phase A** — UX & Onboarding (DONE, e9a5320)
- ✅ **Phase C.1** — Multi-Folder simultaneous Tracking (DONE, 9b4e30c..50bc756)
- ✅ **Phase C.1.5** — Mixed-State Workspace Onboarding (DONE, PR #1 / merge c61eded)
- ⏳ **Phase C.1.6** — Dual-Mode Onboarding (Auto vs. Terminal) — **NEXT**
- ⏳ Phase B — Run-Visualisierung (Live-Log, Diff, Run-Detail-Drawer)
- ⏳ Phase C.2 — Run-Cost-Tracking
- ⏳ Phase C.3 — Multi-Agent-Comparison-View
- ⏳ Phase D — Filter / Polish / Pre-Marketplace
- ⏳ Phase E — Marketplace v1.0 (Release)

**Goal:** PinFlow VS Code Extension von "MVP mit Lücken" zu **production-ready v1.0 mit Marketplace-Listing**. Konsolidiert alle aufgeschobenen 3B-2/3B-3-Features, die UX-Lücken aus dem 3B-1-Smoke-Test, sowie alle ursprünglich für Package 4+ geplanten Power-Features in einen einheitlichen Plan.

**Treiber:** Power-User kann 5 Repos parallel mit PinFlow + Coding-Agent bearbeiten. Heute geht das im CLI; in der Extension nicht. Plus: Onboarding fühlt sich heute nicht "geleitet" an (3B-1-Smoke 2026-05-04 hat das deutlich gezeigt).

**UX-Leitplanke (2026-05-06 ergänzt):** Standardflows müssen ohne Terminal/CLI-Touch funktionieren. Power-User-/Dev-Modus mit Terminal bleibt explizit erhalten als Opt-in — aber NIE als Default. Marketplace-Readiness (Phase E) setzt voraus, dass Setup, Init, Run und Stop alle ohne Terminal-Aufmachung gehen.

---

## Multi-Repo-Capability — Status quo

| Schicht | Multi-Repo-fähig? | Begründung |
|---|---|---|
| **pinflow-relay** (Server, Lock-Manager, Lifecycle) | ✅ ja | Per-Workspace `.pinflow/relay.lock`, Default Port `0` (OS picked), keine Singletons in `RelayLockManager` / `RunnerControl` |
| **pinflow-core** (Manifest, Constants) | ✅ ja | Pure Funktionen + Constants, keine globale State |
| **Coding-Agent (Codex/Claude)** | ✅ ja | Subprocess pro `pinflow dev` Aufruf, parallel beliebig viele möglich |
| **pinflow-vscode Extension UI** | ❌ nein | `RunsWebviewProvider` ist Singleton mit einem `latestRunEvidence`-State; stille Auto-Priority via `getBestPinFlowWorkspaceStatus` picked genau EINEN Ordner |

**Konsequenz:** Phase A löst die Onboarding-Frustration; **Phase C ist der eigentliche Multi-Repo-Unblock** auf der Extension-Seite. Architektur dahinter ist ready, Extension muss nur State und UI vervielfachen.

---

## Phase A — UX & Onboarding (Foundation Fix)

**Bedarf:** 3B-1-Smoke hat gezeigt, dass die Extension auch nach `pinflow init` Power-User nicht abholt. Vier konkrete UX-Lücken:

### A.1 — Folder-Picker im Sidebar-Header

- Klick auf Workspace-Zeile in der Status-View → öffnet QuickPick mit allen Workspace-Foldern + Status-Indicator (configured / not-configured / running)
- Auch sichtbar als affordance bei nur 1 Ordner (sonst wirkt Auto-Priority "magisch")
- Persistiert die Auswahl in `pinflow.workspace.preferredFolder` (existiert schon, wird heute nur via Settings gesetzt)
- Acceptance: User mit 4 Repos kann via 2 Clicks den aktiven Ordner wechseln, ohne Settings.json zu öffnen

### A.2 — First-Time-Extension-Welcome

- Beim allerersten Öffnen der PinFlow-Sidebar pro VS-Code-Installation (per `globalState` getrackt, Key `pinflow.welcomeSeen`)
- Sequenz: kurzer Hero-Text + 3 CTAs ("Ordner wählen", "PinFlow installieren via `pinflow init`", "Doku öffnen")
- Visuell konsistent mit 3A's `viewsWelcome` (warm paper-glow Karte mit Gold-Akzent)
- Schließbar via "Got it"-Button → globalState-Flag, kommt nicht wieder
- Acceptance: User der die Extension zum ersten Mal öffnet (auch wenn Ordner schon `.pinflow/` hat) sieht eine kurze Begrüßung mit klaren Next-Steps

### A.3 — Status-Action-Hints

- Status-Zeilen werden klickbar mit kontextueller Action:
  - "Relay missing" → ▶-Button daneben → triggert `Start Workflow`
  - "Preview not running" → ▶-Button daneben → triggert `Start Workflow` (oder gezielt `pinflow dev` ohne Runner)
  - "Workspace [name]" → klickbar (siehe A.1, Folder-Picker)
- Nutzt 3B-1's existierenden `command`-Field auf `StatusViewItem`
- Acceptance: User mit "Relay missing"-Status sieht direkt was zu tun ist, muss nicht in Actions-Section runter

### A.4 — Auto-Browser bei `pinflow dev`

- Wenn `pinflow dev` Localhost-URL erkennt (`.pinflow/dev.lock` geschrieben), VS Code zeigt Notification: "Open localhost:5173 in browser?" mit Klick-Action `Open`
- Optional: Setting `pinflow.preview.autoOpen` (default `prompt` | `auto` | `never`)
- Falls `auto`: direkt `vscode.env.openExternal()` ohne Toast
- Acceptance: User klickt Start Workflow → Localhost öffnet sich in Sekunden im Browser, ohne dass User selbst klicken muss

**Aufwand Phase A:** 2-3 Tage focused subagent-driven dev (Spec ~1h Brainstorming, Plan ~1h, Implementation 8-12 Tasks).

---

## Phase B — Run-Visualisierung Vollständig (was 3B-2 + 3B-3 war)

**Bedarf:** 3B-1 lieferte die Karten-Hülle; Inhalt fehlt noch. Phase B macht die Karten zu echten Werkzeugen.

### B.1 — Live-Log-Stream inline (war 3B-2)

- Karte ist expandierbar; expanded zeigt den Live-Run-Log unter dem Header
- Quelle: `transcriptPath` von `PinFlowRunEvidence` (existiert bereits)
- ANSI-Color-Handling, Auto-Scroll, Buffering bei 10k+ Zeilen (virtualisiert)
- Streaming via Polling der File-Size auf der Provider-Seite, neue Bytes via `postMessage` an die Webview pushen
- "Pause"-Button für User der scrollen will ohne von Auto-Scroll überrollt zu werden
- Acceptance: User sieht den Coding-Agent-Output in Echtzeit ohne Terminal zu wechseln

### B.2 — Diff-Vorschau inline (war 3B-3)

- Klick auf Karte (oder dedicated "Diff"-Tab im Detail-Drawer aus B.3) → zeigt git-diff-style Patch
- Quelle: `diffPath` von `PinFlowRunEvidence`, bereits geparst von `parseDiff` in `run-evidence.ts`
- Side-by-Side-View OR unified (User-Setting)
- Klick auf File-Path → öffnet die Datei im Editor an der richtigen Stelle
- Acceptance: User sieht was der Agent verändert hat ohne in Terminal `git diff` zu tippen

### B.3 — Run-Detail-Drawer

- Klick auf Karte expandiert zu Vollformat-Detail-Panel (entweder inline expanding oder als modal Drawer von rechts)
- Tabs: Logs (B.1), Diff (B.2), Files-Changed-List, Metadata (annotation-id, runId, provider, timestamps)
- Acceptance: User kann tief in einen Run einsteigen ohne Tree-View-Hopping

**Aufwand Phase B:** 4-7 Tage. Grootste Knackpunkte: Streaming-Implementation (B.1) und Diff-Rendering (B.2).

---

## Phase C — Multi-Repo Power-Features (das eigentliche "Package 4")

**Bedarf:** Power-User mit 5 Repos. Heute Extension-side nicht möglich. Das ist die Architektur-schwerste Phase.

### C.1.5 — Mixed-State Workspace Onboarding ✅ DONE 2026-05-06

**Bedarf:** C.1 hat Multi-Folder simultaneous Tracking gebracht, aber mixed-state Workspaces (manche Folder konfiguriert, manche nicht) übersah. Real-world Smoke 2026-05-06 mit User-Workspace (4 Repos, 1 PinFlow) zeigte: nur 1 Akkordeon, keine Onboarding-Affordance für die anderen 3.

**Was geliefert wurde:**
- Status / Actions / Runs zeigen Akkordeons für ALLE Workspace-Folder, auch nicht-konfigurierte
- Per-Folder „Setup PinFlow"-Action (rocket icon) → öffnet Terminal am exakt richtigen Folder, ruft `pinflow init`
- `pinflow.runInit` ist folder-aware (optionales `folderPath`-Argument)
- Webview-Protocol Clean-Break: `folderStatuses` Pflichtfeld, neue `webview:run-init` Message
- `pinflow.notConfigured` true ⇔ alle Folder unconfigured

**Spec/Plan:** `2026-05-06-pinflow-vscode-package-4c15-mixed-state-onboarding-{design,implementation}.md`

### C.1.6 — Dual-Mode Onboarding (Auto vs. Terminal) ⏳ NEXT

**Bedarf:** C.1.5-Smoke 2026-05-06 hat User-Intent kristallisiert: das heutige „Setup PinFlow"-Verhalten (Terminal öffnet, User tippt durch `pinflow init`) ist Power-User-tauglich, aber nicht Marketplace-Standard. Standardnutzer erwarten „klick und es geht". Power-User wollen das Terminal sehen, durch Prompts steppen, Custom-Flags setzen.

**Was kommen soll:**

- **Setting `pinflow.onboarding.mode`**: `'auto' | 'terminal'`, default `'auto'`
- **Auto-Modus (Default)**: Klick auf Setup → Extension spawnt `pinflow init --yes --agent ${defaultProvider} --app-root ${folder}` als Background-Child-Process. Progress-Notification während Lauf, Erfolgs-Toast „PinFlow ready in $folder", automatischer Refresh-Tick → Akkordeon flippt. Kein Terminal-Panel öffnet sich.
- **Terminal-Modus (Power-User)**: heutiges Verhalten — Terminal öffnet sich mit `pinflow init`, User steppt durch.
- **CLI-Not-Found-Handling**: wenn `pinflow` Binary nicht ausführbar oder nicht im PATH, Fallback auf Toast „PinFlow CLI nicht verfügbar — installiere via [Doku] oder verwende Terminal-Modus" mit „Open Terminal Anyway"-Action.
- **Power-User-Discoverability**: zusätzlicher Command `PinFlow: Run Init in Terminal` immer in Command-Palette verfügbar (forciert Terminal-Modus, ignoriert Setting).
- **Polish-Items**: AAA-Leerzeile-Nits aus C.1.5-Task 6 fixen, executable-Bit Build-Step für `pinflow.js`, optional „Actual command not found /13"-Toast investigieren falls reproduzierbar.

**Acceptance:** Standardnutzer klickt Setup → 5-10s später ist Folder konfiguriert, kein Terminal je gesehen. Power-User aktiviert Setting `terminal` oder ruft Command-Palette → bekommt heutiges Verhalten unverändert.

**Aufwand:** ~1-1.5 Tage. Subagent-driven mit ~6 Tasks.

**Out-of-Scope für C.1.6:** Run-Workflow (`pinflow dev`) bleibt vorerst Terminal-basiert — Auto-Mode für Run-Workflow ist eigene spätere Phase, weil komplexer (langlaufender Subprocess + Output-Streaming + Stop-Affordance).

### C.1 — Multi-Folder simultaneous Tracking

- Statt einem `latestRunEvidence`-Array: `Map<workspaceFolder, latestRunEvidence>`
- Status-View: pro konfiguriertem Ordner eine eigene Sektion (Akkordeon, default expanded für aktiven Folder)
- Runs-View Webview: ebenfalls pro Folder eine Sektion ODER ein "Active Folder"-Picker (User-Decision in Spec)
- Refresh-Tick: parallel pro Folder (Promise.all)
- Settings: `pinflow.workspace.trackAllFolders` (default `true` für Power-User-Erlebnis)
- Acceptance: User mit 5 PinFlow-Repos im Workspace sieht alle 5 Status-Blöcke, alle 5 Runs-Listen, kann gleichzeitig in allen arbeiten

### C.2 — Run-Cost-Tracking

- Pro Run: Token-Verbrauch (Input + Output) + estimated Cost in $$$ (basierend auf hinterlegter Per-Provider-Rate-Tabelle)
- Aggregation: Tag / Woche / Monat — entweder als kleiner Header-Banner ("This week: $12.34") oder als eigenes Panel
- Quelle: muss von `pinflow-runner` exposed werden — Annotation-ID hat bereits Token-Info bei einigen Providern; bei anderen muss das nachgezogen werden (Provider-API-Antwort parsen)
- Settings: `pinflow.cost.providerRates` (User kann eigene Raten hinterlegen wenn API anders abrechnet)
- Acceptance: User sieht "Heute hat dieser Workflow $4.20 gekostet" — entscheidet daraufhin Pricing für eigene Kunden

### C.3 — Multi-Agent-Comparison-View

- User-Aktion: "Run with Codex AND Claude" → spawnt zwei `pinflow run`-Subprocesse parallel mit identischem Prompt
- Ergebnis: Side-by-Side-Diff-View der beiden Output-Diffs
- Optional: A/B-Score-Buttons ("welcher Output war besser?") → trainiert mit der Zeit eine Provider-Präferenz pro Workflow-Typ
- Acceptance: User mit Pro-Account beider Provider kann strategisch entscheiden welcher für welchen Task besser ist

**Aufwand Phase C:** 7-10 Tage. Architektonisch tief — `RunsWebviewProvider` muss state-mäßig multipliziert werden, `refreshAll` neu strukturiert.

---

## Phase D — Filter / Polish / Pre-Marketplace

**Bedarf:** Mit den Karten aus B und der Multi-Repo-Sicht aus C wird die Liste schnell unübersichtlich. Filter + Polish machen sie navigierbar.

### D.1 — Filter / Sort / Search für Runs

- Filter-Bar oberhalb der Runs-Liste: by Status (processing/processed/failed), by Provider, by Datum-Range, by Folder (wenn C.1 aktiv)
- Free-text-Search über annotation-id und summary.label
- Sort: newest first (default), oldest first, by Status
- State persistiert in `globalState` (User-Setting)

### D.2 — Settings-Polish + Mini-Wizard

- Aktuelle Settings sind alle hand-getippt; viele User finden sie nicht
- Neuer Command `PinFlow: Configure Extension` → öffnet ein QuickPick-Wizard durch alle relevanten Settings
- Bessere Defaults nach Smoke-Test-Feedback
- Klarere Descriptions

### D.3 — Failed-Run-Recovery

- Toast bei Fail bekommt zusätzlich "Re-run with same prompt"-Action
- Triggert `pinflow run` mit dem alten prompt.md als Input
- Acceptance: User muss nach Fail nicht selbst alles wieder eintippen

**Aufwand Phase D:** 3-4 Tage.

---

## Phase E — Marketplace v1.0 (Release)

**Bedarf:** PinFlow ist bereit für die VS-Code-Marketplace. Phase E macht das Final.

### E.1 — Marketplace-Listing-Polish

- Icon-Refresh (das aktuelle ist Platzhalter)
- README mit Animationen / GIFs der Run-Karten und Live-Logs
- Screenshots (Light + Dark Theme)
- CHANGELOG.md mit allen Versionen 0.0.1 bis 1.0.0
- Detailed Description mit "Why PinFlow vs. just terminal?"
- Marketplace-Tags / Categories optimiert

### E.2 — Optional: Telemetry (opt-in)

- Anonyme Usage-Metrics: welche Commands werden genutzt, wo brechen User ab, wie lange dauern Runs
- Strikt opt-in, datenschutz-konform (DSGVO)
- Backend: minimaler Endpoint, kein User-Tracking — nur aggregierte Counts
- Setting `pinflow.telemetry.enabled` (default `false`)
- Acceptance: kann mit klarer Conscience im Marketplace publishen

### E.3 — Optional: Team-Sharing

- Run-Evidence kann in shared Storage hochgeladen werden (Cloud-Bucket oder Git-Repo)
- Team-Mitglieder sehen Runs ihrer Kollegen
- Vermutlich zu groß für E — eher als **Package 5** ausgliedern, wenn E ohne Team-Sharing zu klein wäre

**Aufwand Phase E:** 3-5 Tage (ohne Team-Sharing).

---

## Aufwandsschätzung gesamt

| Phase | Aufwand | Cycle-Strategie |
|---|---|---|
| A | 2-3 Tage | 1 Branch / Spec / Plan / Subagent-Loop |
| B | 4-7 Tage | 2 Branches: B.1 separat, B.2+B.3 zusammen |
| C | 7-10 Tage | 2 Branches: C.1 separat (architektur-schwer), C.2+C.3 zusammen |
| D | 3-4 Tage | 1 Branch |
| E | 3-5 Tage | 1 Branch |
| **Total** | **19-29 Tage** focused work | **7 Branches** |

---

## Implementation Order Recommendation

**Vorgeschlagene Sequenz:**

1. **Phase A first** — löst die heutigen UX-Frustrationen, jeder Tag User-Feedback ohne A ist verlorener Tag
2. **Phase C second (vor B!)** — Multi-Folder-Refactor von `RunsWebviewProvider` ändert die State-Architektur fundamental. Wenn B (Live-Logs) zuerst kommt und auf Single-Folder gebaut ist, muss alles in C nochmal angefasst werden. Effizienter andersrum.
3. **Phase B third** — Live-Logs + Diff bauen jetzt direkt auf Multi-Folder-State, kein Re-work
4. **Phase D fourth** — Filter macht erst Sinn wenn viele Runs aus mehreren Folders zusammenkommen
5. **Phase E last** — Release-Cut nach allen Features

**Alternative wenn schneller User-Wert wichtiger als Architektur-Sauberkeit:**

A → B → C → D → E (klassisch). Risiko: B bei C neu anfassen.

---

## Open Brainstorming-Fragen pro Phase

Vor jeder Phase ein dediziertes `superpowers:brainstorming` mit Spec + Plan. Schon jetzt absehbare Entscheidungen:

**Phase A:**
- A.1 QuickPick-Layout: Status-Indicator als Icon, Text, Beides?
- A.2 Welcome: einmaliger Toast oder dedizierte Welcome-Seite (Webview)?
- A.4 Auto-Browser: Notification-Prompt oder direkt aufmachen?

**Phase B:**
- B.1 Streaming: Polling oder Push (Relay sendet)?
- B.3 Drawer-Position: inline expanding (in der Liste) oder modal (rechts/full-screen)?

**Phase C:**
- C.1 Sidebar-Layout bei 5 Foldern: Akkordeon (Vertikal-Stack) oder Tabs (Horizontal-Switch) oder beides?
- C.2 Cost: live während Run anzeigen oder erst nach Completion?
- C.3 Multi-Agent: parallel im selben Workspace (Conflict-Risiko bei git!) oder erst sequenziell?

**Phase D:**
- D.1 Filter-Bar: immer sichtbar oder nur on-demand (Toggle)?

**Phase E:**
- E.1 Animations: GIFs oder MP4 in README?
- E.3 Team-Sharing: Cloud-Bucket (Cost-Frage) oder Git-Repo (Push-Frage)?

---

## Was AUSSERHALB von Package 4 bleibt

- **Web-Dashboard** außerhalb der VS-Code-Extension — eigenes Produkt
- **Pricing / Subscriptions** — Business-Layer, nicht Extension
- **Mobile App / Watch-Mode** — separate Surface
- **PinFlow Cloud** als gehostete Variante — Package 5+

---

## Tracking

Wenn dieser Plan approved ist, wird er die Quelle der Wahrheit für alle nachfolgenden Brainstorming-/Spec-/Plan-Cycles. Pro Phase entsteht ein eigenes Spec-Dokument (`docs/superpowers/specs/YYYY-MM-DD-pinflow-vscode-package-4{phase}-design.md`) und Plan-Dokument (`...-implementation.md`), die diesen Roadmap referenzieren.

Status nach 3B-1 (HEAD `9add951`): 3B-1 ausgeliefert, smoke-tested, Karten-Hülle in Place. Diese Roadmap baut darauf auf, lässt aber die `runs-webview-provider`-Architektur in Phase C bewusst neu strukturieren.
