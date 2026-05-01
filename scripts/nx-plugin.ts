import type { CreateNodesV2, CreateNodesResultV2 } from '@nx/devkit';
import { readFileSync } from 'node:fs';

interface ProjectJson {
  name?: string;
  projectType?: string;
}

/** Projects that are not publishable and should not get dist-related targets. */
const EXCLUDED_PROJECTS = new Set(['pinflow-test-fixtures', 'pinflow-vscode']);

export function isDistTargetExcluded(projectName?: string): boolean {
  return EXCLUDED_PROJECTS.has(projectName ?? '');
}

/**
 * Adds `sync-dist` and `clean` targets to all publishable library projects.
 * These targets call the per-project scripts in scripts/.
 */
export const createNodesV2: CreateNodesV2 = [
  'packages/*/project.json',
  async (configFiles, _options, context) => {
    const result: CreateNodesResultV2 = [];

    for (const configFile of configFiles) {
      const fullPath = `${context.workspaceRoot}/${configFile}`;
      const project: ProjectJson = JSON.parse(readFileSync(fullPath, 'utf-8'));

      if (project.projectType !== 'library') continue;
      if (isDistTargetExcluded(project.name)) continue;

      const projectRoot = configFile.replace('/project.json', '');

      result.push([
        configFile,
        {
          projects: {
            [projectRoot]: {
              targets: {
                'sync-dist': {
                  dependsOn: ['build'],
                  executor: 'nx:run-commands',
                  options: {
                    command: `node scripts/sync-dist.mjs ${project.name ?? projectRoot.split('/').pop()}`,
                  },
                  metadata: {
                    description:
                      'Sync dist package.json (version, workspace deps, exports)',
                  },
                },
                clean: {
                  executor: 'nx:run-commands',
                  options: {
                    command: `node scripts/clean.mjs ${project.name ?? projectRoot.split('/').pop()}`,
                  },
                  metadata: {
                    description: 'Remove dist output',
                  },
                },
              },
            },
          },
        },
      ]);
    }

    return result;
  },
];
