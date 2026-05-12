// 這個檔案負責把 trajectory / road-node-transition / road-edge rows 轉成 flowmap 可直接繪製的資料。
import {toModeLabel} from '../../constants/modes';
import {normalizeNumericArray} from '../../lib/transforms';
import {secondsOfDayToPlaybackMs} from '../../lib/timeplayback';
import type {
  QueryRoadFlowRow,
  QueryRoadNodeTransitionRow,
  QueryTrajectoryRow,
  TimeRangeSeconds,
} from '../../types';
import type {
  FlowmapLayerData,
  FlowmapLocation,
  FlowmapRoadEdge,
  FlowmapRoadSegment,
} from './flowmapTypes';
import {FLOWMAP_TIME_BUCKET_SECONDS as FLOWMAP_RENDER_TIME_BUCKET_SECONDS} from './flowmapCache';

export const FLOWMAP_COORD_PRECISION = 4;
export const FLOWMAP_TIME_BUCKET_SECONDS = FLOWMAP_RENDER_TIME_BUCKET_SECONDS;

function roundCoordinate(value: number, precision = FLOWMAP_COORD_PRECISION): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function createLocationId(lon: number, lat: number): string {
  return `${roundCoordinate(lon)},${roundCoordinate(lat)}`;
}

function createFlowId(origin: string, dest: string, mode: number, timeBucket: number): string {
  return `${origin}->${dest}:${mode}:${timeBucket}`;
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number';
}

function upsertLocation(
  locationsById: Map<string, FlowmapLocation>,
  id: string,
  lon: number,
  lat: number,
  extra?: Partial<FlowmapLocation>,
): void {
  const existing = locationsById.get(id);
  if (existing) {
    locationsById.set(id, {...existing, ...extra});
    return;
  }

  locationsById.set(id, {
    id,
    lon: roundCoordinate(lon),
    lat: roundCoordinate(lat),
    ...extra,
  });
}

export function normalizeRoadGeometry(value: unknown): [number, number][] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isCoordinatePair).map(([lon, lat]) => [roundCoordinate(lon, 6), roundCoordinate(lat, 6)]);
}

export function transformTrajectoryRowsToFlowmapData(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange?: TimeRangeSeconds,
): FlowmapLayerData {
  const selectedModeSet = new Set(selectedModes);
  const startTime = timeRange?.[0] ?? Number.NEGATIVE_INFINITY;
  const endTime = timeRange?.[1] ?? Number.POSITIVE_INFINITY;
  const locationsById = new Map<string, FlowmapLocation>();
  const flowsById = new Map<string, FlowmapLayerData['flows'][number]>();

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = Math.min(Math.floor(paths.length / 2), timestamps.length, modes.length);

    if (pointCount < 2) {
      continue;
    }

    for (let pointIndex = 0; pointIndex < pointCount - 1; pointIndex += 1) {
      const mode = modes[pointIndex];
      const timestamp = timestamps[pointIndex];
      if (!selectedModeSet.has(mode) || timestamp < startTime || timestamp > endTime) {
        continue;
      }

      const originLon = paths[pointIndex * 2];
      const originLat = paths[pointIndex * 2 + 1];
      const destLon = paths[pointIndex * 2 + 2];
      const destLat = paths[pointIndex * 2 + 3];
      if (![originLon, originLat, destLon, destLat].every(Number.isFinite)) {
        continue;
      }

      const originId = createLocationId(originLon, originLat);
      const destId = createLocationId(destLon, destLat);
      if (originId === destId) {
        continue;
      }

      upsertLocation(locationsById, originId, originLon, originLat);
      upsertLocation(locationsById, destId, destLon, destLat);

      const timeBucket = Math.floor(timestamp / FLOWMAP_RENDER_TIME_BUCKET_SECONDS) * FLOWMAP_RENDER_TIME_BUCKET_SECONDS;
      const flowId = createFlowId(originId, destId, mode, timeBucket);
      const existing = flowsById.get(flowId);
      if (existing) {
        existing.count += 1;
        continue;
      }

      flowsById.set(flowId, {
        id: flowId,
        origin: originId,
        dest: destId,
        count: 1,
        mode,
        modeLabel: toModeLabel(mode),
        timestamp: timeBucket,
        timestampMs: secondsOfDayToPlaybackMs(timeBucket),
        timeBucket,
      });
    }
  }

  return {
    locations: [...locationsById.values()],
    flows: [...flowsById.values()].sort((left, right) => right.count - left.count || left.timestamp - right.timestamp),
  };
}

