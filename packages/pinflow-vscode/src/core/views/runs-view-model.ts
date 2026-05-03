import { buildFollowTimelineItems } from '../follow-timeline.js';
import type { PinFlowRunEvidence } from '../run-evidence.js';
import { groupRunsByDate } from './group-runs-by-date.js';

export type RunsViewNode =
  | RunsViewGroupNode
  | RunsViewRunNode
  | RunsViewEvidenceFileNode
  | RunsViewChangedFilesNode
  | RunsViewChangedFileNode
  | RunsViewTimelineMarkerNode
  | RunsViewTimelineLineNode;

export type RunsViewGroupId = 'today' | 'lastSevenDays' | 'older';

export interface RunsViewGroupNode {
  readonly kind: 'group';
  readonly id: RunsViewGroupId;
  readonly label: string;
  readonly children: readonly RunsViewRunNode[];
  readonly defaultExpanded: boolean;
}

export interface RunsViewRunNode {
  readonly kind: 'run';
  readonly run: PinFlowRunEvidence;
  readonly label: string;
  readonly description?: string;
  readonly themeIcon: string;
  readonly themeIconColor?: string;
  readonly children: readonly (
    | RunsViewEvidenceFileNode
    | RunsViewChangedFilesNode
    | RunsViewTimelineMarkerNode
  )[];
}

export type EvidenceFileLabel = 'prompt.md' | 'transcript.log' | 'diff.patch';

export interface RunsViewEvidenceFileNode {
  readonly kind: 'evidenceFile';
  readonly label: EvidenceFileLabel;
  readonly absolutePath: string;
}

export interface RunsViewChangedFilesNode {
  readonly kind: 'changedFiles';
  readonly count: number;
  readonly runSummaryPath: string;
  readonly children: readonly RunsViewChangedFileNode[];
}

export interface RunsViewChangedFileNode {
  readonly kind: 'changedFile';
  readonly relativePath: string;
  readonly runSummaryPath: string;
}

export interface RunsViewTimelineMarkerNode {
  readonly kind: 'timelineMarker';
  readonly evidence: PinFlowRunEvidence;
}

export interface RunsViewTimelineLineNode {
  readonly kind: 'timelineLine';
  readonly label: string;
}

export type TimeFormat = '24h' | '12h';

export interface BuildRunsViewTreeOptions {
  readonly todayExpandedByDefault?: boolean;
  readonly timeFormat?: TimeFormat;
}

export function buildRunsViewTree(
  runs: readonly PinFlowRunEvidence[],
  now: Date,
  options: BuildRunsViewTreeOptions = {},
): readonly RunsViewGroupNode[] {
  const todayExpandedByDefault = options.todayExpandedByDefault ?? true;
  const timeFormat = options.timeFormat ?? '24h';
  const grouped = groupRunsByDate(runs, now);
  return [
    {
      kind: 'group',
      id: 'today',
      label: 'Today',
      children: grouped.today.map((run) => buildRunNode(run, timeFormat)),
      defaultExpanded: todayExpandedByDefault,
    },
    {
      kind: 'group',
      id: 'lastSevenDays',
      label: 'Last 7 days',
      children: grouped.lastSevenDays.map((run) => buildRunNode(run, timeFormat)),
      defaultExpanded: false,
    },
    {
      kind: 'group',
      id: 'older',
      label: 'Older',
      children: grouped.older.map((run) => buildRunNode(run, timeFormat)),
      defaultExpanded: false,
    },
  ];
}

export async function expandTimelineMarker(
  marker: RunsViewTimelineMarkerNode,
): Promise<readonly RunsViewTimelineLineNode[]> {
  const items = await buildFollowTimelineItems(marker.evidence);
  // buildFollowTimelineItems prepends a sentinel "Timeline" header at index 0;
  // slice(1) strips it so the marker itself acts as the Timeline node.
  return items.slice(1).map((item) => ({ kind: 'timelineLine', label: item.label }));
}

function buildRunNode(run: PinFlowRunEvidence, timeFormat: TimeFormat): RunsViewRunNode {
  const time = new Date(run.summary.finishedAt ?? run.summary.startedAt ?? 0);
  const mm = String(time.getMinutes()).padStart(2, '0');
  const timeLabel = timeFormat === '12h' ? formatTime12h(time.getHours(), mm) : formatTime24h(time.getHours(), mm);
  const annotation = run.annotationId ?? 'unknown';
  const provider = run.summary.provider ?? 'unknown';

  const description = run.hasDiff
    ? `via ${provider} · +${run.additions} -${run.deletions}, ${formatFileCount(run.changedFiles.length)}`
    : `via ${provider}`;

  const icon = iconForStatus(run.summary.status);

  return {
    kind: 'run',
    run,
    label: `${timeLabel} · ${annotation}`,
    description,
    themeIcon: icon.icon,
    themeIconColor: icon.color,
    children: buildRunChildren(run),
  };
}

function formatTime24h(hours: number, mm: string): string {
  return `${String(hours).padStart(2, '0')}:${mm}`;
}

function formatTime12h(hours: number, mm: string): string {
  const period = hours < 12 ? 'AM' : 'PM';
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return `${h}:${mm} ${period}`;
}

function buildRunChildren(
  run: PinFlowRunEvidence,
): readonly (
  | RunsViewEvidenceFileNode
  | RunsViewChangedFilesNode
  | RunsViewTimelineMarkerNode
)[] {
  const children: (
    | RunsViewEvidenceFileNode
    | RunsViewChangedFilesNode
    | RunsViewTimelineMarkerNode
  )[] = [];

  if (run.promptPath)
    children.push({ kind: 'evidenceFile', label: 'prompt.md', absolutePath: run.promptPath });
  if (run.transcriptPath)
    children.push({ kind: 'evidenceFile', label: 'transcript.log', absolutePath: run.transcriptPath });
  if (run.diffPath)
    children.push({ kind: 'evidenceFile', label: 'diff.patch', absolutePath: run.diffPath });
  if (run.changedFiles.length > 0) {
    children.push({
      kind: 'changedFiles',
      count: run.changedFiles.length,
      runSummaryPath: run.summaryPath,
      children: run.changedFiles.map((file) => ({
        kind: 'changedFile',
        relativePath: file.path,
        runSummaryPath: run.summaryPath,
      })),
    });
  }
  if (run.transcriptPath) children.push({ kind: 'timelineMarker', evidence: run });
  return children;
}

function iconForStatus(status?: string): { icon: string; color?: string } {
  if (status === 'processing') return { icon: 'loading~spin' };
  if (status === 'failed') return { icon: 'error', color: 'charts.red' };
  if (status === 'processed') return { icon: 'check', color: 'charts.green' };
  return { icon: 'circle-outline' };
}

function formatFileCount(count: number): string {
  return count === 1 ? '1 file' : `${count} files`;
}
