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
  type ArcCacheEntry,
  type TripCacheEntry,
} from './scenario/scenarioDataSyncHelpers';
import {
  buildPlaybackHistogramBinsFromArcRows,
  buildPlaybackHistogramBinsFromTripRows,
} from './scenario/scenarioCacheBuilders';
import {useArcDataSync} from './scenario/useArcDataSync';
import {useKeplerDatasetSync} from './scenario/useKeplerDatasetSync';
import {useScenarioRunCompletion} from './scenario/useScenarioRunCompletion';
import {useScenarioSourceSync} from './scenario/useScenarioSourceSync';
import {useTripDataSync} from './scenario/useTripDataSync';

type ScenarioDataSyncProps = {
  mapId: string;
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
};

export function ScenarioDataSync({
  mapId,
  tripCacheRef,
  arcCacheRef,
}: ScenarioDataSyncProps) {
  const applied = useRoomStore((state) => state.moi.applied);
  const completeRun = useRoomStore((state) => state.moi.completeRun);
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const layerOpacity = useRoomStore((state) => state.moi.layerOpacity);
  const setPlaybackHistogramBins = useRoomStore((state) => state.moi.setPlaybackHistogramBins);
  const roomInitialized = useRoomStore((state) => state.room.initialized);
  const preset = getDatasetPreset(applied.datasetId);

  const needsTrajectoryFlowmapSource = flowmapEnabled && preset.flowmapSourceType === 'trajectory';
  const needsTripSource = applied.layers.trips || applied.layers.heatmap || needsTrajectoryFlowmapSource;
  const needsArcSource = applied.layers.arc;
  const hasSelectedModes = applied.modes.length > 0;
  const scenarioCacheKey = useMemo(
    () => buildScenarioCacheKey(applied.datasetId, applied.modes),
    [applied.datasetId, applied.modes],
  );
  const cachedTripEntry = tripCacheRef.current.get(scenarioCacheKey) ?? null;
  const cachedArcEntry = arcCacheRef.current.get(scenarioCacheKey) ?? null;
  const activeSourceSpecs = useMemo(
    () => getPresetRoomDataSources(applied.datasetId),
    [applied.datasetId],
  );
  const playbackRangeSeconds = useMemo(
    () => millisecondsRangeToSeconds(PLAYBACK_DOMAIN),
    [],
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
    enabled: activeSourcesReady && needsTripSource && hasSelectedModes && !cachedTripEntry,
  });

  const arcResult = useSql<QueryTrajectoryRow>({
    query: buildArcSourceQuery(applied),
    enabled: activeSourcesReady && needsArcSource && hasSelectedModes && !cachedArcEntry,
  });

  useTripDataSync({
    activeSourcesReady,
    applied,
    hasSelectedModes,
    needsTripSource,
    playbackRangeSeconds,
    scenarioCacheKey,
    tripCacheRef,
    tripResult,
  });

  useArcDataSync({
    activeSourcesReady,
    applied,
    hasSelectedModes,
    needsArcSource,
    scenarioCacheKey,
    arcCacheRef,
    arcResult,
  });

  useKeplerDatasetSync({
    activeSourcesReady,
    applied,
    arcCacheRef,
    hasSelectedModes,
    layerOpacity,
    mapId,
    needsArcSource,
    roomInitialized,
    scenarioCacheKey,
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
  });

  useEffect(() => {
    if (!activeSourcesReady || !hasSelectedModes) {
      setPlaybackHistogramBins([]);
      return;
    }

    if (applied.layers.arc && cachedArcEntry) {
      setPlaybackHistogramBins(buildPlaybackHistogramBinsFromArcRows(cachedArcEntry.arcRows));
      return;
    }

    if ((applied.layers.trips || applied.layers.heatmap) && cachedTripEntry) {
      setPlaybackHistogramBins(
        buildPlaybackHistogramBinsFromTripRows(cachedTripEntry.trajectoryRows, applied.modes),
      );
      return;
    }

    if (cachedArcEntry) {
      setPlaybackHistogramBins(buildPlaybackHistogramBinsFromArcRows(cachedArcEntry.arcRows));
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
    applied.layers.arc,
    applied.layers.heatmap,
    applied.layers.trips,
    applied.modes,
    cachedArcEntry,
    cachedTripEntry,
    hasSelectedModes,
    setPlaybackHistogramBins,
  ]);

  return null;
}
