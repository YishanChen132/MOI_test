// 這個檔案負責放地圖資料同步會共用到的快取型別、空資料和小工具函式。
import type * as arrow from 'apache-arrow';
import type {MutableRefObject} from 'react';
import type {DatasetPresetId} from '../../../constants/datasets';
import type {DatasetDescriptor} from '../../../services/kepler';
import type {ArcDatum, BenchmarkCounts, QueryTrajectoryRow} from '../../../types';

export type TripCacheEntry = {
  arrowTable: arrow.Table | null;
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

export function buildScenarioCacheKey(datasetId: DatasetPresetId, modes: readonly number[]): string {
  return `${datasetId}::${modes.join(',')}`;
}

export function buildDatasetList(
  arcCacheEntry: ArcCacheEntry | null,
): DatasetDescriptor[] {
  return [
    ...(arcCacheEntry?.arcDatasets ?? []),
  ];
}
