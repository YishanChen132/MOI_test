// 這個檔案負責把查詢後的資料和 kepler.gl 的圖層、時間設定接在一起，heatmap 改由 customLayers 顯示。
import {
  setAnimationConfig,
  setFilter,
} from '@kepler.gl/actions';
import type {KeplerSliceState} from '@sqlrooms/kepler';
import type {StoreApi} from 'zustand';
import {
  ARC_DATASET_IDS,
  ARC_TIME_FILTER_ID,
  ARC_TOOLTIP_FIELDS,
  buildArcLayerConfigs,
  buildArcTimeFilter,
  isArcDatasetId,
} from '../components/layers/odArcLayer/arcKepler';
import {
  isTripDatasetId,
} from '../components/layers/tripsLayer/tripKepler';
import {
  millisecondsOfDayToPlaybackEpochMs,
  PLAYBACK_DOMAIN,
  PLAYBACK_TIMEZONE,
  PLAYBACK_TIME_FORMAT,
} from './timeplayback';
import type {
  AppliedScenario,
  LayerOpacity,
  TimeRangeMilliseconds,
} from '../types';

const KEPLER_PASSIVE_SPEED = 1;
const DEFAULT_MAP_STATE = {
  bearing: 18,
  dragRotate: true,
  latitude: 25.111019220248266,
  longitude: 121.4945181576129,
  pitch: 44,
  zoom: 10.6078,
  isSplit: false,
};

export type DatasetDescriptor = {
  id: string;
  label: string;
  processed: unknown;
};

type RoomStoreWithKepler = StoreApi<KeplerSliceState>;

export function buildKeplerMapConfig(
  applied: AppliedScenario,
  datasetIds: readonly string[],
  layerOpacity: LayerOpacity,
  currentMapState?: Partial<typeof DEFAULT_MAP_STATE>,
) {
  const layers = [];
  const filters = [];
  const playbackDomainMs = PLAYBACK_DOMAIN.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];
  const playbackValueMs = applied.timeRange.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];
  const arcDatasetIds = datasetIds.filter(isArcDatasetId);

  if (arcDatasetIds.length > 0) {
    layers.push(...buildArcLayerConfigs(false, 0));
    filters.push(buildArcTimeFilter(arcDatasetIds, playbackDomainMs, playbackValueMs));
  }

  const arcTooltipFields = Object.fromEntries(
    ARC_DATASET_IDS.map((datasetId) => [datasetId, ARC_TOOLTIP_FIELDS]),
  );

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
              ...arcTooltipFields,
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
          speed: KEPLER_PASSIVE_SPEED,
        },
      },
      mapState: {
        ...DEFAULT_MAP_STATE,
        ...currentMapState,
      },
      mapStyle: {
        styleType: 'dark-matter',
        topLayerGroups: {},
        visibleLayerGroups: {
          label: true,
          road: true,
          border: false,
          building: true,
          water: false,
          land: true,
          '3d building': true,
        },
        threeDBuildingColor: [176, 176, 176],
      },
    },
  };
}

export function replaceMapDatasets(
  roomStore: RoomStoreWithKepler,
  mapId: string,
  applied: AppliedScenario,
  datasets: DatasetDescriptor[],
  layerOpacity: LayerOpacity,
): void {
  const state = roomStore.getState();
  const datasetIds = datasets.map((dataset) => dataset.id);
  const currentMap = state.kepler.map[mapId];
  const currentDatasetIds = Object.keys(currentMap?.visState.datasets ?? {}).filter(
    (datasetId) => isTripDatasetId(datasetId) || isArcDatasetId(datasetId),
  );

  const addDataToMap = (state.kepler as KeplerSliceState['kepler'] & {
    addDataToMap: (targetMapId: string, payload: unknown) => void;
  }).addDataToMap;

  for (const datasetId of currentDatasetIds) {
    if (!datasetIds.includes(datasetId)) {
      state.kepler.removeDatasetFromMaps(datasetId);
    }
  }

  if (datasets.length > 0) {
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
        centerMap: currentDatasetIds.length === 0 && applied.requestId === 1,
        keepExistingConfig: true,
      },
    });
  }

  state.kepler.addConfigToMap(
    mapId,
    buildKeplerMapConfig(applied, datasetIds, layerOpacity, currentMap?.mapState) as never,
  );
}

export function syncPlaybackWindow(
  roomStore: RoomStoreWithKepler,
  mapId: string,
  timeRange: TimeRangeMilliseconds,
): void {
  const currentMap = roomStore.getState().kepler.map[mapId];
  const filterIndex = currentMap?.visState.filters.findIndex(
    (filter) => filter.id === ARC_TIME_FILTER_ID,
  );

  const playbackDomainMs = PLAYBACK_DOMAIN.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];
  const playbackValueMs = timeRange.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];

  if (filterIndex != null && filterIndex >= 0) {
    roomStore.getState().kepler.dispatchAction(mapId, setFilter(filterIndex, 'value', playbackValueMs));
  }

  roomStore.getState().kepler.dispatchAction(
    mapId,
    setAnimationConfig({
      currentTime: playbackValueMs[1],
      domain: playbackDomainMs,
      speed: KEPLER_PASSIVE_SPEED,
      timeSteps: null,
      defaultTimeFormat: null,
      timeFormat: PLAYBACK_TIME_FORMAT,
      timezone: PLAYBACK_TIMEZONE,
    }),
  );
}
