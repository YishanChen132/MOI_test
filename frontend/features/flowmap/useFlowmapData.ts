// 這個檔案負責把 flowmap SQL 結果接成可直接給 custom layer 使用的 layer-ready data。
import {useSql} from '@sqlrooms/duckdb';
import {DataSourceStatus} from '@sqlrooms/room-shell';
import {useMemo} from 'react';
import {useRoomStore} from '../../app/store';
import {getDatasetPreset} from '../../constants/datasets';
import {millisecondsRangeToSeconds} from '../../lib/timeplayback';
import type {QueryTrajectoryRow} from '../../types';
import {buildFlowmapSourceQuery} from './flowmapSql';
import {transformRowsToFlowmapData} from './flowmapTransform';
import type {FlowmapLayerData} from './flowmapTypes';

const EMPTY_FLOWMAP_DATA: FlowmapLayerData = {
  locations: [],
  flows: [],
};

export function useFlowmapData() {
  const applied = useRoomStore((state) => state.moi.applied);
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const roomInitialized = useRoomStore((state) => state.room.initialized);
  const dataSourceStates = useRoomStore((state) => state.room.dataSourceStates);
  const preset = getDatasetPreset(applied.datasetId);
  const arcSourceReady = dataSourceStates[preset.arcTable]?.status === DataSourceStatus.READY;

  const result = useSql<QueryTrajectoryRow>({
    query: buildFlowmapSourceQuery(applied),
    enabled: roomInitialized && arcSourceReady && flowmapEnabled && applied.modes.length > 0,
  });

  const data = useMemo(() => {
    if (!result.data) {
      return EMPTY_FLOWMAP_DATA;
    }

    return transformRowsToFlowmapData(
      result.data.rows(),
      applied.modes,
      millisecondsRangeToSeconds(applied.timeRange),
    );
  }, [applied.modes, applied.timeRange, result.data]);

  return {
    data,
    error: result.error,
    isLoading: result.isLoading,
    isReady: flowmapEnabled && arcSourceReady && !result.isLoading && !result.error,
  };
}
