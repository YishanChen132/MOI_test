// 這個檔案負責管理場景狀態，像是時間範圍、模式切換和刷新判斷。
import {DEFAULT_DATASET_PRESET_ID} from './datasets';
import {ALL_MODE_CODES, formatModeList, type ModeCode} from './modes';
import {getInitialPlaybackRange, PLAYBACK_DOMAIN, PLAYBACK_WINDOW_MS} from './timeplayback';
import type {
  AppliedScenario,
  BenchmarkCounts,
  BenchmarkEntry,
  LayerId,
  LayerVisibility,
  ScenarioConfig,
  TimeRangeMilliseconds,
} from './types';

export const DEFAULT_TIME_RANGE: TimeRangeMilliseconds = getInitialPlaybackRange();

export const DEFAULT_LAYERS: LayerVisibility = {
  trips: false,
  arc: true,
  heatmap: false,
};

export function createInitialScenario(): ScenarioConfig {
  return {
    datasetId: DEFAULT_DATASET_PRESET_ID,
    layers: {...DEFAULT_LAYERS},
    modes: [...ALL_MODE_CODES],
    timeRange: [...DEFAULT_TIME_RANGE],
  };
}

export function createAppliedScenario(
  draft: ScenarioConfig,
  requestId: number,
  appliedAt = Date.now(),
): AppliedScenario {
  return {
    ...draft,
    layers: {...DEFAULT_LAYERS},
    modes: [...draft.modes],
    timeRange: clampTimeRange(draft.timeRange),
    requestId,
    appliedAt,
  };
}

export function clampTimeRange([start, end]: TimeRangeMilliseconds): TimeRangeMilliseconds {
  const fixedWindow = Math.min(PLAYBACK_WINDOW_MS, PLAYBACK_DOMAIN[1] - PLAYBACK_DOMAIN[0]);
  const safeStart = Number.isFinite(start) ? start : DEFAULT_TIME_RANGE[0];
  const safeEnd = Number.isFinite(end) ? end : DEFAULT_TIME_RANGE[1];
  const preferredEnd = Math.max(safeEnd, safeStart + fixedWindow);
  const clampedEnd = Math.max(
    PLAYBACK_DOMAIN[0] + fixedWindow,
    Math.min(preferredEnd, PLAYBACK_DOMAIN[1]),
  );

  return [clampedEnd - fixedWindow, clampedEnd];
}

export function sortModes(modes: readonly number[]): ModeCode[] {
  const lookup = new Set(modes);
  return ALL_MODE_CODES.filter((mode) => lookup.has(mode));
}

export function toggleModeSelection(
  modes: readonly ModeCode[],
  mode: ModeCode,
  enabled: boolean,
): ModeCode[] {
  const next = enabled ? [...modes, mode] : modes.filter((value) => value !== mode);
  return sortModes(next);
}

export function scenarioEquals(
  left: Pick<ScenarioConfig, 'datasetId' | 'layers' | 'modes' | 'timeRange'>,
  right: Pick<ScenarioConfig, 'datasetId' | 'layers' | 'modes' | 'timeRange'>,
): boolean {
  return (
    left.datasetId === right.datasetId &&
    left.timeRange[0] === right.timeRange[0] &&
    left.timeRange[1] === right.timeRange[1] &&
    left.modes.length === right.modes.length &&
    left.modes.every((mode, index) => mode === right.modes[index]) &&
    left.layers.trips === right.layers.trips &&
    left.layers.arc === right.layers.arc &&
    left.layers.heatmap === right.layers.heatmap
  );
}

export function summarizeLayers(layers: LayerVisibility): string {
  const enabled = (Object.entries(layers) as Array<[LayerId, boolean]>)
    .filter(([, visible]) => visible)
    .map(([layer]) => {
      if (layer === 'trips') return 'Trips';
      if (layer === 'arc') return 'Arc';
      return 'Heatmap';
    });

  return enabled.length ? enabled.join(' + ') : 'No layers';
}

export function computeScenarioRefreshTargets(
  previous: ScenarioConfig,
  next: ScenarioConfig,
): string[] {
  const targets = new Set<string>();
  const filtersChanged =
    previous.datasetId !== next.datasetId ||
    previous.timeRange[0] !== next.timeRange[0] ||
    previous.timeRange[1] !== next.timeRange[1] ||
    previous.modes.length !== next.modes.length ||
    previous.modes.some((mode, index) => mode !== next.modes[index]);

  if (
    filtersChanged ||
    previous.layers.trips !== next.layers.trips ||
    previous.layers.heatmap !== next.layers.heatmap
  ) {
    targets.add('tripSource');
  }

  if (filtersChanged || previous.layers.arc !== next.layers.arc) {
    targets.add('arcSource');
  }

  if (!scenarioEquals(previous, next)) {
    targets.add('keplerMap');
  }

  return [...targets];
}

export function createBenchmarkEntry(
  applied: AppliedScenario,
  durationMs: number,
  counts: BenchmarkCounts,
  status: 'success' | 'error',
  errorMessage?: string,
): BenchmarkEntry {
  return {
    requestId: applied.requestId,
    datasetId: applied.datasetId,
    layerSummary: summarizeLayers(applied.layers),
    modeSummary: formatModeList(applied.modes),
    timeRange: [...applied.timeRange],
    durationMs,
    counts,
    status,
    finishedAt: Date.now(),
    ...(errorMessage ? {errorMessage} : {}),
  };
}

export function isCurrentRequest(activeRequestId: number, incomingRequestId: number): boolean {
  return activeRequestId === incomingRequestId;
}
