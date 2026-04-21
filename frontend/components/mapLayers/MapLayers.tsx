// 這個檔案就是目前地圖主畫面，負責把 kepler 地圖、資料同步、heatmap customLayers 和播放循環組起來。
import {Card} from '@sqlrooms/ui';
import {useRef} from 'react';
import {PlaybackLoop} from './PlaybackLoop';
import {ScenarioDataSync} from './ScenarioDataSync';
import {KeplerMapContainer} from './KeplerMapContainer';
import {useHeatmapCustomLayers} from '../layers/heatmapLayer/useHeatmapCustomLayers';
import {useBoundaryCustomLayers} from '../layers/boundaryLayer/useBoundaryCustomLayers';
import {useArcCustomLayers} from '../layers/odArcLayer/useArcCustomLayers';
import {useTripCustomLayers} from '../layers/tripsLayer/useTripCustomLayers';
import {useRoomStore} from '../../app/store';
import type {
  ArcCacheEntry,
  TripCacheEntry,
} from './scenario/scenarioDataSyncHelpers';

export function MapLayers() {
  const currentMapId = useRoomStore((state) => state.kepler.config.currentMapId);
  const tripCacheRef = useRef(new Map<string, TripCacheEntry>());
  const arcCacheRef = useRef(new Map<string, ArcCacheEntry>());
  const {layers: heatmapCustomLayers} = useHeatmapCustomLayers(tripCacheRef);
  const {layers: tripCustomLayers} = useTripCustomLayers(tripCacheRef);
  const {layers: boundaryCustomLayers} = useBoundaryCustomLayers();
  const {layers: arcCustomLayers, onDeckClick} = useArcCustomLayers(arcCacheRef, currentMapId);
  const customLayers = [
    ...boundaryCustomLayers,
    ...heatmapCustomLayers,
    ...tripCustomLayers,
    ...arcCustomLayers,
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
          />
        </div>
      </div>
    </div>
  );
}
