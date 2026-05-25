// 這個檔案負責等待 trip/arc cache 準備完成後回報 scenario run 狀態與 benchmark counts。
import {useEffect, useRef, type MutableRefObject} from 'react';
import {roomStore} from '../../../app/store';
import type {
  AppliedScenario,
  BenchmarkCounts,
} from '../../../types';
import {
  buildBenchmarkCounts,
} from './scenarioCacheBuilders';
import {
  EMPTY_COUNTS,
  getArcCacheEntry,
  getTripCacheEntry,
  type ArcCacheEntry,
  type TripCacheEntry,
} from './scenarioDataSyncHelpers';
import type {TrajectoryQueryResult} from './scenarioQueryTypes';

type UseScenarioRunCompletionArgs = {
  activeSourceError?: string;
  activeSourcesReady: boolean;
  applied: AppliedScenario;
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>;
  arcResult: TrajectoryQueryResult;
  completeRun: (
    requestId: number,
    counts: BenchmarkCounts,
    status: 'success' | 'error',
    errorMessage?: string,
  ) => void;
  hasSelectedModes: boolean;
  mapId: string;
  needsArcSource: boolean;
  needsTripSource: boolean;
  roomInitialized: boolean;
  scenarioCacheKey: string;
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>;
  tripResult: TrajectoryQueryResult;
  cacheRevision: number;
};

export function useScenarioRunCompletion({
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
}: UseScenarioRunCompletionArgs) {
  const processedRequestIdRef = useRef<number>(0);

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
      processedRequestIdRef.current = applied.requestId;
      completeRun(applied.requestId, EMPTY_COUNTS, 'success');
      return;
    }

    const tripCacheEntry = getTripCacheEntry(tripCacheRef, scenarioCacheKey);
    const arcCacheEntry = getArcCacheEntry(arcCacheRef, scenarioCacheKey);
    const waitingOnTrip =
      needsTripSource &&
      !tripCacheEntry &&
      (tripResult.isLoading || (!tripResult.data && !tripResult.error));
    const waitingOnArc =
      needsArcSource &&
      !arcCacheEntry &&
      (arcResult.isLoading || (!arcResult.data && !arcResult.error));

    if (waitingOnTrip || waitingOnArc) {
      return;
    }

    const errors = [
      needsTripSource && tripResult.error ? `Trip source query failed: ${tripResult.error.message}` : null,
      needsArcSource && arcResult.error ? `Arc source query failed: ${arcResult.error.message}` : null,
    ].filter((message): message is string => Boolean(message));

    if (errors.length > 0) {
      processedRequestIdRef.current = applied.requestId;
      completeRun(applied.requestId, EMPTY_COUNTS, 'error', errors.join(' '));
      return;
    }

    if ((needsTripSource && !tripCacheEntry) || (needsArcSource && !arcCacheEntry)) {
      return;
    }

    if (roomStore.getState().moi.applied.requestId !== applied.requestId) {
      return;
    }

    processedRequestIdRef.current = applied.requestId;
    completeRun(applied.requestId, buildBenchmarkCounts(applied, tripCacheEntry, arcCacheEntry), 'success');
  }, [
    activeSourceError,
    activeSourcesReady,
    applied,
    applied.requestId,
    arcCacheRef,
    arcResult.data,
    arcResult.error,
    arcResult.isLoading,
    completeRun,
    hasSelectedModes,
    mapId,
    needsArcSource,
    needsTripSource,
    roomInitialized,
    scenarioCacheKey,
    tripCacheRef,
    tripResult.data,
    tripResult.error,
    tripResult.isLoading,
    cacheRevision,
  ]);
}
