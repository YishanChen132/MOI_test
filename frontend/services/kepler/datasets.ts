// 這個檔案負責把目前 scenario dataset 寫回 kepler map 並移除過期資料集。
import type {KeplerSliceState} from '@sqlrooms/kepler';
import {
  isArcDatasetId,
} from '../../components/layers/odArcLayer/arcKepler';
import {
  isTripDatasetId,
} from '../../components/layers/tripsLayer/tripKepler';
import type {
  AppliedScenario,
  LayerOpacity,
} from '../../types';
import {buildKeplerMapConfig} from './config';
import type {
  DatasetDescriptor,
  RoomStoreWithKepler,
} from './types';

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
