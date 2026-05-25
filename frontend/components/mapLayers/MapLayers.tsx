// 這個檔案就是目前地圖主畫面，負責把 kepler 地圖、資料同步、heatmap customLayers 和播放循環組起來。
import {Card} from '@sqlrooms/ui';
import {useCallback, useState} from 'react';
import {PlaybackLoop} from './PlaybackLoop';
import {ScenarioDataSync} from './ScenarioDataSync';
import {KeplerMapContainer} from './KeplerMapContainer';
import {useHeatmapCustomLayers} from '../layers/heatmapLayer/useHeatmapCustomLayers';
import {useBoundaryCustomLayers} from '../layers/boundaryLayer/useBoundaryCustomLayers';
import {useArcCustomLayers} from '../layers/odArcLayer/useArcCustomLayers';
import {useTripCustomLayers} from '../layers/tripsLayer/useTripCustomLayers';
import {useRoomStore} from '../../app/store';
import {useFlowmapLayer} from '../../features/flowmap/useFlowmapLayer';
import {
  sharedArcCacheRef,
  sharedTripCacheRef,
} from './scenario/scenarioDataSyncHelpers';
import {useScenarioViewportBounds} from './scenario/useScenarioViewportBounds';

export function MapLayers() {
  const currentMapId = useRoomStore((state) => state.kepler.config.currentMapId);
  const tripCacheRef = sharedTripCacheRef;
  const arcCacheRef = sharedArcCacheRef;
  const [cacheRevision, setCacheRevision] = useState(0);
  const handleScenarioCacheUpdated = useCallback(() => {
    setCacheRevision((currentValue) => currentValue + 1);
  }, []);
  const viewportState = useScenarioViewportBounds();
  const {layers: heatmapCustomLayers} = useHeatmapCustomLayers(tripCacheRef, viewportState, cacheRevision);
  const {layers: tripCustomLayers} = useTripCustomLayers(tripCacheRef, viewportState, cacheRevision);
  const {layers: boundaryCustomLayers} = useBoundaryCustomLayers();
  const {layers: arcCustomLayers, onDeckClick: onArcDeckClick} = useArcCustomLayers(
    arcCacheRef,
    currentMapId,
    viewportState,
    cacheRevision,
  );
  const {
    layers: flowmapCustomLayers,
    onDeckClick: onFlowmapDeckClick,
    hoveredFlowTooltip,
  } = useFlowmapLayer(viewportState, cacheRevision);
  const onDeckClick = useCallback((info: unknown) => {
    onArcDeckClick(info);
    onFlowmapDeckClick(info);
  }, [onArcDeckClick, onFlowmapDeckClick]);
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
      <ScenarioDataSync
        arcCacheRef={arcCacheRef}
        mapId={currentMapId}
        tripCacheRef={tripCacheRef}
        viewportState={viewportState}
        cacheRevision={cacheRevision}
        onScenarioCacheUpdated={handleScenarioCacheUpdated}
      />
      <PlaybackLoop mapId={currentMapId} />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <KeplerMapContainer
            customLayers={customLayers}
            mapId={currentMapId}
            onDeckClick={onDeckClick}
          />
        </div>
        {hoveredFlowTooltip ? (
          <div
            className="pointer-events-none absolute z-20 min-w-[140px] rounded-lg border border-slate-500/70 bg-slate-700/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
            style={{
              left: hoveredFlowTooltip.x + 14,
              top: hoveredFlowTooltip.y + 14,
            }}
          >
            <div className="font-medium text-slate-100">{hoveredFlowTooltip.title}</div>
            {hoveredFlowTooltip.subtitle ? (
              <div className="mt-1 text-[11px] text-slate-300">{hoveredFlowTooltip.subtitle}</div>
            ) : null}
            <div className="font-medium text-slate-100">
              {hoveredFlowTooltip.count} 條
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
