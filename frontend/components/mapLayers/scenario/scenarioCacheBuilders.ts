// 這個檔案負責把 SQL query 結果整理成地圖同步流程可重用的 scenario cache entries。
import type * as arrow from 'apache-arrow';
import {buildArcDatasets} from '../../layers/odArcLayer/arcKepler';
import {flattenArcRows} from '../../layers/odArcLayer/arcTransform';
import {countTripLayerSegments} from '../../layers/tripsLayer/tripTransform';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../../../lib/timeplayback';
import {
  getTrajectoryPointCount,
  normalizeNumericArray,
} from '../../../lib/transforms';
import type {
  AppliedScenario,
  ArcDatum,
  BenchmarkCounts,
  PlaybackHistogramBin,
  QueryTrajectoryRow,
  TimeRangeMilliseconds,
  TimeRangeSeconds,
} from '../../../types';
import type {
  ArcCacheEntry,
  TripCacheEntry,
} from './scenarioDataSyncHelpers';

const PLAYBACK_HISTOGRAM_BUCKET_COUNT = 48;

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

export function buildPlaybackHistogramBinsFromTripRows(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
): PlaybackHistogramBin[] {
  const selectedModeSet = new Set(selectedModes);
  const samples: number[] = [];

  for (const row of rows) {
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      const timestampSeconds = timestamps[pointIndex];
      const mode = modes[pointIndex];

      if (!selectedModeSet.has(mode)) {
        continue;
      }

      samples.push(timestampSeconds * 1_000);
    }
  }

  return buildPlaybackHistogramBins(samples);
}

export function buildPlaybackHistogramBinsFromArcRows(
  rows: readonly ArcDatum[],
): PlaybackHistogramBin[] {
  return buildPlaybackHistogramBins(rows.map((row) => row.timestamp * 1_000));
}

export function buildPlaybackHistogramBins(
  samplesMs: readonly number[],
  domain: TimeRangeMilliseconds = PLAYBACK_DOMAIN,
  bucketCount = PLAYBACK_HISTOGRAM_BUCKET_COUNT,
): PlaybackHistogramBin[] {
  const [domainStart, domainEnd] = domain;
  const safeBucketCount = Math.max(1, Math.floor(bucketCount));
  const domainSpan = Math.max(1, domainEnd - domainStart);
  const bucketWidth = domainSpan / safeBucketCount;
  const counts = Array.from({length: safeBucketCount}, () => 0);

  for (const sampleMs of samplesMs) {
    if (!Number.isFinite(sampleMs) || sampleMs < domainStart || sampleMs > domainEnd) {
      continue;
    }

    const rawIndex = Math.floor((sampleMs - domainStart) / bucketWidth);
    const bucketIndex = Math.min(safeBucketCount - 1, Math.max(0, rawIndex));
    counts[bucketIndex] += 1;
  }

  return counts.map((count, index) => ({
    startMs: Math.round(domainStart + index * bucketWidth),
    endMs: Math.round(
      index === safeBucketCount - 1
        ? domainEnd
        : domainStart + (index + 1) * bucketWidth,
    ),
    count,
  }));
}
