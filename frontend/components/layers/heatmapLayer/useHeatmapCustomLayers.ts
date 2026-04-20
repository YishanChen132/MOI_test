// 這個檔案負責把 trip query 的 Arrow table 轉成原專案風格的 heatmap PathLayer customLayers。
import {useMemo, type MutableRefObject} from 'react';
import {useRoomStore} from '../../../app/store';
import {millisecondsRangeToSeconds} from '../../../lib/timeplayback';
import {
  buildScenarioCacheKey,
  type TripCacheEntry,
} from '../../mapLayers/scenario/scenarioDataSyncHelpers';
import {ArrowPathLayer} from './ArrowPathLayer';

const HEATMAP_BLEND_PARAMETERS = {
  depthTest: false,
  blend: true,
  blendColorSrcFactor: 'src-alpha',
  blendColorDstFactor: 'one',
  blendColorOperation: 'add',
} as const;
const HEATMAP_BASE_COLOR: [number, number, number, number] = [58, 120, 168, 178];
const HEATMAP_LIFT_COLOR: [number, number, number, number] = [220, 235, 248, 84];
const HEATMAP_QUANTIZATION_DIGITS = null;

export function useHeatmapCustomLayers(
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>,
) {
  const applied = useRoomStore((state) => state.moi.applied);
  const runStatus = useRoomStore((state) => state.moi.runStatus);
  const heatmapOpacity = useRoomStore((state) => state.moi.layerOpacity.heatmap);

  const scenarioCacheKey = useMemo(
    () => buildScenarioCacheKey(applied.datasetId, applied.modes),
    [applied.datasetId, applied.modes],
  );

  const tripCacheEntry = useMemo(
    () => tripCacheRef.current.get(scenarioCacheKey) ?? null,
    [runStatus, scenarioCacheKey, tripCacheRef],
  );

  const timeRangeSeconds = useMemo(
    () => millisecondsRangeToSeconds(applied.timeRange),
    [applied.timeRange],
  );

  return useMemo(() => {
    const arrowTable = tripCacheEntry?.arrowTable ?? null;

    if (!applied.layers.heatmap || applied.modes.length === 0 || !arrowTable) {
      return {layers: [] as unknown[]};
    }

    return {
      layers: [
        new ArrowPathLayer({
          id: 'heatmap',
          data: arrowTable,
          getPathColumn: 'paths',
          getModeColumn: 'modes',
          getTimestampColumn: 'timestamps',
          getColor: HEATMAP_BASE_COLOR,
          getWidth: 1.5,
          opacity: heatmapOpacity,
          pickable: false,
          visible: true,
          widthUnits: 'pixels',
          coordinateQuantizationDigits: HEATMAP_QUANTIZATION_DIGITS,
          timeRange: timeRangeSeconds,
          filterCategories: [...applied.modes],
          parameters: HEATMAP_BLEND_PARAMETERS,
        } as any),
        new ArrowPathLayer({
          id: 'heatmap-lift',
          data: arrowTable,
          getPathColumn: 'paths',
          getModeColumn: 'modes',
          getTimestampColumn: 'timestamps',
          getColor: HEATMAP_LIFT_COLOR,
          getWidth: 2.4,
          opacity: Math.max(0.16, heatmapOpacity * 0.28),
          pickable: false,
          visible: true,
          widthUnits: 'pixels',
          coordinateQuantizationDigits: HEATMAP_QUANTIZATION_DIGITS,
          timeRange: timeRangeSeconds,
          filterCategories: [...applied.modes],
          parameters: HEATMAP_BLEND_PARAMETERS,
        } as any),
      ],
    };
  }, [
    applied.layers.heatmap,
    applied.modes,
    heatmapOpacity,
    timeRangeSeconds,
    tripCacheEntry,
  ]);
}
