// 這個檔案專門集中管理各資料集 preset，讓前端知道每一批資料對應哪個 parquet 和 table。
import type {UrlDataSource} from '@sqlrooms/room-config';

const baseUrl = (import.meta.env.VITE_DATA_BASE_URL || 'http://localhost:7780/data').replace(/\/$/, '');

export type DatasetPresetId = '100' | '2000' | '5000' | '9000';

export type DatasetPreset = {
  id: DatasetPresetId;
  label: string;
  tripTable: string;
  tripUrl: string;
  arcTable: string;
  arcUrl: string;
  arcRowLimit?: number;
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
    description: 'Fast smoke-test preset using the smallest trip sample.',
  },
  '2000': {
    id: '2000',
    label: '2,000',
    tripTable: 'moi_trip_2000',
    tripUrl: `${baseUrl}/1209_arrow_trip_2000_from_9000.parquet`,
    arcTable: 'moi_arc_2000',
    arcUrl: `${baseUrl}/1209_arrow_od_arc_2000_from_9000.parquet`,
    description: 'Balanced preset for the first benchmark pass.',
  },
  '5000': {
    id: '5000',
    label: '5,000',
    tripTable: 'moi_trip_5000',
    tripUrl: `${baseUrl}/1209_arrow_trip_5000_from_9000.parquet`,
    arcTable: 'moi_arc_5000',
    arcUrl: `${baseUrl}/1209_arrow_od_arc_5000_from_9000.parquet`,
    description: 'Stress preset for multi-layer rendering.',
  },
  '9000': {
    id: '9000',
    label: '9,000',
    tripTable: 'moi_trip_9000',
    tripUrl: `${baseUrl}/abm_format_outcome_9000.parquet`,
    arcTable: 'moi_arc_9000',
    arcUrl: `${baseUrl}/abm_od_arc_outcome_9000.parquet`,
    description: 'Full source dataset for the heaviest benchmark run.',
  },
};

export const DEFAULT_DATASET_PRESET_ID: DatasetPresetId = '9000';

export function getPresetRoomDataSources(datasetId: DatasetPresetId): UrlDataSource[] {
  const preset = getDatasetPreset(datasetId);
  const entries: UrlDataSource[] = [
    {
      tableName: preset.tripTable,
      type: 'url',
      url: preset.tripUrl,
      loadOptions: {
        method: 'read_parquet',
      },
    },
  ];

  if (!entries.some((entry) => entry.tableName === preset.arcTable)) {
    entries.push({
      tableName: preset.arcTable,
      type: 'url',
      url: preset.arcUrl,
      loadOptions: {
        method: 'read_parquet',
      },
    });
  }

  return entries.filter((entry, index, array) => {
    return array.findIndex((candidate) => candidate.tableName === entry.tableName) === index;
  });
}

export const ALL_PRESET_TABLE_NAMES = Array.from(
  new Set(
    Object.values(DATASET_PRESETS).flatMap((preset) => [preset.tripTable, preset.arcTable]),
  ),
);

export function getDatasetPreset(id: DatasetPresetId): DatasetPreset {
  return DATASET_PRESETS[id];
}
