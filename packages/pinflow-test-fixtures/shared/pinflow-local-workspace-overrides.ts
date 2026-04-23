const OVERLAY_INIT_PATTERN =
  /import\((['"])\/@pinflow\/overlay-init\.js(?:\?[^'"]*)?\1\)/g;

const REACT_INIT_PATTERN =
  /import\((['"])\/@pinflow\/react-init\.js(?:\?[^'"]*)?\1\)/g;

export function rewritePinflowInitImports(
  source: string,
  cacheTag: string,
): string {
  return source
    .replace(
      OVERLAY_INIT_PATTERN,
      `import('/pinflow-local-overlay-init.ts?v=${cacheTag}')`,
    )
    .replace(
      REACT_INIT_PATTERN,
      `import('/pinflow-local-react-init.ts?v=${cacheTag}')`,
    );
}
