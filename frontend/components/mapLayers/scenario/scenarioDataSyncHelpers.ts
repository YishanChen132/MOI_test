// 這個檔案負責放 ScenarioDataSync 會共用到的快取型別、空資料和小工具函式。
import type {DatasetPresetId} from '../../../constants/datasets';
import type {DatasetDescriptor} from '../../../lib/kepler';
import type {BenchmarkCounts} from '../../../types';

export type TripCacheEntry = {
  tripDatasets: DatasetDescriptor[];
  heatmapDataset: DatasetDescriptor | null;
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
    tripCacheEntry?.heatmapDataset ?? null,
  ].filter((dataset): dataset is DatasetDescriptor => dataset !== null);
}
