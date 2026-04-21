// 這個檔案負責把 arc query 結果寫入 arc cache，供 custom ArcLayer 與 Kepler dataset 使用。
import {useEffect, type MutableRefObject} from 'react';
import type {AppliedScenario} from '../../../types';
import {buildArcCacheEntry} from './scenarioCacheBuilders';
import type {ArcCacheEntry} from './scenarioDataSyncHelpers';
import type {TrajectoryQueryResult} from './scenarioQueryTypes';

type UseArcDataSyncArgs = {
  activeSourcesReady: boolean;
  applied: AppliedScenario;
  hasSelectedModes: boolean;
  needsArcSource: boolean;
  scenarioCacheKey: string;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
  arcResult: TrajectoryQueryResult;
};

export function useArcDataSync({
  activeSourcesReady,
  applied,
  hasSelectedModes,
  needsArcSource,
  scenarioCacheKey,
  arcCacheRef,
  arcResult,
}: UseArcDataSyncArgs) {
  const cachedArcEntry = arcCacheRef.current.get(scenarioCacheKey) ?? null;

  useEffect(() => {
    if (
      !activeSourcesReady ||
      !hasSelectedModes ||
      !needsArcSource ||
      cachedArcEntry ||
      !arcResult.data
    ) {
      return;
    }

    arcCacheRef.current.set(
      scenarioCacheKey,
      buildArcCacheEntry(
        arcResult.data.rows(),
        applied.modes,
      ),
    );
  }, [
    activeSourcesReady,
    applied.modes,
    arcCacheRef,
    arcResult.data,
    cachedArcEntry,
    hasSelectedModes,
    needsArcSource,
    scenarioCacheKey,
  ]);
}
