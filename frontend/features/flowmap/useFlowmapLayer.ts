// 這個檔案負責把 flowmap data 包成 deck.gl custom layer，並處理最小的 flow 選取狀態。
import {FlowmapLayer} from '@flowmap.gl/layers';
import {useCallback, useEffect, useMemo} from 'react';
import {useRoomStore} from '../../app/store';
import type {FlowmapFlow} from './flowmapTypes';
import {useFlowmapData} from './useFlowmapData';

const FLOWMAP_COLOR_SCHEME = 'Teal';
const FLOWMAP_HIGHLIGHT_COLOR = '#FFD166';

type DeckClickInfo = {
  object?: unknown;
};

type FlowmapLocationLike = {
  id?: string | number;
  name?: string;
  lon?: number;
  lat?: number;
};

type FlowmapPickingInfoObject = {
  flow: FlowmapFlow;
  origin: FlowmapLocationLike;
  dest: FlowmapLocationLike;
  count: number;
};

type FlowmapPickingInfo = {
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
): object is FlowmapPickingInfoObject {
  return Boolean(
    object &&
    object.flow &&
    typeof object.flow.id === 'string' &&
    object.origin &&
    object.dest &&
    typeof object.count === 'number',
  );
}

export function useFlowmapLayer() {
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const flowmapOpacity = useRoomStore((state) => state.moi.flowmapOpacity);
  const selectedFlowId = useRoomStore((state) => state.moi.selectedFlowId);
  const setSelectedFlowId = useRoomStore((state) => state.moi.setSelectedFlowId);
  const clearSelectedFlowId = useRoomStore((state) => state.moi.clearSelectedFlowId);
  const {data} = useFlowmapData();

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
        fadeEnabled: true,
        fadeAmount: 24,
        fadeOpacityEnabled: false,
        opacity: flowmapOpacity,
        pickable: true,
        highlightedFlow: selectedFlow,
        getLocationId: (location: any) => location.id,
        getLocationLat: (location: any) => location.lat,
        getLocationLon: (location: any) => location.lon,
        getFlowOriginId: (flow: any) => flow.origin,
        getFlowDestId: (flow: any) => flow.dest,
        getFlowMagnitude: (flow: any) => flow.count,
        onClick: (info: FlowmapPickingInfo) => {
          const object = info.object;
          if (isPickedFlow(object)) {
            setSelectedFlowId(object.flow.id);
          }
        },
      } as any),
    ];
  }, [data, flowmapEnabled, flowmapOpacity, selectedFlowId, setSelectedFlowId]);

  return {
    layers,
    onDeckClick,
  };
}
