// 這個檔案負責把資料同步流程串起來，讓地圖知道現在該查什麼、該顯示什麼。
import {useSql} from '@sqlrooms/duckdb';
import {useMemo, type MutableRefObject} from 'react';
import {buildArcSourceQuery} from '../layers/odArcLayer/arcSql';
import {buildTripSourceQuery} from '../layers/tripsLayer/tripSql';
import {getPresetRoomDataSources} from '../../constants/datasets';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../../lib/timeplayback';
import type {QueryTrajectoryRow} from '../../types';
import {useRoomStore} from '../../app/store';
import {
  buildScenarioCacheKey,
  type ArcCacheEntry,
  type TripCacheEntry,
} from './scenario/scenarioDataSyncHelpers';
import {useScenarioMapSync} from './scenario/useScenarioMapSync';
import {useScenarioSourceSync} from './scenario/useScenarioSourceSync';

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
  const layerOpacity = useRoomStore((state) => state.moi.layerOpacity);
  const roomInitialized = useRoomStore((state) => state.room.initialized);

  const needsTripSource = applied.layers.trips || applied.layers.heatmap;
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

  useScenarioMapSync({
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
  });

  return null;
}
