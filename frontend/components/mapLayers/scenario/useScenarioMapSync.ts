// 這個檔案負責把查回來的資料轉成 kepler dataset，並在圖層或透明度改變時同步更新地圖。
import {useEffect, useRef, type MutableRefObject} from 'react';
import {buildArcDatasets} from '../../layers/odArcLayer/arcKepler';
import {flattenArcRows} from '../../layers/odArcLayer/arcTransform';
import {buildTripDatasets} from '../../layers/tripsLayer/tripKepler';
import {segmentTripRows} from '../../layers/tripsLayer/tripTransform';
import {
  buildHeatmapDataset,
  replaceMapDatasets,
} from '../../../lib/kepler';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../../../lib/timeplayback';
import {flattenHeatmapRows} from '../../../lib/transforms';
import type {
  AppliedScenario,
  BenchmarkCounts,
  LayerOpacity,
  QueryTrajectoryRow,
  TimeRangeSeconds,
} from '../../../types';
import {roomStore} from '../../../app/store';
import {
  buildDatasetList,
  EMPTY_COUNTS,
  type ArcCacheEntry,
  type TripCacheEntry,
} from './scenarioDataSyncHelpers';

type TrajectoryQueryResult = {
  data?: {rows: () => Iterable<QueryTrajectoryRow>} | null;
  error?: Error | null;
  isLoading: boolean;
};

type UseScenarioMapSyncArgs = {
  mapId: string;
  applied: AppliedScenario;
  completeRun: (
    requestId: number,
    counts: BenchmarkCounts,
    status: 'success' | 'error',
    errorMessage?: string,
  ) => void;
  layerOpacity: LayerOpacity;
  roomInitialized: boolean;
  activeSourceError?: string;
  activeSourcesReady: boolean;
  hasSelectedModes: boolean;
  needsTripSource: boolean;
  needsArcSource: boolean;
  playbackRangeSeconds: TimeRangeSeconds;
  scenarioCacheKey: string;
  tripResult: TrajectoryQueryResult;
  arcResult: TrajectoryQueryResult;
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
};

