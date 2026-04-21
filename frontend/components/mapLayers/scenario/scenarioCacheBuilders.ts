// 這個檔案負責把 SQL query 結果整理成地圖同步流程可重用的 scenario cache entries。
import type * as arrow from 'apache-arrow';
import {buildArcDatasets} from '../../layers/odArcLayer/arcKepler';
import {flattenArcRows} from '../../layers/odArcLayer/arcTransform';
import {countTripLayerSegments} from '../../layers/tripsLayer/tripTransform';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../../../lib/timeplayback';
import type {
  AppliedScenario,
  BenchmarkCounts,
  QueryTrajectoryRow,
  TimeRangeSeconds,
} from '../../../types';
import type {
  ArcCacheEntry,
  TripCacheEntry,
} from './scenarioDataSyncHelpers';

export function buildTripCacheEntry(
  tripRows: QueryTrajectoryRow[],
  playbackRangeSeconds: TimeRangeSeconds,
  selectedModes: readonly number[],
  arrowTable: arrow.Table | null,
): TripCacheEntry {
  return {
    arrowTable,
    trajectoryRows: tripRows,
    tripSegments: countTripLayerSegments(tripRows, selectedModes, playbackRangeSeconds),
    heatmapPoints: tripRows.length,
  };
}

export function buildArcCacheEntry(
  arcRowsSource: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
): ArcCacheEntry {
  const arcRows = flattenArcRows(
    arcRowsSource,
    selectedModes,
    millisecondsRangeToSeconds(PLAYBACK_DOMAIN),
  );

  return {
    arcDatasets: buildArcDatasets(arcRows),
    arcRows,
  };
}

export function buildBenchmarkCounts(
  applied: AppliedScenario,
  tripCacheEntry: TripCacheEntry | null,
  arcCacheEntry: ArcCacheEntry | null,
): BenchmarkCounts {
  return {
    tripSegments: applied.layers.trips ? tripCacheEntry?.tripSegments ?? 0 : 0,
    arcRows: applied.layers.arc ? arcCacheEntry?.arcRows.length ?? 0 : 0,
    heatmapPoints: applied.layers.heatmap ? tripCacheEntry?.heatmapPoints ?? 0 : 0,
  };
}
