// 這個檔案負責把 Trip 原始軌跡依目前時間窗切成會發光的 path 片段。
import {getTrajectoryPointCount, normalizeNumericArray} from '../../../lib/transforms';
import type {QueryTrajectoryRow, TimeRangeSeconds} from '../../../types';

export type HeatmapPathDatum = {
  agent_id: number;
  segment_index: number;
  start_time: number;
  end_time: number;
  path: [number, number][];
};

export type HeatmapWeightedPathDatum = {
  id: string;
  path: [number, number][];
  count: number;
  intensity: number;
};

const SEGMENT_ROUND_DIGITS = 4;

function roundCoordinate(value: number): number {
  const factor = 10 ** SEGMENT_ROUND_DIGITS;
  return Math.round(value * factor) / factor;
}

function buildSegmentKey(
  start: [number, number],
  end: [number, number],
): {id: string; orderedPath: [[number, number], [number, number]]} {
  const a: [number, number] = [roundCoordinate(start[0]), roundCoordinate(start[1])];
  const b: [number, number] = [roundCoordinate(end[0]), roundCoordinate(end[1])];
  const aKey = `${a[0]},${a[1]}`;
  const bKey = `${b[0]},${b[1]}`;
  return aKey <= bKey
    ? {id: `${aKey}|${bKey}`, orderedPath: [a, b]}
    : {id: `${bKey}|${aKey}`, orderedPath: [b, a]};
}

export function buildHeatmapPaths(
  rows: readonly QueryTrajectoryRow[],
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): HeatmapPathDatum[] {
  const selectedModeSet = new Set(selectedModes);
  const [startTime, endTime] = timeRange;
  const result: HeatmapPathDatum[] = [];

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    let currentPath: [number, number][] = [];
    let currentStartTime = 0;
    let currentEndTime = 0;
    let segmentIndex = 0;

    const flushCurrentPath = () => {
      if (currentPath.length < 2) {
        currentPath = [];
        return;
      }

      result.push({
        agent_id: row.agent_id,
        segment_index: segmentIndex,
        start_time: currentStartTime,
        end_time: currentEndTime,
        path: currentPath,
      });
      segmentIndex += 1;
      currentPath = [];
    };

    for (let pointIndex = 1; pointIndex < pointCount; pointIndex += 1) {
      const previousTimestamp = timestamps[pointIndex - 1];
      const currentTimestamp = timestamps[pointIndex];
      const previousMode = modes[pointIndex - 1];
      const currentMode = modes[pointIndex];
      const previousLng = paths[(pointIndex - 1) * 2];
      const previousLat = paths[(pointIndex - 1) * 2 + 1];
      const currentLng = paths[pointIndex * 2];
      const currentLat = paths[pointIndex * 2 + 1];

      const hasSelectedMode =
        selectedModeSet.has(previousMode) || selectedModeSet.has(currentMode);
      const hasValidCoordinates =
        Number.isFinite(previousLng) &&
        Number.isFinite(previousLat) &&
        Number.isFinite(currentLng) &&
        Number.isFinite(currentLat);
      const segmentStart = Math.min(previousTimestamp, currentTimestamp);
      const segmentEnd = Math.max(previousTimestamp, currentTimestamp);
      const overlapsTimeRange = segmentEnd >= startTime && segmentStart <= endTime;

      if (!hasSelectedMode || !hasValidCoordinates || !overlapsTimeRange) {
        flushCurrentPath();
        continue;
      }

      if (currentPath.length === 0) {
        currentStartTime = segmentStart;
        currentPath.push([previousLng, previousLat]);
      }

      currentEndTime = segmentEnd;
      currentPath.push([currentLng, currentLat]);
    }

    flushCurrentPath();
  }

  return result;
}

export function buildWeightedHeatmapPaths(
  rows: readonly QueryTrajectoryRow[],
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): HeatmapWeightedPathDatum[] {
  const selectedModeSet = new Set(selectedModes);
  const [startTime, endTime] = timeRange;
  const segmentCounts = new Map<string, HeatmapWeightedPathDatum>();

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    for (let pointIndex = 1; pointIndex < pointCount; pointIndex += 1) {
      const previousTimestamp = timestamps[pointIndex - 1];
      const currentTimestamp = timestamps[pointIndex];
      const previousMode = modes[pointIndex - 1];
      const currentMode = modes[pointIndex];
      const previousLng = paths[(pointIndex - 1) * 2];
      const previousLat = paths[(pointIndex - 1) * 2 + 1];
      const currentLng = paths[pointIndex * 2];
      const currentLat = paths[pointIndex * 2 + 1];

      const hasSelectedMode =
        selectedModeSet.has(previousMode) || selectedModeSet.has(currentMode);
      const hasValidCoordinates =
        Number.isFinite(previousLng) &&
        Number.isFinite(previousLat) &&
        Number.isFinite(currentLng) &&
        Number.isFinite(currentLat);
      const segmentStart = Math.min(previousTimestamp, currentTimestamp);
      const segmentEnd = Math.max(previousTimestamp, currentTimestamp);
      const overlapsTimeRange = segmentEnd >= startTime && segmentStart <= endTime;

      if (!hasSelectedMode || !hasValidCoordinates || !overlapsTimeRange) {
        continue;
      }

      const {id, orderedPath} = buildSegmentKey(
        [previousLng, previousLat],
        [currentLng, currentLat],
      );
      const existing = segmentCounts.get(id);

      if (existing) {
        existing.count += 1;
        continue;
      }

      segmentCounts.set(id, {
        id,
        path: orderedPath,
        count: 1,
        intensity: 0,
      });
    }
  }

  const weightedPaths = [...segmentCounts.values()].sort((left, right) => right.count - left.count);
  const maxCount = weightedPaths[0]?.count ?? 1;

  return weightedPaths.map((datum) => ({
    ...datum,
    intensity: datum.count / maxCount,
  }));
}
