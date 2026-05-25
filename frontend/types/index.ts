// 這個檔案負責集中定義 MOI_test 前端會共用到的型別。
import type {DatasetPresetId} from '../constants/datasets';
import type {ModeCode} from '../constants/modes';

export type LayerId = 'trips' | 'arc' | 'heatmap' | 'boundary';
export type AdjustableLayerId = 'trips' | 'arc' | 'heatmap' | 'boundary';

export type LayerVisibility = Record<LayerId, boolean>;
export type LayerOpacity = Record<AdjustableLayerId, number>;

export type TimeRangeMilliseconds = [number, number];
export type TimeRangeSeconds = [number, number];
export type MapViewportBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
export type PlaybackHistogramBin = {
  startMs: number;
  endMs: number;
  count: number;
};

export type ScenarioConfig = {
  datasetId: DatasetPresetId;
  layers: LayerVisibility;
  modes: ModeCode[];
  timeRange: TimeRangeMilliseconds;
};

export type AppliedScenario = ScenarioConfig & {
  requestId: number;
  appliedAt: number;
};

export type BenchmarkCounts = {
  tripSegments: number;
  arcRows: number;
  heatmapPoints: number;
};

export type BenchmarkEntry = {
  requestId: number;
  datasetId: DatasetPresetId;
  layerSummary: string;
  modeSummary: string;
  timeRange: TimeRangeMilliseconds;
  durationMs: number;
  counts: BenchmarkCounts;
  status: 'success' | 'error';
  finishedAt: number;
  errorMessage?: string;
};

export type QueryTrajectoryRow = {
  agent_id: number;
  paths: unknown;
  timestamps: unknown;
  modes: unknown;
};

export type QueryRoadFlowRow = {
  id: string;
  edge_id: string;
  geometry: unknown;
  road_class: string;
  source_node_id: string;
  source_lon: number;
  source_lat: number;
  target_node_id: string;
  target_lon: number;
  target_lat: number;
  mode: number;
  time_bucket: number;
  flow_count: number;
};

export type QueryRoadNodeTransitionRow = {
  origin_id: string;
  origin_lon: number;
  origin_lat: number;
  dest_id: string;
  dest_lon: number;
  dest_lat: number;
  mode: number;
  time_bucket: number;
  count: number;
  route_count: number;
};

export type TripFeatureProperties = {
  agent_id: number;
  segment_index: number;
  mode: number;
  mode_label: string;
  start_time: number;
  end_time: number;
};

export type TripFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  TripFeatureProperties
>;

export type TripLayerDatum = {
  agent_id: number;
  segment_index: number;
  mode: number;
  mode_label: string;
  start_time: number;
  end_time: number;
  path: [number, number][];
  timestamps: number[];
};

export type TripTrailPointDatum = {
  agent_id: number;
  segment_index: number;
  mode: number;
  mode_label: string;
  lng: number;
  lat: number;
  timestamp: number;
  timestamp_ms: number;
};

export type ArcDatum = {
  arc_key: string;
  agent_id: number;
  segment_index: number;
  source_lng: number;
  source_lat: number;
  target_lng: number;
  target_lat: number;
  mode: number;
  mode_label: string;
  timestamp: number;
  timestamp_ms: number;
  timestamp_iso: string;
};

export type HeatmapDatum = {
  agent_id: number;
  segment_index: number;
  sample_index: number;
  lng: number;
  lat: number;
  mode: number;
  mode_label: string;
  timestamp: number;
  timestamp_ms: number;
  weight: number;
};
