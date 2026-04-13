// 這個檔案負責集中定義 MOI_test 前端會共用到的型別。
import type {DatasetPresetId} from './datasets';
import type {ModeCode} from './modes';

export type LayerId = 'trips' | 'arc' | 'heatmap';

export type LayerVisibility = Record<LayerId, boolean>;

export type TimeRangeMilliseconds = [number, number];
export type TimeRangeSeconds = [number, number];

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

export type ArcDatum = {
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
  point_index: number;
  lng: number;
  lat: number;
  mode: number;
  mode_label: string;
  timestamp: number;
};
