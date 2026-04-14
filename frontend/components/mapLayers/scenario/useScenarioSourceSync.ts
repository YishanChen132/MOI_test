// 這個檔案負責同步目前 dataset 需要的 SQLRooms data source，並回報來源是否準備完成。
import {DataSourceStatus} from '@sqlrooms/room-shell';
import {useEffect, useMemo, useRef} from 'react';
import {
  ALL_PRESET_TABLE_NAMES,
  getPresetRoomDataSources,
  type DatasetPresetId,
} from '../../../constants/datasets';
import {roomStore, useRoomStore} from '../../../app/store';
import {EMPTY_COUNTS} from './scenarioDataSyncHelpers';

type UseScenarioSourceSyncArgs = {
  datasetId: DatasetPresetId;
  requestId: number;
  activeSourceSpecs: ReturnType<typeof getPresetRoomDataSources>;
  roomInitialized: boolean;
  completeRun: (
    requestId: number,
    counts: typeof EMPTY_COUNTS,
    status: 'success' | 'error',
    errorMessage?: string,
  ) => void;
};

export function useScenarioSourceSync({
  datasetId,
  requestId,
  activeSourceSpecs,
  roomInitialized,
  completeRun,
}: UseScenarioSourceSyncArgs) {
  const dataSourceStates = useRoomStore((state) => state.room.dataSourceStates);
  const sourceSyncRunIdRef = useRef<number>(0);

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
        requestId,
        EMPTY_COUNTS,
        'error',
        `Dataset ${datasetId} failed to load: ${message}`,
      );
    });
  }, [
    activeSourceSpecs,
    completeRun,
    datasetId,
    requestId,
    roomInitialized,
  ]);

  return {
    activeSourceError,
    activeSourcesReady,
  };
}
