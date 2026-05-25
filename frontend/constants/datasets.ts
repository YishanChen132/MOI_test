// 這個檔案專門集中管理各資料集 preset，讓前端知道每一批資料對應哪個 parquet / json 和 table。
import type {UrlDataSource} from '@sqlrooms/room-config';

const baseUrl = (import.meta.env.VITE_DATA_BASE_URL || 'http://localhost:7780/data').replace(/\/$/, '');

export const SHARED_ROAD_NETWORK_TABLE = 'moi_road_edges_shuangbei_osm';
export const SHARED_ROAD_NETWORK_URL = `${baseUrl}/shuangbei_osm_road_edges.json`;
export const SHARED_ROAD_NODE_TABLE = 'moi_road_nodes_shuangbei_osm';
export const SHARED_ROAD_NODE_URL = `${baseUrl}/shuangbei_osm_road_nodes.json`;

export type FlowmapSourceType = 'trajectory' | 'road-node-transition' | 'road-path';
export type DatasetPresetId =
  | '100'
  | '2000'
  | '5000'
  | '9000'
  | '20000'
  | '42082'
  | 'taipei_edge_flowmap'
  | 'taipei_road_node_flowmap';

export type DatasetPreset = {
  id: DatasetPresetId;
  label: string;
  tripTable: string;
  tripUrl: string;
  tripLoadMethod?: 'read_parquet' | 'read_json';
  arcTable: string;
  arcUrl: string;
  arcRowLimit?: number;
  arcValueShape?: 'list' | 'scalar';
  flowmapSourceType: FlowmapSourceType;
  flowmapTable?: string;
  flowmapUrl?: string;
  flowmapLoadMethod?: 'read_parquet' | 'read_json';
  flowmapLocationTable?: string;
  flowmapLocationUrl?: string;
  flowmapLocationLoadMethod?: 'read_parquet' | 'read_json';
  roadFlowTable?: string;
  roadFlowUrl?: string;
  roadFlowLoadMethod?: 'read_parquet' | 'read_json';
  roadNetworkTable?: string;
  roadNetworkUrl?: string;
  roadNetworkLoadMethod?: 'read_parquet' | 'read_json';
  roadNodeTable?: string;
  roadNodeUrl?: string;
  roadNodeLoadMethod?: 'read_parquet' | 'read_json';
  description: string;
};

export const DATASET_PRESETS: Record<DatasetPresetId, DatasetPreset> = {
  '100': {
    id: '100',
    label: '100',
    tripTable: 'moi_trip_100',
    tripUrl: `${baseUrl}/1209_arrow_trip_100.parquet`,
    arcTable: 'moi_arc_9000',
    arcUrl: `${baseUrl}/abm_od_arc_outcome_9000.parquet`,
    arcRowLimit: 100,
    arcValueShape: 'list',
    flowmapSourceType: 'trajectory',
    description: 'Trajectory flowmap preset using the smallest mobility sample.',
  },
  '2000': {
    id: '2000',
    label: '2,000',
    tripTable: 'moi_trip_2000',
    tripUrl: `${baseUrl}/1209_arrow_trip_2000_from_9000.parquet`,
    arcTable: 'moi_arc_2000',
    arcUrl: `${baseUrl}/1209_arrow_od_arc_2000_from_9000.parquet`,
    arcValueShape: 'list',
    flowmapSourceType: 'trajectory',
    description: 'Trajectory flowmap preset for the balanced benchmark.',
  },
  '5000': {
    id: '5000',
    label: '5,000',
    tripTable: 'moi_trip_5000',
    tripUrl: `${baseUrl}/1209_arrow_trip_5000_from_9000.parquet`,
    arcTable: 'moi_arc_5000',
    arcUrl: `${baseUrl}/1209_arrow_od_arc_5000_from_9000.parquet`,
    arcValueShape: 'list',
    flowmapSourceType: 'trajectory',
    description: 'Trajectory flowmap preset for heavier rendering stress.',
  },
  '9000': {
    id: '9000',
    label: '9,000',
    tripTable: 'moi_trip_9000',
    tripUrl: `${baseUrl}/abm_format_outcome_9000.parquet`,
    arcTable: 'moi_arc_9000',
    arcUrl: `${baseUrl}/abm_od_arc_outcome_9000.parquet`,
    arcValueShape: 'list',
    flowmapSourceType: 'trajectory',
    description: 'Trajectory flowmap preset for the heaviest benchmark run.',
  },
  '20000': {
    id: '20000',
    label: '20,000',
    tripTable: 'moi_trip_20000',
    tripUrl: `${baseUrl}/abm_format_outcome_20000.parquet`,
    arcTable: 'moi_arc_20000',
    arcUrl: `${baseUrl}/abm_od_arc_outcome_20000.parquet`,
    arcValueShape: 'scalar',
    flowmapSourceType: 'trajectory',
    description: 'Trajectory flowmap preset for the 20,000-row stress benchmark.',
  },
  '42082': {
    id: '42082',
    label: '42,082',
    tripTable: 'moi_trip_42082',
    tripUrl: `${baseUrl}/abm_format_outcome_42082.parquet`,
    arcTable: 'moi_arc_42082',
    arcUrl: `${baseUrl}/abm_od_arc_outcome_42082.parquet`,
    arcValueShape: 'scalar',
    flowmapSourceType: 'trajectory',
    description: 'Trajectory flowmap preset for the 42,082-row benchmark.',
  },
  'taipei_edge_flowmap': {
    id: 'taipei_edge_flowmap',
    label: 'Taipei Edge Flowmap',
    tripTable: 'moi_trip_100',
    tripUrl: `${baseUrl}/1209_arrow_trip_100.parquet`,
    arcTable: 'moi_arc_2000',
    arcUrl: `${baseUrl}/1209_arrow_od_arc_2000_from_9000.parquet`,
    arcValueShape: 'list',
    flowmapSourceType: 'road-path',
    roadFlowTable: 'moi_road_flow_9000',
    roadFlowUrl: `${baseUrl}/taipei_osm_edge_flows_9000.json`,
    roadFlowLoadMethod: 'read_json',
    roadNetworkTable: SHARED_ROAD_NETWORK_TABLE,
    roadNetworkUrl: SHARED_ROAD_NETWORK_URL,
    roadNetworkLoadMethod: 'read_json',
    roadNodeTable: SHARED_ROAD_NODE_TABLE,
    roadNodeUrl: SHARED_ROAD_NODE_URL,
    roadNodeLoadMethod: 'read_json',
    description: 'Road-edge path renderer over the shared Shuangbei graph tables.',
  },
  'taipei_road_node_flowmap': {
    id: 'taipei_road_node_flowmap',
    label: 'Taipei Road Node Flowmap',
    tripTable: 'moi_trip_100',
    tripUrl: `${baseUrl}/1209_arrow_trip_100.parquet`,
    arcTable: 'moi_arc_2000',
    arcUrl: `${baseUrl}/1209_arrow_od_arc_2000_from_9000.parquet`,
    arcValueShape: 'list',
    flowmapSourceType: 'road-node-transition',
    flowmapTable: 'moi_flowmap_node_transitions_shuangbei_osm',
    flowmapUrl: `${baseUrl}/shuangbei_osm_flowmap_node_transitions.json`,
    flowmapLoadMethod: 'read_json',
    flowmapLocationTable: 'moi_flowmap_node_locations_shuangbei_osm',
    flowmapLocationUrl: `${baseUrl}/shuangbei_osm_flowmap_node_locations.json`,
    flowmapLocationLoadMethod: 'read_json',
    description: 'Road-node transition flowmap generated from snapped shortest-path routes.',
  },
};