export function transformRoadNodeTransitionRowsToFlowmapData(
  rows: Iterable<QueryRoadNodeTransitionRow>,
  selectedModes: readonly number[],
  timeRange?: TimeRangeSeconds,
): FlowmapLayerData {
  const selectedModeSet = new Set(selectedModes);
  const startTime = timeRange?.[0] ?? Number.NEGATIVE_INFINITY;
  const endTime = timeRange?.[1] ?? Number.POSITIVE_INFINITY;
  const locationsById = new Map<string, FlowmapLocation>();
  const flowsById = new Map<string, FlowmapLayerData['flows'][number]>();

  for (const row of rows) {
    if (!selectedModeSet.has(row.mode) || row.time_bucket < startTime || row.time_bucket > endTime) {
      continue;
    }

    upsertLocation(locationsById, row.origin_id, row.origin_lon, row.origin_lat);
    upsertLocation(locationsById, row.dest_id, row.dest_lon, row.dest_lat);

    const flowId = createFlowId(row.origin_id, row.dest_id, row.mode, row.time_bucket);
    const existing = flowsById.get(flowId);
    if (existing) {
      existing.count += row.count;
      existing.routeCount = (existing.routeCount ?? 0) + row.route_count;
      continue;
    }

    flowsById.set(flowId, {
      id: flowId,
      origin: row.origin_id,
      dest: row.dest_id,
      count: row.count,
      mode: row.mode,
      modeLabel: toModeLabel(row.mode),
      timestamp: row.time_bucket,
      timestampMs: secondsOfDayToPlaybackMs(row.time_bucket),
      timeBucket: row.time_bucket,
      routeCount: row.route_count,
    });
  }

  return {
    locations: [...locationsById.values()],
    flows: [...flowsById.values()].sort((left, right) => right.count - left.count || left.timestamp - right.timestamp),
  };
}

export function transformRoadFlowRowsToSegments(
  rows: Iterable<QueryRoadFlowRow>,
  selectedModes: readonly number[],
  timeRange?: TimeRangeSeconds,
): FlowmapRoadSegment[] {
  const selectedModeSet = new Set(selectedModes);
  const startTime = timeRange?.[0] ?? Number.NEGATIVE_INFINITY;
  const endTime = timeRange?.[1] ?? Number.POSITIVE_INFINITY;
  const segments: FlowmapRoadSegment[] = [];

  for (const row of rows) {
    if (!selectedModeSet.has(row.mode) || row.time_bucket < startTime || row.time_bucket > endTime) {
      continue;
    }

    const path = normalizeRoadGeometry(row.geometry);
    if (path.length < 2 || !Number.isFinite(row.flow_count)) {
      continue;
    }

    segments.push({
      id: row.id,
      edgeId: row.edge_id,
      path,
      count: row.flow_count,
      mode: row.mode,
      modeLabel: toModeLabel(row.mode),
      timeBucket: row.time_bucket,
      roadClass: row.road_class,
      sourceNodeId: row.source_node_id,
      sourceLon: roundCoordinate(row.source_lon, 6),
      sourceLat: roundCoordinate(row.source_lat, 6),
      targetNodeId: row.target_node_id,
      targetLon: roundCoordinate(row.target_lon, 6),
      targetLat: roundCoordinate(row.target_lat, 6),
    });
  }

  return segments.sort((left, right) => right.count - left.count || left.timeBucket - right.timeBucket);
}

export function transformRoadEdgeRowsToSegments(
  rows: Iterable<{
    edge_id: string;
    u: string;
    v: string;
    geometry: unknown;
    road_class: string;
  }>,
): FlowmapRoadEdge[] {
  const segments: FlowmapRoadEdge[] = [];

  for (const row of rows) {
    const path = normalizeRoadGeometry(row.geometry);
    if (path.length < 2) {
      continue;
    }

    segments.push({
      edgeId: row.edge_id,
      sourceNodeId: row.u,
      targetNodeId: row.v,
      path,
      roadClass: row.road_class,
    });
  }

  return segments;
}
