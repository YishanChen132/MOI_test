// 負責把 DuckDB 查回來的路徑資料轉成 kepler 可以直接吃的格式。
import {toModeLabel} from './modes';
import {secondsOfDayToPlaybackIso, secondsOfDayToPlaybackMs} from './timeplayback';
import type {
  ArcDatum,
  HeatmapDatum,
  QueryTrajectoryRow,
  TimeRangeSeconds,
  TripFeatureCollection,
} from './types';

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

function getPointCount(row: QueryTrajectoryRow): number {
  const paths = normalizeNumericArray(row.paths);
  const timestamps = normalizeNumericArray(row.timestamps);
  const modes = normalizeNumericArray(row.modes);
  return Math.min(Math.floor(paths.length / 2), timestamps.length, modes.length);
}

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
    const pointCount = getPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    let currentMode: number | null = null;
    let currentCoordinates: number[][] = [];
    let currentStartTime = 0;
    let segmentIndex = 0;

    const flushCurrentSegment = () => {
      if (currentMode === null || currentCoordinates.length < 2) {
        currentCoordinates = [];
        currentMode = null;
        return;
      }

      const endCoordinate = currentCoordinates[currentCoordinates.length - 1];
      const endSegmentTime = Number(endCoordinate?.[3] ?? currentStartTime);

      features.push({
        type: 'Feature',
        properties: {
          agent_id: row.agent_id,
          segment_index: segmentIndex,
          mode: currentMode,
          mode_label: toModeLabel(currentMode),
          start_time: currentStartTime,
          end_time: endSegmentTime,
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

      const coordinate = [lng, lat, 0, timestamp];

      if (currentMode === mode) {
        currentCoordinates.push(coordinate);
        continue;
      }

      flushCurrentSegment();
      currentMode = mode;
      currentStartTime = timestamp;
      currentCoordinates = [coordinate];
    }

    flushCurrentSegment();
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function flattenArcRows(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange?: TimeRangeSeconds,
): ArcDatum[] {
  const selectedModeSet = new Set(selectedModes);
  const startTime = timeRange?.[0] ?? Number.NEGATIVE_INFINITY;
  const endTime = timeRange?.[1] ?? Number.POSITIVE_INFINITY;
  const result: ArcDatum[] = [];

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    for (let segmentIndex = 0; segmentIndex < pointCount - 1; segmentIndex += 1) {
      const mode = modes[segmentIndex];
      const timestamp = timestamps[segmentIndex];

      if (!selectedModeSet.has(mode) || timestamp < startTime || timestamp > endTime) {
        continue;
      }

      const sourceLng = paths[segmentIndex * 2];
      const sourceLat = paths[segmentIndex * 2 + 1];
      const targetLng = paths[segmentIndex * 2 + 2];
      const targetLat = paths[segmentIndex * 2 + 3];

      if (
        !Number.isFinite(sourceLng) ||
        !Number.isFinite(sourceLat) ||
        !Number.isFinite(targetLng) ||
        !Number.isFinite(targetLat)
      ) {
        continue;
      }

      result.push({
        agent_id: row.agent_id,
        segment_index: segmentIndex,
        source_lng: sourceLng,
        source_lat: sourceLat,
        target_lng: targetLng,
        target_lat: targetLat,
        mode,
        mode_label: toModeLabel(mode),
        timestamp,
        timestamp_ms: secondsOfDayToPlaybackMs(timestamp),
        timestamp_iso: secondsOfDayToPlaybackIso(timestamp),
      });
    }
  }

  return result;
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
    const pointCount = getPointCount(row);

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
        point_index: pointIndex,
        lng,
        lat,
        mode,
        mode_label: toModeLabel(mode),
        timestamp,
      });
    }
  }

  return result;
}
