// 這個檔案負責建立會跟時間軸同步播放的 deck.gl TripsLayer custom layer。
import {TripsLayer} from '@deck.gl/geo-layers';
import {useMemo, type MutableRefObject} from 'react';
import {useRoomStore} from '../../../app/store';
import {usePlaybackLayerTimeRange} from '../../../app/usePlaybackRuntime';
import {MODE_DEFINITIONS} from '../../../constants/modes';
import {
  millisecondsRangeToSeconds,
  PLAYBACK_DOMAIN,
} from '../../../lib/timeplayback';
import type {TripLayerDatum} from '../../../types';
import {
  buildScenarioCacheKey,
  type TripCacheEntry,
} from '../../mapLayers/scenario/scenarioDataSyncHelpers';
import {buildTripLayerData} from './tripTransform';

const TRIP_LAYER_ID = 'moi-trip-custom-layer';
const TRIP_BLEND_PARAMETERS = {
  depthTest: false,
  blend: true,
  blendColorSrcFactor: 'src-alpha',
  blendColorDstFactor: 'one',
  blendColorOperation: 'add',
} as const;

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((digit) => `${digit}${digit}`).join('')
    : normalized;

  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    alpha,
  ];
}

export function useTripCustomLayers(
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>,
) {
  const applied = useRoomStore((state) => state.moi.applied);
  const runStatus = useRoomStore((state) => state.moi.runStatus);
  const tripOpacity = useRoomStore((state) => state.moi.layerOpacity.trips);
  const playbackTimeRange = usePlaybackLayerTimeRange();

  const scenarioCacheKey = useMemo(
    () => buildScenarioCacheKey(applied.datasetId, applied.modes),
    [applied.datasetId, applied.modes],
  );

  const tripCacheEntry = useMemo(
    () => tripCacheRef.current.get(scenarioCacheKey) ?? null,
    [runStatus, scenarioCacheKey, tripCacheRef],
  );

  const modeTripColors = useMemo(
    () => {
      const colors = new Map<number, [number, number, number, number]>();
      for (const mode of MODE_DEFINITIONS) {
        colors.set(mode.code, hexToRgba(mode.tripColor, 235));
      }
      return colors;
    },
    [],
  );

  const tripRows = useMemo(() => {
    if (!applied.layers.trips || applied.modes.length === 0 || !tripCacheEntry?.trajectoryRows.length) {
      return [];
    }

    return buildTripLayerData(
      tripCacheEntry.trajectoryRows,
      applied.modes,
      millisecondsRangeToSeconds(PLAYBACK_DOMAIN),
    );
  }, [
    applied.datasetId,
    applied.layers.trips,
    applied.modes,
    runStatus,
    scenarioCacheKey,
    tripCacheEntry,
  ]);

  return useMemo(() => {
    if (!applied.layers.trips || tripRows.length === 0) {
      return {layers: [] as unknown[]};
    }

    const activeWindowMs = Math.max(0, playbackTimeRange[1] - playbackTimeRange[0]);

    return {
      layers: [
        new TripsLayer<TripLayerDatum>({
          id: TRIP_LAYER_ID,
          data: tripRows,
          currentTime: playbackTimeRange[1],
          fadeTrail: true,
          getColor: (row: TripLayerDatum) => modeTripColors.get(row.mode) ?? [255, 150, 150, 235],
          getPath: (row: TripLayerDatum) => row.path,
          getTimestamps: (row: TripLayerDatum) => row.timestamps,
          getWidth: 3,
          jointRounded: true,
          capRounded: true,
          opacity: tripOpacity,
          parameters: TRIP_BLEND_PARAMETERS,
          pickable: true,
          trailLength: activeWindowMs,
          widthMinPixels: 1,
          widthScale: 1,
        } as any),
      ],
    };
  }, [
    applied.layers.trips,
    modeTripColors,
    playbackTimeRange,
    tripOpacity,
    tripRows,
  ]);
}
