// 這個檔案就是目前地圖主畫面，負責把 kepler 地圖、資料同步、heatmap customLayers 和播放循環組起來。
import {Card} from '@sqlrooms/ui';
import {useCallback, useRef, useState} from 'react';
import {PlaybackLoop} from './PlaybackLoop';
import {ScenarioDataSync} from './ScenarioDataSync';
import {KeplerMapContainer} from './KeplerMapContainer';
import {useHeatmapCustomLayers} from '../layers/heatmapLayer/useHeatmapCustomLayers';
import {useBoundaryCustomLayers} from '../layers/boundaryLayer/useBoundaryCustomLayers';
import {useArcCustomLayers} from '../layers/odArcLayer/useArcCustomLayers';
import {useTripCustomLayers} from '../layers/tripsLayer/useTripCustomLayers';
import {useRoomStore} from '../../app/store';
import {useFlowmapLayer} from '../../features/flowmap/useFlowmapLayer';
import type {
  ArcCacheEntry,
  TripCacheEntry,
} from './scenario/scenarioDataSyncHelpers';
import type {FlowmapTooltipState} from '../../features/flowmap/useFlowmapLayer';

type HoveredFlowObject = {
  type?: string;
  count?: number;
  origin?: {
    id?: string | number;
    name?: string;
    lon?: number;
    lat?: number;
  };
  dest?: {
    id?: string | number;
    name?: string;
    lon?: number;
    lat?: number;
  };
};

type DeckHoverInfo = {
  object?: HoveredFlowObject | null;
  layer?: {
    id?: string;
  } | null;
  x?: number;
  y?: number;
};

function formatLocationLabel(location: HoveredFlowObject['origin']): string {
  if (!location) {
    return 'Unknown';
  }

  if (typeof location.name === 'string' && location.name.trim()) {
    return location.name;
  }

  if (typeof location.id === 'string' || typeof location.id === 'number') {
    return String(location.id);
  }

  if (Number.isFinite(location.lon) && Number.isFinite(location.lat)) {
    return `${location.lon},${location.lat}`;
  }

  return 'Unknown';
}

function isFlowHoverInfo(info: DeckHoverInfo | null | undefined): info is DeckHoverInfo & {
  object: HoveredFlowObject;
  x: number;
  y: number;
} {
  return Boolean(
    info &&
    info.layer?.id === 'moi-flowmap-layer' &&
    info.object?.type === 'flow' &&
    typeof info.object.count === 'number' &&
    typeof info.x === 'number' &&
    typeof info.y === 'number',
  );
}

export function MapLayers() {
  const currentMapId = useRoomStore((state) => state.kepler.config.currentMapId);
  const tripCacheRef = useRef(new Map<string, TripCacheEntry>());
  const arcCacheRef = useRef(new Map<string, ArcCacheEntry>());
  const [hoveredFlowTooltip, setHoveredFlowTooltip] = useState<FlowmapTooltipState | null>(null);
  const {layers: heatmapCustomLayers} = useHeatmapCustomLayers(tripCacheRef);
  const {layers: tripCustomLayers} = useTripCustomLayers(tripCacheRef);
  const {layers: boundaryCustomLayers} = useBoundaryCustomLayers();
  const {layers: arcCustomLayers, onDeckClick: onArcDeckClick} = useArcCustomLayers(arcCacheRef, currentMapId);
  const {layers: flowmapCustomLayers, onDeckClick: onFlowmapDeckClick} = useFlowmapLayer();
  const onDeckClick = useCallback((info: unknown) => {
    onArcDeckClick(info);
    onFlowmapDeckClick(info);
  }, [onArcDeckClick, onFlowmapDeckClick]);
  const onDeckHover = useCallback((info: unknown) => {
    const hoverInfo = info as DeckHoverInfo | null;
    if (!isFlowHoverInfo(hoverInfo)) {
      setHoveredFlowTooltip(null);
      return;
    }

    setHoveredFlowTooltip({
      x: hoverInfo.x,
      y: hoverInfo.y,
      originLabel: formatLocationLabel(hoverInfo.object.origin),
      destLabel: formatLocationLabel(hoverInfo.object.dest),
      count: hoverInfo.object.count ?? 0,
    });
  }, []);
  const customLayers = [
    ...boundaryCustomLayers,
    ...heatmapCustomLayers,
    ...tripCustomLayers,
    ...arcCustomLayers,
    ...flowmapCustomLayers,
  ];

  if (!currentMapId) {
    return (
      <Card className="flex h-full items-center justify-center border-border/70 bg-card/85 shadow-lg">
        <div className="text-sm text-muted-foreground">Initializing kepler map…</div>
      </Card>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/55 shadow-2xl backdrop-blur-md">
      <ScenarioDataSync arcCacheRef={arcCacheRef} mapId={currentMapId} tripCacheRef={tripCacheRef} />
      <PlaybackLoop mapId={currentMapId} />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <KeplerMapContainer
            customLayers={customLayers}
            mapId={currentMapId}
            onDeckClick={onDeckClick}
            onDeckHover={onDeckHover}
          />
        </div>
        {hoveredFlowTooltip ? (
          <div
            className="pointer-events-none absolute z-20 min-w-[220px] rounded-lg border border-border/80 bg-card/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
            style={{
              left: hoveredFlowTooltip.x + 14,
              top: hoveredFlowTooltip.y + 14,
            }}
          >
            <div className="font-medium text-foreground">
              {hoveredFlowTooltip.originLabel} to {hoveredFlowTooltip.destLabel}
            </div>
            <div className="mt-1 text-muted-foreground">
              {hoveredFlowTooltip.count} flow{hoveredFlowTooltip.count === 1 ? '' : 's'}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