export function useScenarioMapSync({
  mapId,
  applied,
  completeRun,
  layerOpacity,
  roomInitialized,
  activeSourceError,
  activeSourcesReady,
  hasSelectedModes,
  needsTripSource,
  needsArcSource,
  playbackRangeSeconds,
  scenarioCacheKey,
  tripResult,
  arcResult,
  tripCacheRef,
  arcCacheRef,
}: UseScenarioMapSyncArgs) {
  const processedRequestIdRef = useRef<number>(0);
  const cachedTripEntry = tripCacheRef.current.get(scenarioCacheKey) ?? null;
  const cachedArcEntry = arcCacheRef.current.get(scenarioCacheKey) ?? null;

  useEffect(() => {
    if (!roomInitialized || !mapId) {
      return;
    }

    if (processedRequestIdRef.current === applied.requestId) {
      return;
    }

    if (activeSourceError) {
      processedRequestIdRef.current = applied.requestId;
      completeRun(applied.requestId, EMPTY_COUNTS, 'error', activeSourceError);
      return;
    }

    if (!activeSourcesReady) {
      return;
    }

    if (!hasSelectedModes) {
      replaceMapDatasets(roomStore, mapId, applied, [], layerOpacity);
      processedRequestIdRef.current = applied.requestId;
      completeRun(applied.requestId, EMPTY_COUNTS, 'success');
      return;
    }

    const waitingOnTrip =
      needsTripSource &&
      !cachedTripEntry &&
      (tripResult.isLoading || (!tripResult.data && !tripResult.error));
    const waitingOnArc =
      needsArcSource &&
      !cachedArcEntry &&
      (arcResult.isLoading || (!arcResult.data && !arcResult.error));

    if (waitingOnTrip || waitingOnArc) {
      return;
    }

    const errors = [
      tripResult.error ? `Trip source query failed: ${tripResult.error.message}` : null,
      arcResult.error ? `Arc source query failed: ${arcResult.error.message}` : null,
    ].filter((message): message is string => Boolean(message));

    if (errors.length > 0) {
      processedRequestIdRef.current = applied.requestId;
      completeRun(applied.requestId, EMPTY_COUNTS, 'error', errors.join(' '));
      return;
    }

    let nextTripEntry = cachedTripEntry;
    let nextArcEntry = cachedArcEntry;

    if (!nextTripEntry && tripResult.data) {
      const tripRows = tripResult.data.rows();
      const tripFeatures = segmentTripRows(tripRows, applied.modes, playbackRangeSeconds);
      const heatmapRows = flattenHeatmapRows(tripRows, applied.modes, playbackRangeSeconds);

      nextTripEntry = {
        tripDatasets: buildTripDatasets(tripFeatures),
        heatmapDataset: buildHeatmapDataset(heatmapRows),
        tripSegments: tripFeatures.features.length,
        heatmapPoints: heatmapRows.length,
      };
      tripCacheRef.current.set(scenarioCacheKey, nextTripEntry);
    }

    if (!nextArcEntry && arcResult.data) {
      const arcRows = flattenArcRows(
        arcResult.data.rows(),
        applied.modes,
        millisecondsRangeToSeconds(PLAYBACK_DOMAIN),
      );

      nextArcEntry = {
        arcDatasets: buildArcDatasets(arcRows),
        arcRows: arcRows.length,
      };
      arcCacheRef.current.set(scenarioCacheKey, nextArcEntry);
    }

    if (roomStore.getState().moi.applied.requestId !== applied.requestId) {
      return;
    }

    replaceMapDatasets(
      roomStore,
      mapId,
      applied,
      buildDatasetList(nextTripEntry, nextArcEntry),
      layerOpacity,
    );

    const counts: BenchmarkCounts = {
      tripSegments: applied.layers.trips ? nextTripEntry?.tripSegments ?? 0 : 0,
      arcRows: applied.layers.arc ? nextArcEntry?.arcRows ?? 0 : 0,
      heatmapPoints: applied.layers.heatmap ? nextTripEntry?.heatmapPoints ?? 0 : 0,
    };

    processedRequestIdRef.current = applied.requestId;
    completeRun(applied.requestId, counts, 'success');
  }, [
    activeSourceError,
    activeSourcesReady,
    applied,
    applied.requestId,
    arcResult.data,
    arcResult.error,
    arcResult.isLoading,
    cachedArcEntry,
    cachedTripEntry,
    completeRun,
    hasSelectedModes,
    layerOpacity,
    mapId,
    needsArcSource,
    needsTripSource,
    playbackRangeSeconds,
    roomInitialized,
    scenarioCacheKey,
    tripResult.data,
    tripResult.error,
    tripResult.isLoading,
    arcCacheRef,
    tripCacheRef,
  ]);

  useEffect(() => {
    if (!roomInitialized || !mapId || !hasSelectedModes) {
      return;
    }

    const nextTripEntry = tripCacheRef.current.get(scenarioCacheKey) ?? null;
    const nextArcEntry = arcCacheRef.current.get(scenarioCacheKey) ?? null;
    const missingVisibleTripData = needsTripSource && !nextTripEntry;
    const missingVisibleArcData = needsArcSource && !nextArcEntry;

    if (missingVisibleTripData || missingVisibleArcData) {
      return;
    }

    replaceMapDatasets(
      roomStore,
      mapId,
      roomStore.getState().moi.applied,
      buildDatasetList(nextTripEntry, nextArcEntry),
      layerOpacity,
    );
  }, [
    applied.layers.arc,
    applied.layers.heatmap,
    applied.layers.trips,
    arcCacheRef,
    hasSelectedModes,
    layerOpacity,
    mapId,
    needsArcSource,
    needsTripSource,
    roomInitialized,
    scenarioCacheKey,
    tripCacheRef,
  ]);
}
