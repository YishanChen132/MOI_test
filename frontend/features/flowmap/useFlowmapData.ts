// 這個檔案負責把 trajectory / road-node-transition / road-path SQL 結果接成 flowmap renderer 會用的資料。
import {useSql} from '@sqlrooms/duckdb';
import {DataSourceStatus} from '@sqlrooms/room-shell';
import {useMemo} from 'react';
import {useRoomStore} from '../../app/store';
import {buildScenarioCacheKey, sharedTripCacheRef} from '../../components/mapLayers/scenario/scenarioDataSyncHelpers';
import {getDatasetPreset, SHARED_ROAD_NODE_TABLE, SHARED_ROAD_NETWORK_TABLE} from '../../constants/datasets';
import {millisecondsRangeToSeconds} from '../../lib/timeplayback';
import type {QueryRoadFlowRow, QueryRoadNodeTransitionRow} from '../../types';
import {buildFlowmapSourceQuery, buildRoadFlowSourceQuery} from './flowmapSql';
import {
  bucketFlowmapTimeRange,
  buildFlowmapCacheKey,
  getRoadNodeTransitionEntry,
  getRoadPathSegments,
  getTrajectoryFlowmapData,
  setRoadNodeTransitionEntry,
  setRoadPathSegments,
  setTrajectoryFlowmapData,
} from './flowmapCache';
import {buildFlowmapQueryState} from './flowmapQueryState';
import {
  transformRoadFlowRowsToSegments,
  transformRoadNodeTransitionRowsToFlowmapData,
  transformTrajectoryRowsToFlowmapData,
} from './flowmapTransform';
import type {FlowmapLayerData, FlowmapRoadSegment} from './flowmapTypes';

const EMPTY_FLOWMAP_DATA: FlowmapLayerData = {locations: [], flows: []};
const EMPTY_ROAD_SEGMENTS: FlowmapRoadSegment[] = [];

