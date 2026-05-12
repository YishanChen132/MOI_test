import type {DatasetPresetId, FlowmapSourceType} from '../../constants/datasets';
import type {QueryRoadNodeTransitionRow} from '../../types';
import type {FlowmapLayerData, FlowmapRoadSegment} from './flowmapTypes';

export const ROAD_NODE_TRANSITION_FLOWMAP_LIMIT = 3_000;
export const FLOWMAP_TIME_BUCKET_SECONDS = 600;

type RoadNodeTransitionCacheEntry = {
  rows: QueryRoadNodeTransitionRow[];
  data: FlowmapLayerData;
};

const trajectoryFlowmapDataCache = new Map<string, FlowmapLayerData>();
const roadNodeTransitionCache = new Map<string, RoadNodeTransitionCacheEntry>();
const roadPathSegmentCache = new Map<string, FlowmapRoadSegment[]>();

export function buildFlowmapModeKey(modes: readonly number[]): string {
  return modes.join(',');
}

export function bucketFlowmapTimeRange(
  timeRangeSeconds: readonly [number, number],
): [number, number] {
  const [start, end] = timeRangeSeconds;
  const startBucket = Math.floor(start / FLOWMAP_TIME_BUCKET_SECONDS) * FLOWMAP_TIME_BUCKET_SECONDS;
  const endBucket = Math.ceil(end / FLOWMAP_TIME_BUCKET_SECONDS) * FLOWMAP_TIME_BUCKET_SECONDS;

  return [startBucket, Math.max(startBucket, endBucket)];
}

export function buildFlowmapTimeRangeKey(timeRangeSeconds: readonly [number, number]): string {
  const [startBucket, endBucket] = bucketFlowmapTimeRange(timeRangeSeconds);
  return `${startBucket}:${endBucket}`;
}

export function buildFlowmapCacheKey(
  datasetId: DatasetPresetId,
  sourceType: FlowmapSourceType,
  modes: readonly number[],
  timeRangeSeconds: readonly [number, number],
): string {
  return [
    datasetId,
    sourceType,
    buildFlowmapModeKey(modes),
    buildFlowmapTimeRangeKey(timeRangeSeconds),
  ].join('::');
}

export function getTrajectoryFlowmapData(cacheKey: string): FlowmapLayerData | null {
  return trajectoryFlowmapDataCache.get(cacheKey) ?? null;
}

export function setTrajectoryFlowmapData(cacheKey: string, data: FlowmapLayerData): FlowmapLayerData {
  trajectoryFlowmapDataCache.set(cacheKey, data);
  return data;
}

export function getRoadNodeTransitionEntry(cacheKey: string): RoadNodeTransitionCacheEntry | null {
  return roadNodeTransitionCache.get(cacheKey) ?? null;
}

export function setRoadNodeTransitionEntry(
  cacheKey: string,
  entry: RoadNodeTransitionCacheEntry,
): RoadNodeTransitionCacheEntry {
  roadNodeTransitionCache.set(cacheKey, entry);
  return entry;
}

export function getRoadPathSegments(cacheKey: string): FlowmapRoadSegment[] | null {
  return roadPathSegmentCache.get(cacheKey) ?? null;
}

export function setRoadPathSegments(cacheKey: string, segments: FlowmapRoadSegment[]): FlowmapRoadSegment[] {
  roadPathSegmentCache.set(cacheKey, segments);
  return segments;
}

export function clearFlowmapCaches(): void {
  trajectoryFlowmapDataCache.clear();
  roadNodeTransitionCache.clear();
  roadPathSegmentCache.clear();
}
