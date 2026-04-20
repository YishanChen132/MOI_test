// 這個檔案放軌跡資料轉換會共用到的小工具，以及 Heatmap 專用的轉換函式。
import {toModeLabel} from '../constants/modes';
import {secondsOfDayToPlaybackMs} from './timeplayback';
import type {
  HeatmapDatum,
  QueryTrajectoryRow,
  TimeRangeSeconds,
} from '../types';

export function normalizeNumericArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
  }

  if (ArrayBuffer.isView(value)) {
    return Array.from(value as unknown as ArrayLike<number>).filter((item) => Number.isFinite(item));
  }

  if (value && typeof value === 'object' && Symbol.iterator in value) {
    return Array.from(value as Iterable<unknown>).filter(
      (item): item is number => typeof item === 'number' && Number.isFinite(item),
    );
  }

  return [];
}

export function getTrajectoryPointCount(row: QueryTrajectoryRow): number {
  const paths = normalizeNumericArray(row.paths);
  const timestamps = normalizeNumericArray(row.timestamps);
  const modes = normalizeNumericArray(row.modes);
  return Math.min(Math.floor(paths.length / 2), timestamps.length, modes.length);
}

export function flattenHeatmapRows(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): HeatmapDatum[] {
  const selectedModeSet = new Set(selectedModes);
  const [startTime, endTime] = timeRange;
  const result: HeatmapDatum[] = [];

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      const mode = modes[pointIndex];
      const timestamp = timestamps[pointIndex];
      const lng = paths[pointIndex * 2];
      const lat = paths[pointIndex * 2 + 1];

      if (
        !selectedModeSet.has(mode) ||
        timestamp < startTime ||
        timestamp > endTime ||
        !Number.isFinite(lng) ||
        !Number.isFinite(lat)
      ) {
        continue;
      }

      result.push({
        agent_id: row.agent_id,
        segment_index: pointIndex,
        sample_index: 0,
        lng,
        lat,
        mode,
        mode_label: toModeLabel(mode),
        timestamp,
        timestamp_ms: secondsOfDayToPlaybackMs(timestamp),
        weight: 1,
      });
    }
  }

  return result;
}
