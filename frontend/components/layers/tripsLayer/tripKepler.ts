// 這個檔案專門放 Trips 圖層在 kepler 裡的資料格式、圖層設定和 tooltip 欄位。
import {processGeojson} from '@kepler.gl/processors';
import {ALL_MODE_CODES, buildModeColorRange} from '../../../constants/modes';
import {PLAYBACK_WINDOW_MS} from '../../../lib/timeplayback';
import type {TripFeatureCollection} from '../../../types';

const MODE_COLOR_RANGE = buildModeColorRange();
const TRIP_TRAIL_LENGTH_SECONDS = PLAYBACK_WINDOW_MS / 1_000;

type DatasetDescriptor = {
  id: string;
  label: string;
  processed: unknown;
};

export const TRIP_DATASET_ID = 'moi_trip_segments';

export const TRIP_TOOLTIP_FIELDS = [
  {name: 'agent_id'},
  {name: 'segment_index'},
  {name: 'mode_label'},
  {name: 'start_time'},
  {name: 'end_time'},
] as const;

export function buildTripDataset(trips: TripFeatureCollection | null): DatasetDescriptor | null {
  if (!trips || trips.features.length === 0) {
    return null;
  }

  return {
    id: TRIP_DATASET_ID,
    label: 'Trips',
    processed: processGeojson(trips),
  };
}

export function buildTripLayerConfig(isVisible = true, opacity = 0.85) {
  return {
    id: 'moi-trip-layer',
    type: 'trip',
    config: {
      dataId: TRIP_DATASET_ID,
      label: 'Trips',
      color: [255, 177, 27],
      colorDomain: ALL_MODE_CODES,
      columns: {
        geojson: '_geojson',
      },
      isVisible,
      visConfig: {
        opacity,
        thickness: 0.8,
        colorRange: MODE_COLOR_RANGE,
        trailLength: TRIP_TRAIL_LENGTH_SECONDS,
        fadeTrail: true,
        billboard: false,
        sizeRange: [0, 8],
      },
      hidden: false,
      textLabel: [],
    },
    visualChannels: {
      colorField: {
        name: 'mode',
        type: 'integer',
      },
      colorScale: 'ordinal',
      sizeField: null,
      sizeScale: 'linear',
    },
  };
}
