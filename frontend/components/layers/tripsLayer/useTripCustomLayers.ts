// 這個檔案負責建立會跟時間軸同步播放的 deck.gl TripsLayer custom layer。
import {TripsLayer} from '@deck.gl/geo-layers';
import {ScatterplotLayer} from '@deck.gl/layers';
import {useMemo, type MutableRefObject} from 'react';
import {useRoomStore} from '../../../app/store';
import {usePlaybackLayerTimeRange} from '../../../app/usePlaybackRuntime';
import {MODE_DEFINITIONS} from '../../../constants/modes';
import {
  millisecondsRangeToSeconds,
  PLAYBACK_DOMAIN,
} from '../../../lib/timeplayback';
import type {TripLayerDatum, TripTrailPointDatum} from '../../../types';
import {
  buildScenarioCacheKey,
  getTripCacheEntry,
  type TripCacheEntry,
} from '../../mapLayers/scenario/scenarioDataSyncHelpers';
import type {ScenarioViewportState} from '../../mapLayers/scenario/useScenarioViewportBounds';
import {buildTripLayerData, buildTripTrailPointData} from './tripTransform';

const TRIP_LAYER_ID = 'moi-trip-custom-layer';
const TRIP_POINT_LAYER_ID = 'moi-trip-point-layer';
const TRIP_POINT_FULL_OPACITY_ZOOM = 13.2;
const TRIP_TRANSITION_ZOOM = 11.6;
const TRIP_LINE_FULL_OPACITY_ZOOM = 10.2;
const TRIP_BLEND_PARAMETERS = {
  depthTest: false,
  blend: true,
  blendColorSrcFactor: 'src-alpha',
  blendColorDstFactor: 'one',
  blendColorOperation: 'add',
} as const;
const TRIP_POINT_BLEND_PARAMETERS = {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getFadeProgress(value: number, start: number, end: number): number {
  if (start === end) {
    return value >= end ? 1 : 0;
  }

  return clamp((value - start) / (end - start), 0, 1);
}

export function useTripCustomLayers(
  tripCacheRef: MutableRefObject<Map<string, TripCacheEntry>>,
  viewportState: ScenarioViewportState,
  cacheRevision: number,
) {
  const applied = useRoomStore((state) => state.moi.applied);
  const runStatus = useRoomStore((state) => state.moi.runStatus);
  const tripOpacity = useRoomStore((state) => state.moi.layerOpacity.trips);
  const playbackTimeRange = usePlaybackLayerTimeRange();
  const {debouncedBoundsKey, zoom} = viewportState;

  const scenarioCacheKey = useMemo(
    () => buildScenarioCacheKey(applied.datasetId, applied.modes, debouncedBoundsKey),
    [applied.datasetId, applied.modes, debouncedBoundsKey],
  );

  const tripCacheEntry = useMemo(
    () => getTripCacheEntry(tripCacheRef, scenarioCacheKey),
    [cacheRevision, runStatus, scenarioCacheKey, tripCacheRef],
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

  const tripTrailPoints = useMemo(() => {
    if (!applied.layers.trips || applied.modes.length === 0 || !tripCacheEntry?.trajectoryRows.length) {
      return [];
    }

    return buildTripTrailPointData(
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

    const resolvedZoom = zoom ?? TRIP_LINE_FULL_OPACITY_ZOOM;
    const activeWindowMs = Math.max(0, playbackTimeRange[1] - playbackTimeRange[0]);
    const pointOpacity = tripOpacity * getFadeProgress(
      resolvedZoom,
      TRIP_TRANSITION_ZOOM,
      TRIP_POINT_FULL_OPACITY_ZOOM,
    );
    const lineOpacity = tripOpacity * (1 - getFadeProgress(
      resolvedZoom,
      TRIP_LINE_FULL_OPACITY_ZOOM,
      TRIP_TRANSITION_ZOOM,
    ));
    const visibleTripTrailPoints = tripTrailPoints.filter(
      (point) =>
        point.timestamp_ms >= playbackTimeRange[0] &&
        point.timestamp_ms <= playbackTimeRange[1],
    );

    return {
      layers: [
        ...(lineOpacity > 0
          ? [
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
              opacity: lineOpacity,
              parameters: TRIP_BLEND_PARAMETERS,
              pickable: true,
              trailLength: activeWindowMs,
              widthMinPixels: 1,
              widthScale: 1,
            } as any),
          ]
          : []),
        ...(pointOpacity > 0
          ? [
          new ScatterplotLayer<TripTrailPointDatum>({
            id: TRIP_POINT_LAYER_ID,
            data: visibleTripTrailPoints,
            getFillColor: (row: TripTrailPointDatum) => modeTripColors.get(row.mode) ?? [255, 150, 150, 235],
            getPosition: (row: TripTrailPointDatum) => [row.lng, row.lat],
            getRadius: 3.2,
            opacity: pointOpacity,
            parameters: TRIP_POINT_BLEND_PARAMETERS,
            pickable: true,
            radiusMaxPixels: 4,
            radiusMinPixels: 1,
            radiusUnits: 'pixels',
            stroked: false,
          })
          ]
          : []),
      ],
    };
  }, [
    applied.layers.trips,
    modeTripColors,
    playbackTimeRange,
    tripOpacity,
    tripRows,
    tripTrailPoints,
    zoom,
  ]);
}
