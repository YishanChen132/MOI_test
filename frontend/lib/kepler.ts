// 這個檔案負責把查詢後的資料和 kepler.gl 的圖層、時間設定接在一起。
import {
  setAnimationConfig,
  setFilter,
  updateFilterAnimationSpeed,
} from '@kepler.gl/actions';
import {processGeojson, processRowObject} from '@kepler.gl/processors';
import type {KeplerSliceState} from '@sqlrooms/kepler';
import type {StoreApi} from 'zustand';
import {buildModeColorRange} from './modes';
import {
  millisecondsOfDayToPlaybackEpochMs,
  PLAYBACK_DOMAIN,
  PLAYBACK_INITIAL_SPEED,
  PLAYBACK_TIMEZONE,
  PLAYBACK_TIME_FORMAT,
} from './timeplayback';
import type {
  AppliedScenario,
  ArcDatum,
  HeatmapDatum,
  TimeRangeMilliseconds,
  TripFeatureCollection,
} from './types';

const MODE_COLOR_RANGE = buildModeColorRange();

export const MAP_DATASET_IDS = {
  trips: 'moi_trip_segments',
  arc: 'moi_arc_segments',
  heatmap: 'moi_heatmap_points',
} as const;

type DatasetDescriptor = {
  id: string;
  label: string;
  processed: unknown;
};

type RoomStoreWithKepler = StoreApi<KeplerSliceState>;

export function buildMapDatasets(
  trips: TripFeatureCollection | null,
  arcRows: ArcDatum[],
  heatmapRows: HeatmapDatum[],
): DatasetDescriptor[] {
  const datasets: DatasetDescriptor[] = [];

  if (trips && trips.features.length > 0) {
    datasets.push({
      id: MAP_DATASET_IDS.trips,
      label: 'Trips',
      processed: processGeojson(trips),
    });
  }

  if (arcRows.length > 0) {
    datasets.push({
      id: MAP_DATASET_IDS.arc,
      label: 'OD Arc',
      processed: processRowObject(arcRows),
    });
  }

  if (heatmapRows.length > 0) {
    datasets.push({
      id: MAP_DATASET_IDS.heatmap,
      label: 'Heatmap',
      processed: processRowObject(heatmapRows),
    });
  }

  return datasets;
}

export function buildKeplerMapConfig(applied: AppliedScenario, datasetIds: readonly string[]) {
  const layers = [];
  const filters = [];
  const playbackDomainMs = PLAYBACK_DOMAIN.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];
  const playbackValueMs = applied.timeRange.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];

  if (datasetIds.includes(MAP_DATASET_IDS.trips)) {
    layers.push({
      id: 'moi-trip-layer',
      type: 'trip',
      config: {
        dataId: MAP_DATASET_IDS.trips,
        label: 'Trips',
        color: [255, 177, 27],
        columns: {
          geojson: '_geojson',
        },
        isVisible: true,
        visConfig: {
          opacity: 0.85,
          thickness: 0.8,
          colorRange: MODE_COLOR_RANGE,
          trailLength: 45,
          fadeTrail: true,
          billboard: false,
          sizeRange: [0, 8],
        },
        hidden: false,
        textLabel: [],
      },
      visualChannels: {
        colorField: {
          name: 'mode_label',
          type: 'string',
        },
        colorScale: 'ordinal',
        sizeField: null,
        sizeScale: 'linear',
      },
    });
  }

  if (datasetIds.includes(MAP_DATASET_IDS.arc)) {
    layers.push({
      id: 'moi-arc-layer',
      type: 'arc',
      config: {
        dataId: MAP_DATASET_IDS.arc,
        label: 'OD Arc',
        color: [255, 177, 27],
        colorField: {
          name: 'mode_label',
          type: 'string',
        },
        colorScale: 'ordinal',
        columns: {
          lat0: 'source_lat',
          lng0: 'source_lng',
          lat1: 'target_lat',
          lng1: 'target_lng',
        },
        isVisible: true,
        visConfig: {
          opacity: 0.8,
          thickness: 3,
          colorRange: MODE_COLOR_RANGE,
          sizeRange: [0, 6],
          targetColor: [255, 255, 255],
        },
        hidden: false,
        textLabel: [],
      },
      visualChannels: {
        colorField: {
          name: 'mode_label',
          type: 'string',
        },
        colorScale: 'ordinal',
        sizeField: null,
        sizeScale: 'linear',
      },
    });

    filters.push({
      id: 'moi-arc-time-filter',
      dataId: MAP_DATASET_IDS.arc,
      name: 'timestamp_ms',
      type: 'timeRange',
      view: 'enlarged',
      enabled: true,
      fixedDomain: true,
      isAnimating: false,
      domain: playbackDomainMs,
      value: playbackValueMs,
      plotType: 'histogram',
      animationWindow: 'free',
      speed: PLAYBACK_INITIAL_SPEED,
      timeFormat: PLAYBACK_TIME_FORMAT,
      defaultTimeFormat: PLAYBACK_TIME_FORMAT,
      timezone: PLAYBACK_TIMEZONE,
      step: 60_000,
    });
  }

  if (datasetIds.includes(MAP_DATASET_IDS.heatmap)) {
    layers.push({
      id: 'moi-heatmap-layer',
      type: 'heatmap',
      config: {
        dataId: MAP_DATASET_IDS.heatmap,
        label: 'Heatmap',
        color: [203, 27, 69],
        columns: {
          lat: 'lat',
          lng: 'lng',
        },
        isVisible: true,
        visConfig: {
          opacity: 0.72,
          radius: 32,
          colorRange: MODE_COLOR_RANGE,
        },
        hidden: false,
        textLabel: [],
      },
      visualChannels: {
        weightField: null,
        weightScale: 'linear',
      },
    });
  }

  return {
    version: 'v1' as const,
    config: {
      visState: {
        filters,
        layers,
        interactionConfig: {
          tooltip: {
            enabled: true,
            fieldsToShow: {
              [MAP_DATASET_IDS.trips]: [
                {name: 'agent_id'},
                {name: 'segment_index'},
                {name: 'mode_label'},
                {name: 'start_time'},
                {name: 'end_time'},
              ],
              [MAP_DATASET_IDS.arc]: [
                {name: 'agent_id'},
                {name: 'segment_index'},
                {name: 'mode_label'},
                {name: 'timestamp'},
              ],
              [MAP_DATASET_IDS.heatmap]: [
                {name: 'agent_id'},
                {name: 'point_index'},
                {name: 'mode_label'},
                {name: 'timestamp'},
              ],
            },
            compareMode: false,
            compareType: 'absolute',
          },
          brush: {enabled: false, size: 0.5},
          geocoder: {enabled: false},
          coordinate: {enabled: false},
        },
        layerBlending: 'normal',
        splitMaps: [],
        animationConfig: {
          currentTime: playbackValueMs[1],
          domain: playbackDomainMs,
          speed: PLAYBACK_INITIAL_SPEED,
        },
      },
      mapState: {
        bearing: 18,
        dragRotate: true,
        latitude: 25.111019220248266,
        longitude: 121.4945181576129,
        pitch: 44,
        zoom: 10.6078,
        isSplit: false,
      },
      mapStyle: {
        styleType: 'dark-matter',
        topLayerGroups: {},
        visibleLayerGroups: {
          label: true,
          road: true,
          border: false,
          building: true,
          water: true,
          land: true,
          '3d building': true,
        },
        threeDBuildingColor: [218.82023004728618, 223.47597962276103, 225.4219094078171],
      },
    },
  };
}

