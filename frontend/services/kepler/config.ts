// 這個檔案負責建立 kepler map 的基礎視覺設定、tooltip、filter 和播放設定。
import {
  ARC_DATASET_IDS,
  ARC_TOOLTIP_FIELDS,
  buildArcLayerConfigs,
  buildArcTimeFilter,
  isArcDatasetId,
} from '../../components/layers/odArcLayer/arcKepler';
import {
  millisecondsOfDayToPlaybackEpochMs,
  PLAYBACK_DOMAIN,
} from '../../lib/timeplayback';
import type {
  AppliedScenario,
  LayerOpacity,
} from '../../types';

export const KEPLER_PASSIVE_SPEED = 1;

export const DEFAULT_MAP_STATE = {
  bearing: 18,
  dragRotate: true,
  latitude: 25.111019220248266,
  longitude: 121.4945181576129,
  pitch: 44,
  zoom: 10.6078,
  isSplit: false,
};

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
