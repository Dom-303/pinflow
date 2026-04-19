# PinFlow Overlay Paper Glow Design

## Goal

Define the visual direction for the next PinFlow overlay refresh before implementation begins.

The chosen direction is:

- `Paper Glow` as the primary visual system
- approximately `70% Notion / 30% Loop`
- bright and friendly, but not flat white
- warm paper-like surfaces with soft highlights
- calm enough for daily work, with a light modern glow

This spec only covers the visible overlay experience. It does not rename the internal `domscribe` technical foundation, package names, CLI commands, or artifact paths.

## Why This Direction

The current overlay already works functionally, but it still feels closer to a dark developer tool than to a calm working environment. The user wants PinFlow to feel:

- friendlier
- brighter
- more modern
- softer and more welcoming
- still focused and productive, not playful or noisy

The visual reference point is a mix of:

- Notion-style calm layout and restraint
- a light Microsoft Loop-style sense of atmosphere
- a premium but understated working surface

The overlay should feel like a place where someone wants to review and shape changes for hours, not just inspect technical state for a minute.

## Visual Thesis

PinFlow should look like a quiet digital paper workspace for UI change requests: soft off-white surfaces, warm light, rounded shapes, subtle depth, and only a small amount of modern glow where actions or focus deserve emphasis.

## Non-Goals

This refresh should not:

- become a colorful creative canvas
- look like a dashboard full of cards
- look like a dark devtool with light text swapped out
- depend on heavy gradients everywhere
- introduce a second product language for only one provider such as Codex or Claude
- restructure the overlay architecture yet

## Product Feeling

The target feeling is:

- calm
- helpful
- editorial
- human
- polished

The target feeling is not:

- flashy
- highly technical
- enterprise-cold
- toy-like
- experimental

## Color Direction

Base colors should stay in a warm neutral family:

- creamy off-white instead of pure white
- warm paper beige and soft ivory for surfaces
- gentle taupe and muted stone for secondary text and borders

Accent behavior:

- primary accents should be warm and quiet, closer to sand, honey, soft apricot, or muted caramel
- a very light secondary cool note is allowed for freshness, but only as a faint supporting highlight
- no strong Loop-like rainbow treatment
- no loud neon cyan as the dominant accent

Recommended palette behavior:

- 80-90% neutral warm surface language
- 10-20% accent language
- accent strongest on focused actions, selected state, and very subtle ambient glow

## Surface System

The overlay should move away from “many equal boxes” toward a softer layered workspace.

Surface hierarchy:

1. Outer shell
   A soft, warm, lightly elevated panel.
2. Working surfaces
   White-to-ivory cards or sheets with very light borders and broad shadows.
3. Focus surfaces
   Slightly brighter and more lifted than surrounding content.

Visual rules:

- use broad soft shadows instead of dark sharp shadows
- use larger radii than the current overlay
- keep borders present but faint
- allow one or two soft light blooms in the background, never everywhere

## Typography

Typography should feel closer to a writing/productivity tool than a browser inspector.

Rules:

- product name remains visible but not oversized
- labels should be quiet, small, and highly scannable
- the input area should read as the primary working action
- annotation text should feel comfortable to read, not compressed and tool-like
- status text should stay secondary and visually light

## Layout Priorities

The overlay should visually communicate this order:

1. what is currently selected
2. what change should be described or submitted
3. what has already been requested
4. background state such as connection and metadata

That means:

- the input area becomes the visual anchor
- selected element context remains clear but calmer
- annotation history should be lighter and easier on the eye
- the connection indicator should become quieter and less visually dominant

## Component Direction

### Header

The header should feel minimal and editorial.

- `PinFlow` stays visible
- close action remains available but quiet
- no heavy chrome
- no harsh contrast banding

### Annotation Input

This is the heart of the overlay and should feel the most refined.

- soft paper-like input shell
- larger friendlier radius
- warm focus glow instead of hard technical focus ring
- submit button can carry the clearest accent treatment
- capture action should feel secondary but elegant

### Selected Element Preview

This should read like context, not warning or debug state.

- remove any overly technical urgency
- use a light highlighted sheet treatment
- keep structure clear, but soften contrast and edge treatment

### Annotation List

The list should feel quieter and more orderly.

- soften accordion group blocks
- reduce the sense of hard compartmentalization
- make spacing easier to scan
- keep status colors but mute them slightly

### Annotation Card

Cards should feel like notes in a workspace.

- slightly softer padding and corners
- calmer action bar
- less “tiny tool buttons” energy
- assistant response should feel integrated rather than bolted on

## Motion and Interaction

Motion should be subtle and atmospheric.

Allowed:

- gentle hover brightening
- soft focus transitions
- delicate lift on active surfaces
- restrained glow on selected/focused actions

Avoid:

- springy playful motion
- strong color pulses
- dramatic blur transitions

## Logo Fit

The future PinFlow logo should match this interface language:

- modern
- simple
- calm
- precise
- slightly warm

It should feel more like a productivity/design tool than an AI mascot or chat brand.

## Implementation Scope For The Next UI Pass

The next implementation pass should cover:

- theme token refresh toward warm light surfaces
- sidebar shell refresh
- header polish
- annotation input redesign
- selected element preview softening
- annotation list/card visual softening
- quieter status presentation

It should not yet cover:

- queue architecture changes
- new product panes
- major workflow restructuring
- internal namespace rename

## Exit Criteria

This direction is successful when:

- the overlay clearly feels like PinFlow rather than upstream Domscribe
- the workspace feels bright and welcoming without becoming washed out
- the UI feels calmer and more premium than the current overlay
- the input area becomes the obvious primary working surface
- the styling reads closer to a modern productivity workspace than a browser inspector
