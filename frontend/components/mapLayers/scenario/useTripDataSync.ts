// 這個檔案負責把 trip query 結果寫入 trip cache，供 custom TripsLayer 與 heatmap 使用。
import {useEffect, type MutableRefObject} from 'react';
import type {
  AppliedScenario,
  TimeRangeSeconds,
} from '../../../types';
import {buildTripCacheEntry} from './scenarioCacheBuilders';
import type {TripCacheEntry} from './scenarioDataSyncHelpers';
import type {TrajectoryQueryResult} from './scenarioQueryTypes';

type UseTripDataSyncArgs = {
  activeSourcesReady: boolean;
  applied: AppliedScenario;
  hasSelectedModes: boolean;
  needsTripSource: boolean;
  playbackRangeSeconds: TimeRangeSeconds;
  scenarioCacheKey: string;
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>;
  tripResult: TrajectoryQueryResult;
};

export function useTripDataSync({
  activeSourcesReady,
  applied,
  hasSelectedModes,
  needsTripSource,
  playbackRangeSeconds,
  scenarioCacheKey,
  tripCacheRef,
  tripResult,
}: UseTripDataSyncArgs) {
  const cachedTripEntry = tripCacheRef.current.get(scenarioCacheKey) ?? null;

  useEffect(() => {
    if (
      !activeSourcesReady ||
      !hasSelectedModes ||
      !needsTripSource ||
      cachedTripEntry ||
      !tripResult.data
    ) {
      return;
    }

    const tripRows = Array.from(tripResult.data.rows());
    tripCacheRef.current.set(
      scenarioCacheKey,
      buildTripCacheEntry(
        tripRows,
        playbackRangeSeconds,
        applied.modes,
        tripResult.data.arrowTable ?? null,
      ),
    );
  }, [
    activeSourcesReady,
    applied.modes,
    cachedTripEntry,
    hasSelectedModes,
    needsTripSource,
    playbackRangeSeconds,
    scenarioCacheKey,
    tripCacheRef,
    tripResult.data,
  ]);
}
