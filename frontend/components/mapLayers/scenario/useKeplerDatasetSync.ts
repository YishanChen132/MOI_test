// 這個檔案負責把需要進 Kepler 的 scenario dataset 同步到地圖，包含 trip 與 arc dataset。
import {useEffect, type MutableRefObject} from 'react';
import {roomStore} from '../../../app/store';
import {replaceMapDatasets} from '../../../services/kepler';
import type {
  AppliedScenario,
  LayerOpacity,
} from '../../../types';
import {
  buildDatasetList,
  getArcCacheEntry,
  getTripCacheEntry,
  type ArcCacheEntry,
  type TripCacheEntry,
} from './scenarioDataSyncHelpers';

type UseKeplerDatasetSyncArgs = {
  activeSourcesReady: boolean;
  applied: AppliedScenario;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>;
  hasSelectedModes: boolean;
  layerOpacity: LayerOpacity;
  mapId: string;
  needsArcSource: boolean;
  needsTripSource: boolean;
  roomInitialized: boolean;
  scenarioCacheKey: string;
  cacheRevision: number;
};

export function useKeplerDatasetSync({
  activeSourcesReady,
  applied,
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
}: UseKeplerDatasetSyncArgs) {
  useEffect(() => {
    if (!roomInitialized || !mapId) {
      return;
    }

    if (!hasSelectedModes) {
      replaceMapDatasets(roomStore, mapId, applied, [], layerOpacity);
      return;
    }

    const tripCacheEntry = getTripCacheEntry(tripCacheRef, scenarioCacheKey);
    const arcCacheEntry = getArcCacheEntry(arcCacheRef, scenarioCacheKey);

    replaceMapDatasets(
      roomStore,
      mapId,
      applied,
      activeSourcesReady && (!needsTripSource || tripCacheEntry) && (!needsArcSource || arcCacheEntry)
        ? buildDatasetList(tripCacheEntry, arcCacheEntry)
        : [],
      layerOpacity,
    );
  }, [
    activeSourcesReady,
    applied,
    applied.layers.arc,
    applied.layers.heatmap,
    applied.layers.trips,
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
  ]);
}
