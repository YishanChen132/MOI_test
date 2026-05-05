// 這個檔案負責把 flowmap data 包成 deck.gl custom layer，並處理最小的 flow 選取狀態。
import {FlowmapLayer} from '@flowmap.gl/layers';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRoomStore} from '../../app/store';
import type {FlowmapFlow} from './flowmapTypes';
import {useFlowmapData} from './useFlowmapData';

const FLOWMAP_COLOR_SCHEME = 'Teal';
const FLOWMAP_HIGHLIGHT_COLOR = '#FFD166';


type DeckClickInfo = {
  object?: unknown;
};

type FlowmapPickingInfoObject = {
  type?: string;
  flow?: FlowmapFlow;
  origin?: string | Record<string, unknown>;
  dest?: string | Record<string, unknown>;
  count?: number;
};

type FlowmapPickingInfo = {
  x?: number;
  y?: number;
  object?: FlowmapPickingInfoObject | null;
};

export type FlowmapTooltipState = {
  x: number;
  y: number;
  originLabel: string;
  destLabel: string;
  count: number;
};

function isPickedFlow(
  object: FlowmapPickingInfoObject | null | undefined,
): object is FlowmapPickingInfoObject & {flow: FlowmapFlow} {
  return Boolean(
    object &&
    object.flow &&
    typeof object.flow.id === 'string',
  );
}

function isHoveredFlow(
  object: FlowmapPickingInfoObject | null | undefined,
): object is FlowmapPickingInfoObject & {count: number} {
  return Boolean(
    object &&
    object.type === 'flow' &&
    object.origin &&
    object.dest &&
    typeof object.count === 'number',
  );
}

function shortenCoordinateLabel(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/-?\d+(?:\.\d+)?/g);
  if (!match || match.length < 2) {
    return value;
  }

  const lon = Number(match[0]);
  const lat = Number(match[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return value;
  }

  return `[${lon.toFixed(3)}, ${lat.toFixed(3)}]`;
}

function formatLocationLabel(location: string | Record<string, unknown> | undefined): string {
  if (typeof location === 'string' && location.trim()) {
    return shortenCoordinateLabel(location);
  }

  if (location && typeof location === 'object') {
    const name = location.name;
    if (typeof name === 'string' && name.trim()) {
      return shortenCoordinateLabel(name);
    }

    const id = location.id;
    if (typeof id === 'string' || typeof id === 'number') {
      return shortenCoordinateLabel(String(id));
    }

    const lon = location.lon;
    const lat = location.lat;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return `${lon.toFixed(3)}, ${lat.toFixed(3)}`;
    }
  }

  return 'Unknown';
}

export function useFlowmapLayer() {
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const flowmapOpacity = useRoomStore((state) => state.moi.flowmapOpacity);
  const selectedFlowId = useRoomStore((state) => state.moi.selectedFlowId);
  const setSelectedFlowId = useRoomStore((state) => state.moi.setSelectedFlowId);
  const clearSelectedFlowId = useRoomStore((state) => state.moi.clearSelectedFlowId);
  const {data} = useFlowmapData();
  const [hoveredFlowTooltip, setHoveredFlowTooltip] = useState<FlowmapTooltipState | null>(null);

  useEffect(() => {
    if (!selectedFlowId) {
      return;
    }

    const selectedFlowStillVisible = flowmapEnabled && data.flows.some((flow) => flow.id === selectedFlowId);
    if (!selectedFlowStillVisible) {
      clearSelectedFlowId();
    }
  }, [clearSelectedFlowId, data.flows, flowmapEnabled, selectedFlowId]);

  const onDeckClick = useCallback((info: unknown) => {
    const deckInfo = info as DeckClickInfo | null;
    if (!deckInfo?.object) {
      clearSelectedFlowId();
    }
  }, [clearSelectedFlowId]);

  useEffect(() => {
    if (!flowmapEnabled) {
      setHoveredFlowTooltip(null);
    }
  }, [flowmapEnabled]);

  const layers = useMemo(() => {
    if (!flowmapEnabled || data.locations.length === 0 || data.flows.length === 0) {
      return [] as unknown[];
    }

    const selectedFlow = data.flows.find((flow) => flow.id === selectedFlowId);

    return [
      new FlowmapLayer({
        id: 'moi-flowmap-layer',
        data,
        darkMode: true,
        colorScheme: FLOWMAP_COLOR_SCHEME,
        highlightColor: FLOWMAP_HIGHLIGHT_COLOR,
        opacity: flowmapOpacity,
        pickable: true,
        highlightedFlow: selectedFlow,
        getLocationId: (location: any) => location.id,
        getLocationLat: (location: any) => location.lat,
        getLocationLon: (location: any) => location.lon,
        getLocationName: (location: any) => location.name ?? location.id,
        getFlowOriginId: (flow: any) => flow.origin,
        getFlowDestId: (flow: any) => flow.dest,
        getFlowMagnitude: (flow: any) => flow.count,
        onClick: (info: FlowmapPickingInfo) => {
          const object = info.object;
          if (isPickedFlow(object)) {
            setSelectedFlowId(object.flow.id);
          }
        },
        onHover: (info: FlowmapPickingInfo | undefined) => {
          const object = info?.object;
          if (!info || !isHoveredFlow(object) || typeof info.x !== 'number' || typeof info.y !== 'number') {
            setHoveredFlowTooltip(null);
            return;
          }

          setHoveredFlowTooltip({
            x: info.x,
            y: info.y,
            originLabel: formatLocationLabel(object.origin),
            destLabel: formatLocationLabel(object.dest),
            count: object.count,
          });
        },
      } as any),
    ];
  }, [data, flowmapEnabled, flowmapOpacity, selectedFlowId, setSelectedFlowId]);

  return {
    hoveredFlowTooltip,
    layers,
    onDeckClick,
  };
}
