// 這個檔案專門放 Trips 圖層在 kepler 裡的資料格式、圖層設定和 tooltip 欄位。
import {processGeojson} from '@kepler.gl/processors';
import {MODE_DEFINITIONS} from '../../../constants/modes';
import type {TripFeatureCollection} from '../../../types';

const TRIP_TRAIL_LENGTH_SECONDS = 600;
const TRIP_LAYER_COLOR: [number, number, number] = [255, 150, 150];

type DatasetDescriptor = {
  id: string;
  label: string;
  processed: unknown;
};

export const TRIP_DATASET_IDS = MODE_DEFINITIONS.map((mode) => `moi_trip_segments_mode_${mode.code}`) as string[];

export const TRIP_TOOLTIP_FIELDS = [
  {name: 'agent_id'},
  {name: 'segment_index'},
  {name: 'mode_label'},
  {name: 'start_time'},
  {name: 'end_time'},
] as const;

export function isTripDatasetId(datasetId: string): boolean {
  return TRIP_DATASET_IDS.includes(datasetId);
}

export function buildTripDatasets(trips: TripFeatureCollection | null): DatasetDescriptor[] {
  if (!trips || trips.features.length === 0) {
    return [];
  }

  return MODE_DEFINITIONS.flatMap((mode) => {
    const features = trips.features.filter((feature) => feature.properties.mode === mode.code);
    if (features.length === 0) {
      return [];
    }

    return [{
      id: `moi_trip_segments_mode_${mode.code}`,
      label: `Trips ${mode.label}`,
      processed: processGeojson({
        type: 'FeatureCollection',
        features,
      }),
    }];
  });
}

export function buildTripLayerConfigs(isVisible = true, opacity = 0.85) {
  return MODE_DEFINITIONS.map((mode) => ({
    id: `moi-trip-layer-${mode.code}`,
    type: 'trip',
    config: {
      dataId: `moi_trip_segments_mode_${mode.code}`,
      label: `Trips ${mode.label}`,
      color: TRIP_LAYER_COLOR,
      columns: {
        geojson: '_geojson',
      },
      isVisible,
      visConfig: {
        opacity,
        thickness: 1.8,
        trailLength: TRIP_TRAIL_LENGTH_SECONDS,
        fadeTrail: true,
        billboard: false,
        sizeRange: [0, 8],
      },
      hidden: false,
      textLabel: [],
    },
    visualChannels: {
      colorField: null,
      colorScale: 'ordinal',
      sizeField: null,
      sizeScale: 'linear',
    },
  }));
}
