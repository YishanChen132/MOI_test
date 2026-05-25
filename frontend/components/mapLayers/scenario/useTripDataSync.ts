// 這個檔案負責把 trip query 結果寫入 trip cache，供 custom TripsLayer 與 heatmap 使用。
import {useEffect, type MutableRefObject} from 'react';
import type {
  AppliedScenario,
  MapViewportBounds,
  TimeRangeSeconds,
} from '../../../types';
import {
  buildTripCacheEntry,
  filterTrajectoryRowsByBounds,
} from './scenarioCacheBuilders';
import {
  getTripCacheEntry,
  setTripCacheEntry,
  type TripCacheEntry,
} from './scenarioDataSyncHelpers';
import type {TrajectoryQueryResult} from './scenarioQueryTypes';

type UseTripDataSyncArgs = {
  activeSourcesReady: boolean;
  applied: AppliedScenario;
  hasSelectedModes: boolean;
  playbackRangeSeconds: TimeRangeSeconds;
  scenarioCacheKey: string;
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>;
  tripResult: TrajectoryQueryResult;
  viewportBounds?: MapViewportBounds | null;
  onScenarioCacheUpdated: () => void;
};

export function useTripDataSync({
  activeSourcesReady,
  applied,
  hasSelectedModes,
  playbackRangeSeconds,
  scenarioCacheKey,
  tripCacheRef,
  tripResult,
  viewportBounds,
  onScenarioCacheUpdated,
}: UseTripDataSyncArgs) {
  const cachedTripEntry = getTripCacheEntry(tripCacheRef, scenarioCacheKey);

  useEffect(() => {
    if (
      !activeSourcesReady ||
      !hasSelectedModes ||
      cachedTripEntry ||
      !tripResult.data
    ) {
      return;
    }

    const tripRows = filterTrajectoryRowsByBounds(tripResult.data.rows(), viewportBounds);
    setTripCacheEntry(
      tripCacheRef,
      scenarioCacheKey,
      buildTripCacheEntry(
        tripRows,
        playbackRangeSeconds,
        applied.modes,
        tripResult.data.arrowTable ?? null,
      ),
    );
    onScenarioCacheUpdated();
  }, [
    activeSourcesReady,
    applied.modes,
    cachedTripEntry,
    hasSelectedModes,
    playbackRangeSeconds,
    scenarioCacheKey,
    tripCacheRef,
    tripResult.data,
    viewportBounds,
    onScenarioCacheUpdated,
  ]);
}
