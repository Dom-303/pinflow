# 02 PinFlow Overlay UI

## Goal

Turn the current overlay into a visibly `PinFlow` product surface:

- German-first working interface
- cleaner terminology
- better visual hierarchy
- room for later queue and automation features

## Why Second

The overlay is the daily working surface. Once the visible brand exists, the next most valuable step is making the tool feel native to the intended workflow.

## Now

- Translate the overlay working surface to German
- Replace visible `Domscribe` branding with `PinFlow`
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

## Later

- Rework structural layout when queue/dispatcher features need more space
- Add optional project switcher or environment switcher when the multi-project workflow matures
- Consider replacing or redesigning parts of the current sidebar interaction model

## Design Rules

- Keep the product neutral and reusable across projects
- Avoid EventBaer-specific language
- Prefer German for the working surface
- Keep developer internals and package names in English where useful
- Optimize for clarity over ornament

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