export function useFlowmapData() {
  const applied = useRoomStore((state) => state.moi.applied);
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const roomInitialized = useRoomStore((state) => state.room.initialized);
  const dataSourceStates = useRoomStore((state) => state.room.dataSourceStates);
  const preset = getDatasetPreset(applied.datasetId);
  const timeRangeSeconds = millisecondsRangeToSeconds(applied.timeRange);
  const bucketedTimeRangeSeconds = useMemo(
    () => bucketFlowmapTimeRange(timeRangeSeconds),
    [timeRangeSeconds],
  );
  const roadNetworkTable = preset.roadNetworkTable ?? SHARED_ROAD_NETWORK_TABLE;
  const roadNodeTable = preset.roadNodeTable ?? SHARED_ROAD_NODE_TABLE;
  const scenarioCacheKey = useMemo(
    () => buildScenarioCacheKey(applied.datasetId, applied.modes),
    [applied.datasetId, applied.modes],
  );
  const flowmapCacheKey = useMemo(
    () => buildFlowmapCacheKey(applied.datasetId, preset.flowmapSourceType, applied.modes, bucketedTimeRangeSeconds),
    [applied.datasetId, applied.modes, preset.flowmapSourceType, bucketedTimeRangeSeconds],
  );
  const cachedTripEntry = sharedTripCacheRef.current.get(scenarioCacheKey) ?? null;
  const cachedTrajectoryData = getTrajectoryFlowmapData(flowmapCacheKey);
  const cachedRoadNodeTransitionEntry = getRoadNodeTransitionEntry(flowmapCacheKey);
  const cachedRoadPathSegments = getRoadPathSegments(flowmapCacheKey);

  const trajectorySourceReady = dataSourceStates[preset.tripTable]?.status === DataSourceStatus.READY;
  const roadNodeTransitionSourceReady = preset.flowmapTable
    ? dataSourceStates[preset.flowmapTable]?.status === DataSourceStatus.READY
    : false;
  const roadFlowSourceReady = preset.roadFlowTable
    ? dataSourceStates[preset.roadFlowTable]?.status === DataSourceStatus.READY
    : false;
  const roadNetworkSourceReady = preset.roadNetworkTable
    ? dataSourceStates[roadNetworkTable]?.status === DataSourceStatus.READY
    : false;
  const roadNodeSourceReady = preset.roadNodeTable
    ? dataSourceStates[roadNodeTable]?.status === DataSourceStatus.READY
    : false;
  const queryState = buildFlowmapQueryState({
    flowmapEnabled,
    roomInitialized,
    sourceType: preset.flowmapSourceType,
    hasSelectedModes: applied.modes.length > 0,
    trajectorySourceReady,
    roadNodeTransitionSourceReady,
    roadFlowSourceReady,
    roadNetworkSourceReady,
    roadNodeSourceReady,
    hasCachedTripEntry: Boolean(cachedTripEntry),
    hasCachedTrajectoryData: Boolean(cachedTrajectoryData),
    hasCachedRoadNodeTransitionEntry: Boolean(cachedRoadNodeTransitionEntry),
    hasCachedRoadPathSegments: Boolean(cachedRoadPathSegments),
    isFlowmapQueryLoading: false,
    isRoadFlowQueryLoading: false,
    flowmapQueryError: null,
    roadFlowQueryError: null,
  });

  const flowmapQuery = useMemo(() => buildFlowmapSourceQuery(applied), [applied]);
  const flowmapResult = useSql<QueryRoadNodeTransitionRow>({
    query: flowmapQuery,
    enabled: queryState.shouldQueryFlowmapSource,
  });

  const roadFlowQuery = useMemo(() => buildRoadFlowSourceQuery(applied), [applied]);
  const roadFlowResult = useSql<QueryRoadFlowRow>({
    query: roadFlowQuery,
    enabled: queryState.shouldQueryRoadFlowSource,
  });

  const data = useMemo(() => {
    if (preset.flowmapSourceType === 'trajectory') {
      if (cachedTrajectoryData) {
        return cachedTrajectoryData;
      }

      if (!cachedTripEntry) {
        return EMPTY_FLOWMAP_DATA;
      }

      return setTrajectoryFlowmapData(
        flowmapCacheKey,
        transformTrajectoryRowsToFlowmapData(cachedTripEntry.trajectoryRows, applied.modes, bucketedTimeRangeSeconds),
      );
    }

    if (preset.flowmapSourceType === 'road-node-transition') {
      if (cachedRoadNodeTransitionEntry) {
        return cachedRoadNodeTransitionEntry.data;
      }

      if (!flowmapResult.data) {
        return EMPTY_FLOWMAP_DATA;
      }

      const rows = Array.from(flowmapResult.data.rows()) as QueryRoadNodeTransitionRow[];
      return setRoadNodeTransitionEntry(flowmapCacheKey, {
        rows,
        data: transformRoadNodeTransitionRowsToFlowmapData(rows, applied.modes, bucketedTimeRangeSeconds),
      }).data;
    }

    return EMPTY_FLOWMAP_DATA;
  }, [
    applied.modes,
    cachedRoadNodeTransitionEntry,
    cachedTrajectoryData,
    cachedTripEntry,
    flowmapCacheKey,
    flowmapResult.data,
    preset.flowmapSourceType,
    bucketedTimeRangeSeconds,
  ]);

  const roadSegments = useMemo(() => {
    if (cachedRoadPathSegments) {
      return cachedRoadPathSegments;
    }

    if (!roadFlowResult.data) {
      return EMPTY_ROAD_SEGMENTS;
    }

    return setRoadPathSegments(
      flowmapCacheKey,
      transformRoadFlowRowsToSegments(roadFlowResult.data.rows(), applied.modes, bucketedTimeRangeSeconds),
    );
  }, [applied.modes, bucketedTimeRangeSeconds, cachedRoadPathSegments, flowmapCacheKey, roadFlowResult.data]);

  const flowmapError = flowmapResult.error ?? roadFlowResult.error;
  const flowmapLoading = flowmapResult.isLoading || roadFlowResult.isLoading;
  const flowmapReady = buildFlowmapQueryState({
    flowmapEnabled,
    roomInitialized,
    sourceType: preset.flowmapSourceType,
    hasSelectedModes: applied.modes.length > 0,
    trajectorySourceReady,
    roadNodeTransitionSourceReady,
    roadFlowSourceReady,
    roadNetworkSourceReady,
    roadNodeSourceReady,
    hasCachedTripEntry: Boolean(cachedTripEntry),
    hasCachedTrajectoryData: Boolean(cachedTrajectoryData),
    hasCachedRoadNodeTransitionEntry: Boolean(cachedRoadNodeTransitionEntry),
    hasCachedRoadPathSegments: Boolean(cachedRoadPathSegments),
    isFlowmapQueryLoading: flowmapResult.isLoading,
    isRoadFlowQueryLoading: roadFlowResult.isLoading,
    flowmapQueryError: flowmapResult.error,
    roadFlowQueryError: roadFlowResult.error,
  }).isReady;

  return {
    preset,
    data,
    roadSegments,
    error: flowmapError,
    isLoading: flowmapLoading,
    isReady: flowmapReady,
  };
}
