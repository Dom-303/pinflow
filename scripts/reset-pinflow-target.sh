#!/usr/bin/env bash
# Reset a target project so PinFlow init can be tested from scratch.
#
# Removes the things `pinflow init` (CLI) and the C.1.12 auto-installer (VSIX)
# create or modify in a host project — without restoring backups, so a re-init
# always recreates everything.
#
# Usage:
#   scripts/reset-pinflow-target.sh <target-project-root> [--dry-run] [--yes]
#
# Default target if no arg given: ../eventbear-web (relative to this repo).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET=""
DRY_RUN=0
ASSUME_YES=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y)  ASSUME_YES=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    -*)
      echo "Unknown flag: $arg" >&2
      exit 2
      ;;
    *)
      if [[ -z "$TARGET" ]]; then TARGET="$arg"
      else echo "Too many positional args." >&2; exit 2
      fi
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  TARGET="$REPO_ROOT/../eventbear-web"
fi
TARGET="$(cd "$TARGET" 2>/dev/null && pwd || true)"

if [[ -z "$TARGET" || ! -d "$TARGET" ]]; then
  echo "Target directory does not exist." >&2
  exit 1
fi

echo "Reset target: $TARGET"
[[ $DRY_RUN -eq 1 ]] && echo "(dry-run — no changes will be written)"

if [[ $ASSUME_YES -ne 1 && $DRY_RUN -ne 1 ]]; then
  read -r -p "Wipe PinFlow setup from this directory? [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Aborted."; exit 0; }
fi

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "  would: $*"
  else
    eval "$@"
  fi
}

# 1. Best-effort: kill running relay so .pinflow/ deletion is clean.
LOCK="$TARGET/.pinflow/relay.lock"
if [[ -f "$LOCK" ]]; then
  PID="$(node -e '
    try {
      const j = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      if (typeof j.pid === "number") process.stdout.write(String(j.pid));
    } catch {}
  ' "$LOCK" || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "- killing running relay (pid $PID)"
    run "kill $PID 2>/dev/null || true"
    sleep 0.3
  fi
fi

# 2. Remove .pinflow/ entirely.
if [[ -d "$TARGET/.pinflow" ]]; then
  echo "- removing $TARGET/.pinflow"
  run "rm -rf '$TARGET/.pinflow'"
fi

# 3. Strip @pinflow/* and pinflow from every package.json (excluding node_modules).
mapfile -t PKGS < <(find "$TARGET" -name package.json -not -path "*/node_modules/*" -not -path "*/.git/*")
for pkg in "${PKGS[@]}"; do
  CHANGED="$(node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const dryRun = process.argv[2] === "1";
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    let changed = false;
    for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      if (!j[field]) continue;
      for (const k of Object.keys(j[field])) {
        if (k === "pinflow" || k.startsWith("@pinflow/")) {
          delete j[field][k];
          changed = true;
        }
      }
      if (Object.keys(j[field]).length === 0) delete j[field];
    }
    if (changed && !dryRun) {
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
    }
    process.stdout.write(changed ? "1" : "0");
  ' "$pkg" "$DRY_RUN")"
  if [[ "$CHANGED" == "1" ]]; then
    echo "- cleaned $pkg"
  fi
done

# 4. Remove pinflow imports + plugin calls from vite.configs (depth-limited).
mapfile -t CONFIGS < <(find "$TARGET" -maxdepth 5 \
  \( -name "vite.config.ts" -o -name "vite.config.js" -o -name "vite.config.mjs" -o -name "vite.config.cjs" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*")
for cfg in "${CONFIGS[@]}"; do
  HAS_PINFLOW="$(grep -E "^import .* from ['\"]@pinflow/|pinflow\(\)" "$cfg" || true)"
  if [[ -n "$HAS_PINFLOW" ]]; then
    echo "- patching $cfg"
    if [[ $DRY_RUN -eq 0 ]]; then
      sed -i.pinflowbak \
        -e "/^import .* from ['\"]@pinflow\//d" \
        -e "/^[[:space:]]*pinflow()[[:space:]]*,\?[[:space:]]*$/d" \
        "$cfg"
      rm -f "$cfg.pinflowbak"
    fi
  fi
done

echo ""
echo "Done."
echo ""
echo "Next step: drop @pinflow/* from node_modules with your package manager:"
echo "  cd $TARGET && pnpm install     # or npm install / yarn"
echo ""
echo "Then install the new VSIX, open the workspace, and run 'PinFlow: Run Init'."
