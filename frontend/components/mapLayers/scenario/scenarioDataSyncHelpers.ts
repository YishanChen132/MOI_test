// 這個檔案負責放地圖資料同步會共用到的快取型別、空資料和小工具函式。
import type * as arrow from 'apache-arrow';
import type {DatasetPresetId} from '../../../constants/datasets';
import type {DatasetDescriptor} from '../../../lib/kepler';
import type {BenchmarkCounts, QueryTrajectoryRow} from '../../../types';

export type TripCacheEntry = {
  arrowTable: arrow.Table | null;
  trajectoryRows: QueryTrajectoryRow[];
  tripDatasets: DatasetDescriptor[];
  tripSegments: number;
  heatmapPoints: number;
};

export type ArcCacheEntry = {
  arcDatasets: DatasetDescriptor[];
  arcRows: number;
};

export const EMPTY_COUNTS: BenchmarkCounts = {
  tripSegments: 0,
  arcRows: 0,
  heatmapPoints: 0,
};

export function buildScenarioCacheKey(datasetId: DatasetPresetId, modes: readonly number[]): string {
  return `${datasetId}::${modes.join(',')}`;
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