export function replaceMapDatasets(
  roomStore: RoomStoreWithKepler,
  mapId: string,
  applied: AppliedScenario,
  datasets: DatasetDescriptor[],
): void {
  const state = roomStore.getState();
  const datasetIds = datasets.map((dataset) => dataset.id);

  for (const datasetId of Object.values(MAP_DATASET_IDS)) {
    state.kepler.removeDatasetFromMaps(datasetId);
  }

  const addDataToMap = (state.kepler as KeplerSliceState['kepler'] & {
    addDataToMap: (targetMapId: string, payload: unknown) => void;
  }).addDataToMap;

  addDataToMap(mapId, {
    datasets: datasets.map((dataset) => ({
      info: {
        label: dataset.label,
        id: dataset.id,
      },
      data: dataset.processed,
    })),
    options: {
      autoCreateLayers: false,
      centerMap: applied.requestId === 1,
      keepExistingConfig: false,
    },
  });

  state.kepler.addConfigToMap(
    mapId,
    buildKeplerMapConfig(applied, datasetIds) as never,
  );
}

export function syncPlaybackWindow(
  roomStore: RoomStoreWithKepler,
  mapId: string,
  timeRange: TimeRangeMilliseconds,
  timeScale: number,
): void {
  const currentMap = roomStore.getState().kepler.map[mapId];
  const filterIndex = currentMap?.visState.filters.findIndex(
    (filter) => filter.id === 'moi-arc-time-filter',
  );

  if (filterIndex == null || filterIndex < 0) {
    return;
  }

  const playbackDomainMs = PLAYBACK_DOMAIN.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];
  const playbackValueMs = timeRange.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];

  roomStore.getState().kepler.dispatchAction(mapId, setFilter(filterIndex, 'value', playbackValueMs));
  roomStore.getState().kepler.dispatchAction(
    mapId,
    updateFilterAnimationSpeed(filterIndex, timeScale),
  );
  roomStore.getState().kepler.dispatchAction(
    mapId,
    setAnimationConfig({
      currentTime: playbackValueMs[1],
      domain: playbackDomainMs,
      speed: timeScale,
      timeSteps: null,
      defaultTimeFormat: null,
      timeFormat: PLAYBACK_TIME_FORMAT,
      timezone: PLAYBACK_TIMEZONE,
    }),
  );
}
