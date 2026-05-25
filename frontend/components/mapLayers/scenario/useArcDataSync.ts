// 這個檔案負責把 arc query 結果寫入 arc cache，供 custom ArcLayer 與 Kepler dataset 使用。
import {useEffect, type MutableRefObject} from 'react';
import type {AppliedScenario, MapViewportBounds} from '../../../types';
import {
  buildArcCacheEntry,
  filterTrajectoryRowsByBounds,
} from './scenarioCacheBuilders';
import {
  getArcCacheEntry,
  setArcCacheEntry,
  type ArcCacheEntry,
} from './scenarioDataSyncHelpers';
import type {TrajectoryQueryResult} from './scenarioQueryTypes';

type UseArcDataSyncArgs = {
  activeSourcesReady: boolean;
  applied: AppliedScenario;
  hasSelectedModes: boolean;
  scenarioCacheKey: string;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
  arcResult: TrajectoryQueryResult;
  viewportBounds?: MapViewportBounds | null;
  onScenarioCacheUpdated: () => void;
};

export function useArcDataSync({
  activeSourcesReady,
  applied,
  hasSelectedModes,
  scenarioCacheKey,
  arcCacheRef,
  arcResult,
  viewportBounds,
  onScenarioCacheUpdated,
}: UseArcDataSyncArgs) {
  const cachedArcEntry = getArcCacheEntry(arcCacheRef, scenarioCacheKey);

  useEffect(() => {
    if (
      !activeSourcesReady ||
      !hasSelectedModes ||
      cachedArcEntry ||
      !arcResult.data
    ) {
      return;
    }

    const arcRows = filterTrajectoryRowsByBounds(arcResult.data.rows(), viewportBounds);
    setArcCacheEntry(
      arcCacheRef,
      scenarioCacheKey,
      buildArcCacheEntry(
        arcRows,
        applied.modes,
      ),
    );
    onScenarioCacheUpdated();
  }, [
    activeSourcesReady,
    applied.modes,
    arcCacheRef,
    arcResult.data,
    cachedArcEntry,
    hasSelectedModes,
    scenarioCacheKey,
    viewportBounds,
    onScenarioCacheUpdated,
  ]);
}
