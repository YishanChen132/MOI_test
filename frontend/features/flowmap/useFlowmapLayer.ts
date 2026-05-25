// 這個檔案負責把 trajectory / road-node-transition / road-path 包成 deck.gl layers，並處理 tooltip 與 selection。
import {PathLayer} from '@deck.gl/layers';
import {FlowmapLayer} from '@flowmap.gl/layers';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRoomStore} from '../../app/store';
import type {ScenarioViewportState} from '../../components/mapLayers/scenario/useScenarioViewportBounds';
import {MODE_DEFINITIONS} from '../../constants/modes';
import type {
  FlowmapFlow,
  FlowmapLocation,
  FlowmapRoadSegment,
  FlowmapTooltipState,
} from './flowmapTypes';
import {useFlowmapData} from './useFlowmapData';

type DeckClickInfo = {
  object?: unknown;
};

type FlowmapPickingObject = {
  type?: string;
  flow?: FlowmapFlow;
  origin?: FlowmapLocation;
  dest?: FlowmapLocation;
  count?: number;
};

type FlowmapPickingInfo = {
  x?: number;
  y?: number;
  layer?: {id?: string};
  object?: FlowmapPickingObject | null;
};

type RoadFlowPickingInfoObject = {
  id?: string;
  edgeId?: string;
  count?: number;
  roadClass?: string;
  modeLabel?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
};

type RoadFlowPickingInfo = {
  x?: number;
  y?: number;
  object?: RoadFlowPickingInfoObject | null;
};

const FLOWMAP_COLOR_SCHEME = 'Teal';
const FLOWMAP_HIGHLIGHT_COLOR = '#FFD166';

export function useFlowmapLayer(
  viewportState: ScenarioViewportState,
  cacheRevision: number,
) {
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const flowmapOpacity = useRoomStore((state) => state.moi.flowmapOpacity);
  const selectedFlowId = useRoomStore((state) => state.moi.selectedFlowId);
  const setSelectedFlowId = useRoomStore((state) => state.moi.setSelectedFlowId);
  const clearSelectedFlowId = useRoomStore((state) => state.moi.clearSelectedFlowId);
  const {preset, data, roadSegments} = useFlowmapData(viewportState, cacheRevision);
  const [hoveredFlowTooltip, setHoveredFlowTooltip] = useState<FlowmapTooltipState | null>(null);

  useEffect(() => {
    if (!selectedFlowId) {
      return;
    }

    const stillVisible = preset.flowmapSourceType === 'road-path'
      ? roadSegments.some((segment) => segment.id === selectedFlowId)
      : data.flows.some((flow) => flow.id === selectedFlowId);
    if (!stillVisible) {
      clearSelectedFlowId();
    }
  }, [clearSelectedFlowId, data.flows, preset.flowmapSourceType, roadSegments, selectedFlowId]);

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
    if (!flowmapEnabled) {
      return [] as unknown[];
    }

    if (preset.flowmapSourceType === 'road-path') {
      if (roadSegments.length === 0) {
        return [] as unknown[];
      }

      const modeColors = new Map(
        MODE_DEFINITIONS.map((mode) => [mode.code, hexToRgb(mode.color)] as [number, [number, number, number]]),
      );
      return [
        new PathLayer<FlowmapRoadSegment>({
          id: 'moi-road-flowmap-layer',
          data: roadSegments,
          pickable: true,
          opacity: flowmapOpacity,
          widthUnits: 'pixels',
          widthMinPixels: 2,
          rounded: true,
          jointRounded: true,
          capRounded: true,
          getPath: (segment: FlowmapRoadSegment) => segment.path,
          getWidth: (segment: FlowmapRoadSegment) => {
            const emphasis = segment.id === selectedFlowId ? 1.6 : 1;
            return Math.max(2, Math.sqrt(segment.count) * 1.4 * emphasis);
          },
          getColor: (segment: FlowmapRoadSegment) => {
            const baseColor = modeColors.get(segment.mode) ?? [160, 210, 255];
            if (!selectedFlowId) {
              return [...baseColor, Math.round(flowmapOpacity * 255)];
            }
            if (segment.id === selectedFlowId) {
              return [255, 209, 102, 255];
            }
            return [...baseColor, Math.max(48, Math.round(flowmapOpacity * 120))];
          },
          onClick: (info: RoadFlowPickingInfo) => {
            const id = info.object?.id;
            if (typeof id === 'string') {
              setSelectedFlowId(id);
            }
          },
          onHover: (info: RoadFlowPickingInfo | undefined) => {
            const object = info?.object;
            if (!info || !object || typeof info.x !== 'number' || typeof info.y !== 'number' || typeof object.count !== 'number') {
              setHoveredFlowTooltip(null);
              return;
            }

            setHoveredFlowTooltip({
              x: info.x,
              y: info.y,
              title: object.sourceNodeId && object.targetNodeId
                ? `${object.sourceNodeId} -> ${object.targetNodeId}`
                : (object.edgeId ?? 'Road edge'),
              subtitle: [object.edgeId, object.roadClass, object.modeLabel].filter(Boolean).join(' | '),
              count: object.count,
            });
          },
          updateTriggers: {
            getWidth: [selectedFlowId],
            getColor: [selectedFlowId, flowmapOpacity],
          },
        } as any),
      ];
    }

    if (data.locations.length === 0 || data.flows.length === 0) {
      return [] as unknown[];
    }

    const highlightedFlow = data.flows.find((flow) => flow.id === selectedFlowId) ?? null;
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
        highlightedFlow,
        getLocationId: (location: FlowmapLocation) => location.id,
        getLocationLat: (location: FlowmapLocation) => location.lat,
        getLocationLon: (location: FlowmapLocation) => location.lon,
        getFlowOriginId: (flow: FlowmapFlow) => flow.origin,
        getFlowDestId: (flow: FlowmapFlow) => flow.dest,
        getFlowMagnitude: (flow: FlowmapFlow) => flow.count,
        onClick: (info: FlowmapPickingInfo) => {
          const flowId = info.object?.flow?.id;
          if (typeof flowId === 'string') {
            setSelectedFlowId(flowId);
          }
        },
        onHover: (info: FlowmapPickingInfo) => {
          if (!isFlowmapHoverInfo(info)) {
            setHoveredFlowTooltip(null);
            return;
          }

          const object = info.object!;
          const count = object.count!;
          setHoveredFlowTooltip({
            x: info.x,
            y: info.y,
            title: `${toLocationLabel(object.origin)} -> ${toLocationLabel(object.dest)}`,
            subtitle: [object.flow?.modeLabel, object.flow?.routeCount ? `${object.flow.routeCount} routes` : null].filter(Boolean).join(' | '),
            count,
          });
        },
      } as any),
    ];
  }, [
    data,
    flowmapEnabled,
    flowmapOpacity,
    preset.flowmapSourceType,
    roadSegments,
    selectedFlowId,
    setSelectedFlowId,
  ]);

  return {
    hoveredFlowTooltip,
    layers,
    onDeckClick,
  };
}

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

function isFlowmapHoverInfo(info: FlowmapPickingInfo | undefined): info is Required<Pick<FlowmapPickingInfo, 'x' | 'y' | 'object'>> & FlowmapPickingInfo {
  return Boolean(
    info &&
    info.layer?.id === 'moi-flowmap-layer' &&
    info.object &&
    info.object?.type === 'flow' &&
    typeof info.object.count === 'number' &&
    typeof info.x === 'number' &&
    typeof info.y === 'number',
  );
}

function toLocationLabel(location: FlowmapLocation | undefined): string {
  if (!location) {
    return 'Unknown';
  }

  return location.id;
}
