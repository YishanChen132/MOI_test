// 這個檔案專門把 Trips 圖層查回來的資料切成連續 mode 的軌跡片段。
import {toModeLabel} from '../../../constants/modes';
import {secondsOfDayToPlaybackMs} from '../../../lib/timeplayback';
import {getTrajectoryPointCount, normalizeNumericArray} from '../../../lib/transforms';
import type {
  QueryTrajectoryRow,
  TimeRangeSeconds,
  TripFeatureCollection,
  TripLayerDatum,
} from '../../../types';

export function segmentTripRows(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): TripFeatureCollection {
  const selectedModeSet = new Set(selectedModes);
  const [startTime, endTime] = timeRange;
  const features: TripFeatureCollection['features'] = [];

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    let currentMode: number | null = null;
    let currentCoordinates: number[][] = [];
    let currentStartTime = 0;
    let currentEndTime = 0;
    let segmentIndex = 0;

    const flushCurrentSegment = () => {
      if (currentMode === null || currentCoordinates.length < 2) {
        currentCoordinates = [];
        currentMode = null;
        return;
      }

      features.push({
        type: 'Feature',
        properties: {
          agent_id: row.agent_id,
          segment_index: segmentIndex,
          mode: currentMode,
          mode_label: toModeLabel(currentMode),
          start_time: currentStartTime,
          end_time: currentEndTime,
        },
        geometry: {
          type: 'LineString',
          coordinates: currentCoordinates,
        },
      });

      segmentIndex += 1;
      currentCoordinates = [];
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

      const coordinate = [lng, lat, 0, secondsOfDayToPlaybackMs(timestamp)];

      if (currentMode === mode) {
        currentCoordinates.push(coordinate);
        currentEndTime = timestamp;
        continue;
      }

      flushCurrentSegment();
      currentMode = mode;
      currentStartTime = timestamp;
      currentEndTime = timestamp;
      currentCoordinates = [coordinate];
    }

    flushCurrentSegment();
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function buildTripLayerData(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): TripLayerDatum[] {
  const selectedModeSet = new Set(selectedModes);
  const [startTime, endTime] = timeRange;
  const trips: TripLayerDatum[] = [];

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    let currentMode: number | null = null;
    let currentPath: [number, number][] = [];
    let currentTimestamps: number[] = [];
    let currentStartTime = 0;
    let currentEndTime = 0;
    let segmentIndex = 0;

    const flushCurrentSegment = () => {
      if (currentMode === null || currentPath.length < 2) {
        currentPath = [];
        currentTimestamps = [];
        currentMode = null;
        return;
      }

      trips.push({
        agent_id: row.agent_id,
        segment_index: segmentIndex,
        mode: currentMode,
        mode_label: toModeLabel(currentMode),
        start_time: currentStartTime,
        end_time: currentEndTime,
        path: currentPath,
        timestamps: currentTimestamps,
      });

      segmentIndex += 1;
      currentPath = [];
      currentTimestamps = [];
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
        currentPath.push([lng, lat]);
        currentTimestamps.push(timestamp * 1_000);
        currentEndTime = timestamp;
        continue;
      }

      flushCurrentSegment();
      currentMode = mode;
      currentStartTime = timestamp;
      currentEndTime = timestamp;
      currentPath = [[lng, lat]];
      currentTimestamps = [timestamp * 1_000];
    }

    flushCurrentSegment();
  }

  return trips;
}

export function countTripLayerSegments(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): number {
  const selectedModeSet = new Set(selectedModes);
  const [startTime, endTime] = timeRange;
  let segmentCount = 0;

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);
    let currentMode: number | null = null;
    let currentLength = 0;

    const flushCurrentSegment = () => {
      if (currentMode !== null && currentLength >= 2) {
        segmentCount += 1;
      }

      currentMode = null;
      currentLength = 0;
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
        currentLength += 1;
        continue;
      }

      flushCurrentSegment();
      currentMode = mode;
      currentLength = 1;
    }

    flushCurrentSegment();
  }

  return segmentCount;
}
