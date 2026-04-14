// 這個檔案專門放 Trips 圖層在 kepler 裡的資料格式、圖層設定和 tooltip 欄位。
import {processGeojson} from '@kepler.gl/processors';
import {MODE_DEFINITIONS} from '../../../constants/modes';
import type {TripFeatureCollection} from '../../../types';

const TRIP_TRAIL_LENGTH_SECONDS = 60;

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
      color: hexToRgb(mode.tripColor),
      columns: {
        geojson: '_geojson',
      },
      isVisible,
      visConfig: {
        opacity,
        thickness: 1.2,
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

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((digit) => `${digit}${digit}`).join('')
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return [red, green, blue];
}
