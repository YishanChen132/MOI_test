// 這個檔案負責把目前場景的 SQL 查詢、資料轉換和 kepler 資料更新拆成獨立元件。
import {useSql} from '@sqlrooms/duckdb';
import {DataSourceStatus} from '@sqlrooms/room-shell';
import {useEffect, useMemo, useRef} from 'react';
import {
  ALL_PRESET_TABLE_NAMES,
  getPresetRoomDataSources,
} from '../lib/datasets';
import {buildMapDatasets, replaceMapDatasets} from '../lib/kepler';
import {buildArcSourceQuery, buildTripSourceQuery} from '../lib/sql';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../lib/timeplayback';
import {flattenArcRows, flattenHeatmapRows, segmentTripRows} from '../lib/transforms';
import type {BenchmarkCounts, QueryTrajectoryRow} from '../lib/types';
import {roomStore, useRoomStore} from '../store';

type ScenarioDataSyncProps = {
  mapId: string;
};

export function ScenarioDataSync({mapId}: ScenarioDataSyncProps) {
  const applied = useRoomStore((state) => state.moi.applied);
  const completeRun = useRoomStore((state) => state.moi.completeRun);
  const roomInitialized = useRoomStore((state) => state.room.initialized);
  const dataSourceStates = useRoomStore((state) => state.room.dataSourceStates);
  const processedRequestIdRef = useRef<number>(0);
  const sourceSyncRunIdRef = useRef<number>(0);

  const needsTripSource = applied.layers.trips || applied.layers.heatmap;
  const needsArcSource = applied.layers.arc;
  const hasSelectedModes = applied.modes.length > 0;

  const activeSourceSpecs = useMemo(
    () => getPresetRoomDataSources(applied.datasetId),
    [applied.datasetId],
  );
  const activeSourceStates = useMemo(
    () => activeSourceSpecs.map((source) => dataSourceStates[source.tableName]),
    [activeSourceSpecs, dataSourceStates],
  );
  const activeSourceError = activeSourceStates.find(
    (state) => state?.status === DataSourceStatus.ERROR,
  )?.message;
  const activeSourcesReady =
    roomInitialized &&
    activeSourceSpecs.every((source) => dataSourceStates[source.tableName]?.status === DataSourceStatus.READY);

  const tripQuery = useMemo(() => buildTripSourceQuery(applied), [applied]);
  const arcQuery = useMemo(() => buildArcSourceQuery(applied), [applied]);

  const tripResult = useSql<QueryTrajectoryRow>({
    query: tripQuery,
    enabled: activeSourcesReady && needsTripSource && hasSelectedModes,
    version: applied.requestId,
  });

  const arcResult = useSql<QueryTrajectoryRow>({
    query: arcQuery,
    enabled: activeSourcesReady && needsArcSource && hasSelectedModes,
    version: applied.requestId,
  });

  useEffect(() => {
    if (!roomInitialized) {
      return;
    }

    const syncRunId = sourceSyncRunIdRef.current + 1;
    sourceSyncRunIdRef.current = syncRunId;

    void (async () => {
      const activeTableNames = new Set(activeSourceSpecs.map((source) => source.tableName));
      const roomApi = roomStore.getState().room;

      for (const tableName of ALL_PRESET_TABLE_NAMES) {
        if (syncRunId !== sourceSyncRunIdRef.current) {
          return;
        }

        if (activeTableNames.has(tableName)) {
          continue;
        }

        const hasTable = roomStore.getState().room.config.dataSources.some((source) => {
          return source.tableName === tableName;
        });

        if (!hasTable) {
          continue;
        }

        await roomApi.removeDataSource(tableName);
      }

      for (const source of activeSourceSpecs) {
        if (syncRunId !== sourceSyncRunIdRef.current) {
          return;
        }

        const latestState = roomStore.getState();
        const hasSource = latestState.room.config.dataSources.some(
          (dataSource) => dataSource.tableName === source.tableName,
        );
        const sourceState = latestState.room.dataSourceStates[source.tableName];

        if (!hasSource || sourceState?.status === DataSourceStatus.ERROR) {
          await roomApi.addDataSource(source);
        }
      }
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown dataset loading error.';
      completeRun(
        applied.requestId,
        {
          tripSegments: 0,
          arcRows: 0,
          heatmapPoints: 0,
        },
        'error',
        `Dataset ${applied.datasetId} failed to load: ${message}`,
      );
    });
  }, [
    activeSourceSpecs,
    applied.datasetId,
    applied.requestId,
    completeRun,
    roomInitialized,
  ]);

  useEffect(() => {
    if (!roomInitialized || !mapId) {
      return;
    }

    if (processedRequestIdRef.current === applied.requestId) {
      return;
    }

    if (activeSourceError) {
      processedRequestIdRef.current = applied.requestId;
      completeRun(
        applied.requestId,
        {
          tripSegments: 0,
          arcRows: 0,
          heatmapPoints: 0,
        },
        'error',
        activeSourceError,
      );
      return;
    }

    if (!activeSourcesReady) {
      return;
    }

    if (!hasSelectedModes || (!needsTripSource && !needsArcSource)) {
      replaceMapDatasets(roomStore, mapId, applied, []);
      processedRequestIdRef.current = applied.requestId;
      completeRun(
        applied.requestId,
        {
          tripSegments: 0,
          arcRows: 0,
          heatmapPoints: 0,
        },
        'success',
      );
      return;
    }

    const waitingOnTrip =
      needsTripSource && (tripResult.isLoading || (!tripResult.data && !tripResult.error));
    const waitingOnArc =
      needsArcSource && (arcResult.isLoading || (!arcResult.data && !arcResult.error));

    if (waitingOnTrip || waitingOnArc) {
      return;
    }

    const errors = [
      tripResult.error ? `Trip source query failed: ${tripResult.error.message}` : null,
      arcResult.error ? `Arc source query failed: ${arcResult.error.message}` : null,
    ].filter((message): message is string => Boolean(message));

    if (errors.length > 0) {
      processedRequestIdRef.current = applied.requestId;
      completeRun(
        applied.requestId,
        {
          tripSegments: 0,
          arcRows: 0,
          heatmapPoints: 0,
        },
        'error',
        errors.join(' '),
      );
      return;
    }

    const tripFeatures =
      applied.layers.trips && tripResult.data
        ? segmentTripRows(
            tripResult.data.rows(),
            applied.modes,
            millisecondsRangeToSeconds(applied.timeRange),
          )
        : null;
    const arcRows =
      applied.layers.arc && arcResult.data
        ? flattenArcRows(
            arcResult.data.rows(),
            applied.modes,
            millisecondsRangeToSeconds(PLAYBACK_DOMAIN),
          )
        : [];
    const heatmapRows =
      applied.layers.heatmap && tripResult.data
        ? flattenHeatmapRows(
            tripResult.data.rows(),
            applied.modes,
            millisecondsRangeToSeconds(applied.timeRange),
          )
        : [];

    replaceMapDatasets(
      roomStore,
      mapId,
      applied,
      buildMapDatasets(tripFeatures, arcRows, heatmapRows),
    );

    const counts: BenchmarkCounts = {
      tripSegments: tripFeatures?.features.length ?? 0,
      arcRows: arcRows.length,
      heatmapPoints: heatmapRows.length,
    };

    processedRequestIdRef.current = applied.requestId;
    completeRun(applied.requestId, counts, 'success');
  }, [
    activeSourceError,
    applied,
    applied.requestId,
    activeSourcesReady,
    arcResult.data,
    arcResult.error,
    arcResult.isLoading,
    completeRun,
    hasSelectedModes,
    mapId,
    needsArcSource,
    needsTripSource,
    roomInitialized,
    tripResult.data,
    tripResult.error,
    tripResult.isLoading,
  ]);

  return null;
}
