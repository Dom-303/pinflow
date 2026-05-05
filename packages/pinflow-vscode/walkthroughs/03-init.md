# Initialize PinFlow in your folder

If your folder doesn't yet have a `.pinflow/` directory, you need to
run `pinflow init` once to scaffold it.

**To initialize:**
1. In the **PinFlow sidebar**, look at the **Status** section.
2. If PinFlow shows "this workspace is not configured" with a
   **Setup PinFlow** rocket button, click it.
3. A terminal opens running `pinflow init`. Walk through the prompts.

You can also run **`PinFlow: Run Init`** from the Command Palette.

**What `pinflow init` does:**
- Creates `.pinflow/` with config defaults
- Sets up the relay manifest
- Configures your default coding agent (Codex by default — you can
  change this in Settings under `pinflow.externalHandoff.defaultProvider`)
