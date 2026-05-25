// 這個檔案負責把資料同步流程串起來，讓地圖知道現在該查什麼、該顯示什麼。
import {useSql} from '@sqlrooms/duckdb';
import {useEffect, useMemo, type MutableRefObject} from 'react';
import {buildArcSourceQuery} from '../layers/odArcLayer/arcSql';
import {buildTripSourceQuery} from '../layers/tripsLayer/tripSql';
import {getDatasetPreset, getPresetRoomDataSources} from '../../constants/datasets';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../../lib/timeplayback';
import type {QueryTrajectoryRow} from '../../types';
import {useRoomStore} from '../../app/store';
import {
  buildScenarioCacheKey,
  getArcCacheEntry,
  getTripCacheEntry,
  type ArcCacheEntry,
  type TripCacheEntry,
} from './scenario/scenarioDataSyncHelpers';
import {
  buildPlaybackHistogramBinsFromTripRows,
} from './scenario/scenarioCacheBuilders';
import {useArcDataSync} from './scenario/useArcDataSync';
import {useKeplerDatasetSync} from './scenario/useKeplerDatasetSync';
import {useScenarioRunCompletion} from './scenario/useScenarioRunCompletion';
import {useScenarioSourceSync} from './scenario/useScenarioSourceSync';
import {useTripDataSync} from './scenario/useTripDataSync';
import type {ScenarioViewportState} from './scenario/useScenarioViewportBounds';

type ScenarioDataSyncProps = {
  mapId: string;
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
  viewportState: ScenarioViewportState;
  cacheRevision: number;
  onScenarioCacheUpdated: () => void;
};

export function ScenarioDataSync({
  mapId,
  tripCacheRef,
  arcCacheRef,
  viewportState,
  cacheRevision,
  onScenarioCacheUpdated,
}: ScenarioDataSyncProps) {
  const applied = useRoomStore((state) => state.moi.applied);
  const completeRun = useRoomStore((state) => state.moi.completeRun);
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const layerOpacity = useRoomStore((state) => state.moi.layerOpacity);
  const setPlaybackHistogramBins = useRoomStore((state) => state.moi.setPlaybackHistogramBins);
  const roomInitialized = useRoomStore((state) => state.room.initialized);
  const preset = getDatasetPreset(applied.datasetId);
  const {debouncedBounds, debouncedBoundsKey} = viewportState;

  const needsTrajectoryFlowmapSource = flowmapEnabled && preset.flowmapSourceType === 'trajectory';
  const needsTripSource = applied.layers.trips || applied.layers.heatmap || needsTrajectoryFlowmapSource;
  const needsArcSource = applied.layers.arc;
  const hasSelectedModes = applied.modes.length > 0;
  const scenarioCacheKey = useMemo(
    () => buildScenarioCacheKey(applied.datasetId, applied.modes, debouncedBoundsKey),
    [applied.datasetId, applied.modes, debouncedBoundsKey],
  );
  const cachedTripEntry = getTripCacheEntry(tripCacheRef, scenarioCacheKey);
  const cachedArcEntry = getArcCacheEntry(arcCacheRef, scenarioCacheKey);
  const activeSourceSpecs = useMemo(
    () => getPresetRoomDataSources(applied.datasetId),
    [applied.datasetId],
  );
  const playbackRangeSeconds = useMemo(
    () => millisecondsRangeToSeconds(PLAYBACK_DOMAIN),
    [],
  );
  const datasetSyncApplied = useMemo(
    () => ({...applied}),
    [
      applied.datasetId,
      applied.layers.arc,
      applied.layers.boundary,
      applied.layers.heatmap,
      applied.layers.trips,
      applied.modes,
      applied.requestId,
    ],
  );

  const {activeSourceError, activeSourcesReady} = useScenarioSourceSync({
    datasetId: applied.datasetId,
    requestId: applied.requestId,
    activeSourceSpecs,
    roomInitialized,
    completeRun,
  });

  const tripResult = useSql<QueryTrajectoryRow>({
    query: buildTripSourceQuery(applied),
    enabled: activeSourcesReady && hasSelectedModes && !cachedTripEntry,
  });

  const arcResult = useSql<QueryTrajectoryRow>({
    query: buildArcSourceQuery(applied),
    enabled: activeSourcesReady && hasSelectedModes && !cachedArcEntry,
  });

  useTripDataSync({
    activeSourcesReady,
    applied,
    hasSelectedModes,
    playbackRangeSeconds,
    scenarioCacheKey,
    tripCacheRef,
    tripResult,
    viewportBounds: debouncedBounds,
    onScenarioCacheUpdated,
  });

  useArcDataSync({
    activeSourcesReady,
    applied,
    hasSelectedModes,
    scenarioCacheKey,
    arcCacheRef,
    arcResult,
    viewportBounds: debouncedBounds,
    onScenarioCacheUpdated,
  });

  useKeplerDatasetSync({
    activeSourcesReady,
    applied: datasetSyncApplied,
    arcCacheRef,
    tripCacheRef,
    hasSelectedModes,
    layerOpacity,
    mapId,
    needsArcSource,
    needsTripSource,
    roomInitialized,
    scenarioCacheKey,
    cacheRevision,
  });

  useScenarioRunCompletion({
    activeSourceError,
    activeSourcesReady,
    applied,
    arcCacheRef,
    arcResult,
    completeRun,
    hasSelectedModes,
    mapId,
    needsArcSource,
    needsTripSource,
    roomInitialized,
    scenarioCacheKey,
    tripCacheRef,
    tripResult,
    cacheRevision,
  });

  useEffect(() => {
    if (!activeSourcesReady || !hasSelectedModes) {
      setPlaybackHistogramBins([]);
      return;
    }

    if (cachedTripEntry) {
      setPlaybackHistogramBins(
        buildPlaybackHistogramBinsFromTripRows(cachedTripEntry.trajectoryRows, applied.modes),
      );
      return;
    }

    setPlaybackHistogramBins([]);
  }, [
    activeSourcesReady,
    applied.modes,
    cachedTripEntry,
    hasSelectedModes,
    setPlaybackHistogramBins,
  ]);

  return null;
}
