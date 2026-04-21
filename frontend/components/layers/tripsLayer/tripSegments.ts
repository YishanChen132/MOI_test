// 這個檔案負責把 trip 原始軌跡依 mode 與時間窗切成可重用的連續路段。
import {getTrajectoryPointCount, normalizeNumericArray} from '../../../lib/transforms';
import type {
  QueryTrajectoryRow,
  TimeRangeSeconds,
} from '../../../types';

export type TripSegmentPoint = {
  lng: number;
  lat: number;
  timestamp: number;
};

export type TripSegment = {
  row: QueryTrajectoryRow;
  segmentIndex: number;
  mode: number;
  startTime: number;
  endTime: number;
  points: TripSegmentPoint[];
};

export function forEachTripSegment(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
  onSegment: (segment: TripSegment) => void,
): void {
  const selectedModeSet = new Set(selectedModes);
  const [startTime, endTime] = timeRange;

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    let currentMode: number | null = null;
    let currentPoints: TripSegmentPoint[] = [];
    let currentStartTime = 0;
    let currentEndTime = 0;
    let segmentIndex = 0;

    const flushCurrentSegment = () => {
      if (currentMode === null || currentPoints.length < 2) {
        currentPoints = [];
        currentMode = null;
        return;
      }

      onSegment({
        row,
        segmentIndex,
        mode: currentMode,
        startTime: currentStartTime,
        endTime: currentEndTime,
        points: currentPoints,
      });

      segmentIndex += 1;
      currentPoints = [];
      currentMode = null;
    };

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      const timestamp = timestamps[pointIndex];
      const mode = modes[pointIndex];
      const lng = paths[pointIndex * 2];
      const lat = paths[pointIndex * 2 + 1];

      const isVisible =
        selectedModeSet.has(mode) &&
        timestamp >= startTime &&
        timestamp <= endTime &&
        Number.isFinite(lng) &&
        Number.isFinite(lat);

      if (!isVisible) {
        flushCurrentSegment();
        continue;
      }

      if (currentMode === mode) {
        currentPoints.push({lng, lat, timestamp});
        currentEndTime = timestamp;
        continue;
      }

      flushCurrentSegment();
      currentMode = mode;
      currentStartTime = timestamp;
      currentEndTime = timestamp;
      currentPoints = [{lng, lat, timestamp}];
    }

    flushCurrentSegment();
  }
}
