# 02 PinFlow Overlay UI

## Goal

Turn the current overlay into a visibly `PinFlow` product surface:

- German-first working interface
- cleaner terminology
- better visual hierarchy
- deliberate light/dark theming
- room for later queue and automation features

## Why Second

The overlay is the daily working surface. Once the visible brand exists, the next most valuable step is making the tool feel native to the intended workflow.

## Now

- Translate the overlay working surface to German
- Replace visible `Domscribe` branding with `PinFlow`
- Add a matching README/docs note near the top that `PinFlow` is built on top of the original `Domscribe` foundation, with an upstream link
- Replace generic `Agent` wording with a neutral but product-appropriate label, likely `Assistent` or an agent-specific label when available
- Keep the interaction model intact while refining wording, labels, and hints
- Remove visual emphasis on unsupported or secondary agent paths
- Design for both `Codex` and `Claude`, not only one provider

## Soon

- Refine overlay layout and spacing
- Improve hierarchy for:
  - selected element
  - comment input
  - task status
  - agent response
- Introduce more polished empty states and action labels
- Make the collapsed/expanded states feel more productized
- Create a calmer and more modern visual system
- Add a manual theme switcher directly in the UI
- Treat the current `Paper Glow` direction as the canonical `Light Mode`
- Design and implement a matching `Dark Mode` rather than a quick inverted palette
- Persist the user-selected theme locally so the choice survives restarts
- Support theme-aware assets, especially a light logo and a dark logo

## Later

- Rework structural layout when queue/dispatcher features need more space
- Add optional project switcher or environment switcher when the multi-project workflow matures
- Consider replacing or redesigning parts of the current sidebar interaction model
- Revisit whether theme controls should stay compact in the main sidebar or move into a richer session/settings surface

## Design Rules

- Keep the product neutral and reusable across projects
- Avoid EventBaer-specific language
- Prefer German for the working surface
- Keep developer internals and package names in English where useful
- Optimize for clarity over ornament
- Keep theme switching manual and explicit in the first version
- Do not add system-theme auto-detection until there is a real need for it
- Make both themes feel like first-class product surfaces, not one primary theme plus a fallback skin

## Structural Warning Signs

The current overlay would be considered structurally limiting only if we need to:

- add whole new panes or workflow zones
- support multi-step task orchestration directly in the sidebar
- display richer queue/dispatch/approval controls
- support strong project-level navigation inside the overlay

Until then, direct overlay adaptation is the right level of change.

## Exit Criteria

- The user-facing overlay feels like `PinFlow`, not a translated upstream demo
- Core working language is German
- The UI is clearer, calmer, and better aligned with the intended workflow
- Users can switch between persistent `Light` and `Dark` modes without losing product coherence
