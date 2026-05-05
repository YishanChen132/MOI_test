// 這個檔案負責把 arc raw rows 轉成 flowmap.gl 需要的 locations + origin-destination flows。
import {toModeLabel} from '../../constants/modes';
import {secondsOfDayToPlaybackMs} from '../../lib/timeplayback';
import {getTrajectoryPointCount, normalizeNumericArray} from '../../lib/transforms';
import type {QueryTrajectoryRow, TimeRangeSeconds} from '../../types';
import type {FlowmapFlow, FlowmapLayerData, FlowmapLocation} from './flowmapTypes';

export const FLOWMAP_TIME_BUCKET_SECONDS = 60;
export const FLOWMAP_COORD_PRECISION = 4;

type FlowAggregate = {
  id: string;
  origin: string;
  dest: string;
  count: number;
  mode: number;
  modeLabel: string;
  timestamp: number;
  timestampMs: number;
  timeBucket: number;
};

function roundCoordinate(value: number, precision = FLOWMAP_COORD_PRECISION): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function buildLocationId(lon: number, lat: number): string {
  return `${roundCoordinate(lon)},${roundCoordinate(lat)}`;
}

function buildFlowId(originId: string, destinationId: string, mode: number, bucket: number): string {
  return `${originId}->${destinationId}:${mode}:${bucket}`;
}

function buildLocation(id: string, lon: number, lat: number): FlowmapLocation {
  return {
    id,
    lon: roundCoordinate(lon),
    lat: roundCoordinate(lat),
  };
}

export function transformRowsToFlowmapData(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange?: TimeRangeSeconds,
): FlowmapLayerData {
  const selectedModeSet = new Set(selectedModes);
  const startTime = timeRange?.[0] ?? Number.NEGATIVE_INFINITY;
  const endTime = timeRange?.[1] ?? Number.POSITIVE_INFINITY;
  const locationsById = new Map<string, FlowmapLocation>();
  const flowsById = new Map<string, FlowAggregate>();

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    if (pointCount < 2) {
      continue;
    }

    for (let segmentIndex = 0; segmentIndex < pointCount - 1; segmentIndex += 1) {
      const mode = modes[segmentIndex];
      const timestamp = timestamps[segmentIndex];

      if (!selectedModeSet.has(mode) || timestamp < startTime || timestamp > endTime) {
        continue;
      }

      const originLon = paths[segmentIndex * 2];
      const originLat = paths[segmentIndex * 2 + 1];
      const destinationLon = paths[segmentIndex * 2 + 2];
      const destinationLat = paths[segmentIndex * 2 + 3];

      if (
        !Number.isFinite(originLon) ||
        !Number.isFinite(originLat) ||
        !Number.isFinite(destinationLon) ||
        !Number.isFinite(destinationLat)
      ) {
        continue;
      }

      const originId = buildLocationId(originLon, originLat);
      const destinationId = buildLocationId(destinationLon, destinationLat);

      if (originId === destinationId) {
        continue;
      }

      locationsById.set(originId, buildLocation(originId, originLon, originLat));
      locationsById.set(destinationId, buildLocation(destinationId, destinationLon, destinationLat));

      const timeBucket = Math.floor(timestamp / FLOWMAP_TIME_BUCKET_SECONDS) * FLOWMAP_TIME_BUCKET_SECONDS;
      const flowId = buildFlowId(originId, destinationId, mode, timeBucket);
      const existing = flowsById.get(flowId);

      if (existing) {
        existing.count += 1;
        continue;
      }

      flowsById.set(flowId, {
        id: flowId,
        origin: originId,
        dest: destinationId,
        count: 1,
        mode,
        modeLabel: toModeLabel(mode),
        timestamp: timeBucket,
        timestampMs: secondsOfDayToPlaybackMs(timeBucket),
        timeBucket,
      });
    }
  }

  const flows = [...flowsById.values()]
    .sort((left, right) => right.count - left.count || left.timestamp - right.timestamp)
    .map<FlowmapFlow>((flow) => ({...flow}));

  return {
    locations: [...locationsById.values()],
    flows,
  };
}