export const DEFAULT_DATASET_PRESET_ID: DatasetPresetId = '42082';

export function getPresetRoomDataSources(datasetId: DatasetPresetId): UrlDataSource[] {
  const preset = getDatasetPreset(datasetId);
  const entries: UrlDataSource[] = [
    {
      tableName: preset.tripTable,
      type: 'url',
      url: preset.tripUrl,
      loadOptions: {
        method: preset.tripLoadMethod ?? 'read_parquet',
      },
    },
    {
      tableName: preset.arcTable,
      type: 'url',
      url: preset.arcUrl,
      loadOptions: {
        method: 'read_parquet',
      },
    },
  ];

  if (preset.flowmapTable && preset.flowmapUrl) {
    entries.push({
      tableName: preset.flowmapTable,
      type: 'url',
      url: preset.flowmapUrl,
      loadOptions: {
        method: preset.flowmapLoadMethod ?? 'read_parquet',
      },
    });
  }

  if (preset.flowmapLocationTable && preset.flowmapLocationUrl) {
    entries.push({
      tableName: preset.flowmapLocationTable,
      type: 'url',
      url: preset.flowmapLocationUrl,
      loadOptions: {
        method: preset.flowmapLocationLoadMethod ?? 'read_parquet',
      },
    });
  }

  if (preset.roadFlowTable && preset.roadFlowUrl) {
    entries.push({
      tableName: preset.roadFlowTable,
      type: 'url',
      url: preset.roadFlowUrl,
      loadOptions: {
        method: preset.roadFlowLoadMethod ?? 'read_parquet',
      },
    });
  }

  if (preset.roadNetworkTable && preset.roadNetworkUrl) {
    entries.push({
      tableName: preset.roadNetworkTable,
      type: 'url',
      url: preset.roadNetworkUrl,
      loadOptions: {
        method: preset.roadNetworkLoadMethod ?? 'read_parquet',
      },
    });
  }

  if (preset.roadNodeTable && preset.roadNodeUrl) {
    entries.push({
      tableName: preset.roadNodeTable,
      type: 'url',
      url: preset.roadNodeUrl,
      loadOptions: {
        method: preset.roadNodeLoadMethod ?? 'read_parquet',
      },
    });
  }

  return entries.filter((entry, index, array) => {
    return array.findIndex((candidate) => candidate.tableName === entry.tableName) === index;
  });
}

export const ALL_PRESET_TABLE_NAMES = Array.from(
  new Set(
    Object.values(DATASET_PRESETS).flatMap((preset) => [
      preset.tripTable,
      preset.arcTable,
      preset.flowmapTable,
      preset.flowmapLocationTable,
      preset.roadFlowTable,
      preset.roadNetworkTable,
      preset.roadNodeTable,
    ]),
  ),
).filter((tableName): tableName is string => Boolean(tableName));

export function getDatasetPreset(id: DatasetPresetId): DatasetPreset {
  return DATASET_PRESETS[id];
}
