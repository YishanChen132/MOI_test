import {fitBounds} from '@kepler.gl/actions';
import {ArcLayer} from '@deck.gl/layers';
import {useCallback, useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {roomStore, useRoomStore} from '../../../app/store';
import {MODE_DEFINITIONS} from '../../../constants/modes';
import type {ArcDatum} from '../../../types';
import {
  buildScenarioCacheKey,
  type ArcCacheEntry,
} from '../../mapLayers/scenario/scenarioDataSyncHelpers';

const ARC_LAYER_ID = 'moi-arc-custom-layer';
const ARC_BLEND_PARAMETERS = {
  depthTest: false,
  blend: true,
  blendColorSrcFactor: 'src-alpha',
  blendColorDstFactor: 'one-minus-src-alpha',
} as const;

type DeckClickInfo = {
  layer?: {id?: string} | null;
  object?: {arc_key?: string} | null;
};

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((digit) => `${digit}${digit}`).join('')
    : normalized;

  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function getArcBounds(arcRows: readonly ArcDatum[]): [number, number, number, number] | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const row of arcRows) {
    minLng = Math.min(minLng, row.source_lng, row.target_lng);
    minLat = Math.min(minLat, row.source_lat, row.target_lat);
    maxLng = Math.max(maxLng, row.source_lng, row.target_lng);
    maxLat = Math.max(maxLat, row.source_lat, row.target_lat);
  }

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    return null;
  }

  if (minLng === maxLng) {
    minLng -= 0.01;
    maxLng += 0.01;
  }

  if (minLat === maxLat) {
    minLat -= 0.01;
    maxLat += 0.01;
  }

  return [minLng, minLat, maxLng, maxLat];
}

export function useArcCustomLayers(
  arcCacheRef: MutableRefObject<Map<string, ArcCacheEntry>>,
  mapId: string | null,
) {
  const applied = useRoomStore((state) => state.moi.applied);
  const runStatus = useRoomStore((state) => state.moi.runStatus);
  const arcOpacity = useRoomStore((state) => state.moi.layerOpacity.arc);
  const selectedArcKey = useRoomStore((state) => state.moi.selectedArcKey);
  const setSelectedArc = useRoomStore((state) => state.moi.setSelectedArc);
  const clearSelectedArc = useRoomStore((state) => state.moi.clearSelectedArc);
  const lastFitKeyRef = useRef<string | null>(null);

  const scenarioCacheKey = useMemo(
    () => buildScenarioCacheKey(applied.datasetId, applied.modes),
    [applied.datasetId, applied.modes],
  );

  const arcCacheEntry = useMemo(
    () => arcCacheRef.current.get(scenarioCacheKey) ?? null,
    [arcCacheRef, runStatus, scenarioCacheKey],
  );

  const modeColors = useMemo(
    () =>
      new Map(
        MODE_DEFINITIONS.map((mode) => [mode.code, hexToRgb(mode.color)]),
      ),
    [],
  );

  const visibleArcRows = useMemo(() => {
    const arcRows = arcCacheEntry?.arcRows ?? [];
    const [timeStart, timeEnd] = applied.timeRange;

    return arcRows.filter(
      (row) => {
        const timestampMsOfDay = row.timestamp * 1_000;
        return timestampMsOfDay >= timeStart && timestampMsOfDay <= timeEnd;
      },
    );
  }, [applied.timeRange, arcCacheEntry]);

  useEffect(() => {
    if (!mapId || !applied.layers.arc || !arcCacheEntry?.arcRows.length) {
      return;
    }

    if (lastFitKeyRef.current === scenarioCacheKey) {
      return;
    }

    const bounds = getArcBounds(arcCacheEntry.arcRows);
    if (!bounds) {
      return;
    }

    lastFitKeyRef.current = scenarioCacheKey;
    roomStore.getState().kepler.dispatchAction(mapId, fitBounds(bounds));
  }, [applied.layers.arc, arcCacheEntry, mapId, scenarioCacheKey]);

  useEffect(() => {
    if (!selectedArcKey) {
      return;
    }

    const isStillVisible =
      applied.layers.arc &&
      visibleArcRows.some((row) => row.arc_key === selectedArcKey);

    if (!isStillVisible) {
      clearSelectedArc();
    }
  }, [applied.layers.arc, clearSelectedArc, selectedArcKey, visibleArcRows]);

  const hasSelectedArc = useMemo(
    () => Boolean(selectedArcKey && visibleArcRows.some((row) => row.arc_key === selectedArcKey)),
    [selectedArcKey, visibleArcRows],
  );

  const onDeckClick = useCallback((info: unknown) => {
    const deckInfo = info as DeckClickInfo | null;

    if (deckInfo?.object || deckInfo?.layer?.id === ARC_LAYER_ID) {
      return;
    }

    clearSelectedArc();
  }, [clearSelectedArc]);

  return useMemo(() => {
    if (!applied.layers.arc || visibleArcRows.length === 0) {
      return {
        layers: [] as unknown[],
        onDeckClick,
      };
    }

    const defaultAlpha = Math.round(Math.max(48, Math.min(255, arcOpacity * 255)));
    const fadedAlpha = Math.round(Math.max(20, defaultAlpha * 0.2));
    const selectedAlpha = Math.round(Math.max(defaultAlpha, Math.min(255, defaultAlpha * 1.35)));

    return {
      layers: [
        new ArcLayer({
          id: ARC_LAYER_ID,
          data: visibleArcRows,
          pickable: true,
          parameters: ARC_BLEND_PARAMETERS,
          widthUnits: 'pixels',
          getSourcePosition: (row: any) => [row.source_lng, row.source_lat],
          getTargetPosition: (row: any) => [row.target_lng, row.target_lat],
          getWidth: (row: any) => {
            if (!hasSelectedArc) {
              return 3;
            }

            return row.arc_key === selectedArcKey ? 5.5 : 2;
          },
          getSourceColor: (row: any) => {
            const baseColor = modeColors.get(row.mode) ?? [160, 210, 255];
            if (!hasSelectedArc) {
              return [...baseColor, defaultAlpha];
            }

            if (row.arc_key === selectedArcKey) {
              return [255, 255, 255, selectedAlpha];
            }

            return [...baseColor, fadedAlpha];
          },
          getTargetColor: (row: any) => {
            const baseColor = modeColors.get(row.mode) ?? [160, 210, 255];
            if (!hasSelectedArc) {
              return [...baseColor, defaultAlpha];
            }

            if (row.arc_key === selectedArcKey) {
              return [255, 255, 255, selectedAlpha];
            }

            return [...baseColor, fadedAlpha];
          },
          onClick: (info: DeckClickInfo) => {
            const arcKey = info.object?.arc_key ?? null;
            if (arcKey) {
              setSelectedArc(arcKey);
            }
          },
        } as any),
      ],
      onDeckClick,
    };
  }, [
    applied.layers.arc,
    arcOpacity,
    hasSelectedArc,
    modeColors,
    onDeckClick,
    selectedArcKey,
    setSelectedArc,
    visibleArcRows,
  ]);
}
