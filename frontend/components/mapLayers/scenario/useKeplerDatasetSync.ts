// 這個檔案負責把需要進 Kepler 的 scenario dataset 同步到地圖，目前只處理 arc dataset。
import {useEffect, type MutableRefObject} from 'react';
import {roomStore} from '../../../app/store';
import {replaceMapDatasets} from '../../../services/kepler';
import type {
  AppliedScenario,
  LayerOpacity,
} from '../../../types';
import {
  buildDatasetList,
  type ArcCacheEntry,
} from './scenarioDataSyncHelpers';

type UseKeplerDatasetSyncArgs = {
  activeSourcesReady: boolean;
  applied: AppliedScenario;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
  hasSelectedModes: boolean;
  layerOpacity: LayerOpacity;
  mapId: string;
  needsArcSource: boolean;
  roomInitialized: boolean;
  scenarioCacheKey: string;
};

export function useKeplerDatasetSync({
  activeSourcesReady,
  applied,
  arcCacheRef,
  hasSelectedModes,
  layerOpacity,
  mapId,
  needsArcSource,
  roomInitialized,
  scenarioCacheKey,
}: UseKeplerDatasetSyncArgs) {
  useEffect(() => {
    if (!roomInitialized || !mapId) {
      return;
    }

    if (!hasSelectedModes) {
      replaceMapDatasets(roomStore, mapId, applied, [], layerOpacity);
      return;
    }

    const arcCacheEntry = arcCacheRef.current.get(scenarioCacheKey) ?? null;

    replaceMapDatasets(
      roomStore,
      mapId,
      applied,
      activeSourcesReady && (!needsArcSource || arcCacheEntry)
        ? buildDatasetList(arcCacheEntry)
        : [],
      layerOpacity,
    );
  }, [
    activeSourcesReady,
    applied,
    applied.layers.arc,
    arcCacheRef,
    hasSelectedModes,
    layerOpacity,
    mapId,
    needsArcSource,
    roomInitialized,
    scenarioCacheKey,
  ]);
}
