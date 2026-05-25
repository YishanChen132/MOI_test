import {WebMercatorViewport} from '@deck.gl/core';
import {useMemo} from 'react';
import {useRoomStore} from '../../../app/store';
import type {MapViewportBounds} from '../../../types';
import {buildViewportBoundsKey} from './scenarioDataSyncHelpers';
import {useDebouncedValue} from './useDebouncedValue';

const VIEWPORT_QUERY_DEBOUNCE_MS = 200;

type KeplerMapStateLike = {
  width?: number;
  height?: number;
  longitude?: number;
  latitude?: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
};

export type ScenarioViewportState = {
  debouncedBounds: MapViewportBounds | null;
  debouncedBoundsKey: string | null;
  zoom: number | null;
};

export function getViewportBounds(
  mapState: KeplerMapStateLike | null | undefined,
): MapViewportBounds | null {
  if (
    !mapState ||
    !Number.isFinite(mapState.width) ||
    !Number.isFinite(mapState.height) ||
    !Number.isFinite(mapState.longitude) ||
    !Number.isFinite(mapState.latitude) ||
    !Number.isFinite(mapState.zoom) ||
    mapState.width === 0 ||
    mapState.height === 0
  ) {
    return null;
  }

  const viewport = new WebMercatorViewport({
    width: mapState.width,
    height: mapState.height,
    longitude: mapState.longitude,
    latitude: mapState.latitude,
    zoom: mapState.zoom,
    bearing: mapState.bearing ?? 0,
    pitch: mapState.pitch ?? 0,
  });
  const corners = [
    viewport.unproject([0, 0]),
    viewport.unproject([mapState.width, 0]),
    viewport.unproject([0, mapState.height]),
    viewport.unproject([mapState.width, mapState.height]),
  ];
  const longitudes = corners.map(([longitude]) => longitude);
  const latitudes = corners.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const south = Math.min(...latitudes);
  const east = Math.max(...longitudes);
  const north = Math.max(...latitudes);

  if (![west, south, east, north].every(Number.isFinite)) {
    return null;
  }

  return {west, south, east, north};
}

export function useScenarioViewportBounds() {
  const mapState = useRoomStore((state) => {
    if (!state.kepler.config.currentMapId) {
      return null;
    }

    return (state.kepler.map[state.kepler.config.currentMapId]?.mapState ?? null) as KeplerMapStateLike | null;
  });

  const immediateBounds = useMemo(
    () => getViewportBounds(mapState),
    [mapState],
  );
  const zoom = useMemo(
    () => {
      const rawZoom = mapState?.zoom;
      return typeof rawZoom === 'number' && Number.isFinite(rawZoom) ? rawZoom : null;
    },
    [mapState],
  );
  const immediateBoundsKey = useMemo(
    () => (immediateBounds ? buildViewportBoundsKey(immediateBounds) : null),
    [immediateBounds],
  );
  const debouncedBounds = useDebouncedValue(immediateBounds, VIEWPORT_QUERY_DEBOUNCE_MS);
  const debouncedBoundsKey = useDebouncedValue(immediateBoundsKey, VIEWPORT_QUERY_DEBOUNCE_MS);

  return useMemo(
    () => ({
      debouncedBounds,
      debouncedBoundsKey,
      zoom,
    }),
    [
      debouncedBounds,
      debouncedBoundsKey,
      zoom,
    ],
  );
}
