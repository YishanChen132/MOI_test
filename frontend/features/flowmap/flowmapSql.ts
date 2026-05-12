// 這個檔案負責從不同 flowmap source tables 查出前端要用的資料。
import {getDatasetPreset, SHARED_ROAD_NETWORK_TABLE, SHARED_ROAD_NODE_TABLE} from '../../constants/datasets';
import {
  buildModeOverlapCondition,
  buildScalarModeCondition,
  buildScalarTimeRangeCondition,
  quoteIdentifier,
} from '../../lib/sql';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../../lib/timeplayback';
import type {AppliedScenario} from '../../types';
import {
  bucketFlowmapTimeRange,
  ROAD_NODE_TRANSITION_FLOWMAP_LIMIT,
} from './flowmapCache';

export function buildFlowmapSourceQuery(applied: AppliedScenario): string {
  const preset = getDatasetPreset(applied.datasetId);
  const [playbackStart, playbackEnd] = millisecondsRangeToSeconds(PLAYBACK_DOMAIN);
  const [timeStart, timeEnd] = millisecondsRangeToSeconds(applied.timeRange);

  if (preset.flowmapSourceType === 'trajectory') {
    const table = quoteIdentifier(preset.tripTable);
    return `
      SELECT
        row_number() OVER () - 1 AS agent_id,
        paths,
        timestamps,
        modes
      FROM ${table}
      WHERE
        list_max(timestamps) >= ${playbackStart}
        AND list_min(timestamps) <= ${playbackEnd}
        AND ${buildModeOverlapCondition('modes', applied.modes)}
      ORDER BY agent_id
    `;
  }

  if (preset.flowmapSourceType === 'road-node-transition' && preset.flowmapTable) {
    const table = quoteIdentifier(preset.flowmapTable);
    const [bucketedStart, bucketedEnd] = bucketFlowmapTimeRange([timeStart, timeEnd]);
    return `
      SELECT
        origin_node_id AS origin_id,
        origin_lon,
        origin_lat,
        dest_node_id AS dest_id,
        dest_lon,
        dest_lat,
        mode,
        time_bucket,
        count,
        route_count
      FROM ${table}
      WHERE
        ${buildScalarTimeRangeCondition('time_bucket', bucketedStart, bucketedEnd)}
        AND ${buildScalarModeCondition('mode', applied.modes)}
      ORDER BY count DESC, time_bucket, origin_node_id, dest_node_id
      LIMIT ${ROAD_NODE_TRANSITION_FLOWMAP_LIMIT}
    `;
  }

  return 'SELECT 1 WHERE FALSE';
}

export function buildRoadFlowSourceQuery(applied: AppliedScenario): string {
  const preset = getDatasetPreset(applied.datasetId);
  const roadFlowTable = quoteIdentifier(preset.roadFlowTable ?? '');
  const roadNetworkTable = quoteIdentifier(preset.roadNetworkTable ?? SHARED_ROAD_NETWORK_TABLE);
  const roadNodeTable = quoteIdentifier(preset.roadNodeTable ?? SHARED_ROAD_NODE_TABLE);
  const [start, end] = millisecondsRangeToSeconds(applied.timeRange);
  const [bucketedStart, bucketedEnd] = bucketFlowmapTimeRange([start, end]);

  return `
    SELECT
      concat(flow.edge_id, ':', flow.mode, ':', flow.time_bucket) AS id,
      flow.edge_id,
      road.geometry,
      road.road_class,
      source.node_id AS source_node_id,
      source.lon AS source_lon,
      source.lat AS source_lat,
      target.node_id AS target_node_id,
      target.lon AS target_lon,
      target.lat AS target_lat,
      flow.mode,
      flow.time_bucket,
      flow.flow_count
    FROM ${roadFlowTable} AS flow
    JOIN ${roadNetworkTable} AS road
      ON road.edge_id = flow.edge_id
    JOIN ${roadNodeTable} AS source
      ON source.node_id = road.u
    JOIN ${roadNodeTable} AS target
      ON target.node_id = road.v
    WHERE
      ${buildScalarTimeRangeCondition('flow.time_bucket', bucketedStart, bucketedEnd)}
      AND ${buildScalarModeCondition('flow.mode', applied.modes)}
    ORDER BY flow.time_bucket, flow.flow_count DESC, flow.edge_id
  `;
}
