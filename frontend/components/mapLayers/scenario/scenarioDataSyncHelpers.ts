// 這個檔案負責放地圖資料同步會共用到的快取型別、空資料和小工具函式。
import type * as arrow from 'apache-arrow';
import type {MutableRefObject} from 'react';
import type {DatasetPresetId} from '../../../constants/datasets';
import type {DatasetDescriptor} from '../../../services/kepler';
import type {
  ArcDatum,
  BenchmarkCounts,
  MapViewportBounds,
  QueryTrajectoryRow,
} from '../../../types';

export const MAX_SCENARIO_CACHE_ENTRIES = 2;

export type TripCacheEntry = {
  arrowTable: arrow.Table | null;
  tripDatasets: DatasetDescriptor[];
  trajectoryRows: QueryTrajectoryRow[];
  tripSegments: number;
  heatmapPoints: number;
};

export type ArcCacheEntry = {
  arcDatasets: DatasetDescriptor[];
  arcRows: ArcDatum[];
};

export const EMPTY_COUNTS: BenchmarkCounts = {
  tripSegments: 0,
  arcRows: 0,
  heatmapPoints: 0,
};

export const sharedTripCacheRef: MutableRefObject<Map<string, TripCacheEntry>> = {
  current: new Map<string, TripCacheEntry>(),
};

export const sharedArcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>> = {
  current: new Map<string, ArcCacheEntry>(),
};

export const VIEWPORT_BOUNDS_KEY_PRECISION = 4;

export function buildViewportBoundsKey(
  bounds: MapViewportBounds,
  precision = VIEWPORT_BOUNDS_KEY_PRECISION,
): string {
  const digits = Math.max(0, precision);
  const normalize = (value: number) => value.toFixed(digits);
  return [
    normalize(bounds.west),
    normalize(bounds.south),
    normalize(bounds.east),
    normalize(bounds.north),
  ].join(':');
}

export function buildScenarioCacheKey(
  datasetId: DatasetPresetId,
  modes: readonly number[],
  viewportBoundsKey?: string | null,
): string {
  const baseKey = `${datasetId}::${modes.join(',')}`;
  return viewportBoundsKey ? `${baseKey}::${viewportBoundsKey}` : baseKey;
}

function touchCacheEntry<T>(cache: Map<string, T>, cacheKey: string, entry: T): T {
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  }

  cache.set(cacheKey, entry);
  return entry;
}

function evictLeastRecentlyUsedScenario<T>(cache: Map<string, T>): void {
  while (cache.size > MAX_SCENARIO_CACHE_ENTRIES) {
    const oldestCacheKey = cache.keys().next().value;
    if (!oldestCacheKey) {
      return;
    }

    cache.delete(oldestCacheKey);
  }
}

export function getTripCacheEntry(
  cacheRef: MutableRefObject<Map<string, TripCacheEntry>>,
  cacheKey: string,
): TripCacheEntry | null {
  const entry = cacheRef.current.get(cacheKey) ?? null;
  if (!entry) {
    return null;
  }

  return touchCacheEntry(cacheRef.current, cacheKey, entry);
}

export function setTripCacheEntry(
  cacheRef: MutableRefObject<Map<string, TripCacheEntry>>,
  cacheKey: string,
  entry: TripCacheEntry,
): TripCacheEntry {
  const nextEntry = touchCacheEntry(cacheRef.current, cacheKey, entry);
  evictLeastRecentlyUsedScenario(cacheRef.current);
  return nextEntry;
}

export function getArcCacheEntry(
  cacheRef: MutableRefObject<Map<string, ArcCacheEntry>>,
  cacheKey: string,
): ArcCacheEntry | null {
  const entry = cacheRef.current.get(cacheKey) ?? null;
  if (!entry) {
    return null;
  }

  return touchCacheEntry(cacheRef.current, cacheKey, entry);
}

export function setArcCacheEntry(
  cacheRef: MutableRefObject<Map<string, ArcCacheEntry>>,
  cacheKey: string,
  entry: ArcCacheEntry,
): ArcCacheEntry {
  const nextEntry = touchCacheEntry(cacheRef.current, cacheKey, entry);
  evictLeastRecentlyUsedScenario(cacheRef.current);
  return nextEntry;
}

export function buildDatasetList(
  tripCacheEntry: TripCacheEntry | null,
  arcCacheEntry: ArcCacheEntry | null,
): DatasetDescriptor[] {
  return [
    ...(tripCacheEntry?.tripDatasets ?? []),
    ...(arcCacheEntry?.arcDatasets ?? []),
  ];
}
