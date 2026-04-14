// 這個檔案就是目前地圖主畫面，負責把 kepler 地圖、資料同步和播放循環組起來。
import {KeplerMapContainer} from '@sqlrooms/kepler';
import {Card} from '@sqlrooms/ui';
import {PlaybackLoop} from './PlaybackLoop';
import {ScenarioDataSync} from './ScenarioDataSync';
import {useRoomStore} from '../../app/store';

export function MapLayers() {
  const currentMapId = useRoomStore((state) => state.kepler.config.currentMapId);

  if (!currentMapId) {
    return (
      <Card className="flex h-full items-center justify-center border-border/70 bg-card/85 shadow-lg">
        <div className="text-sm text-muted-foreground">Initializing kepler map…</div>
      </Card>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/55 shadow-2xl backdrop-blur-md">
      <ScenarioDataSync mapId={currentMapId} />
      <PlaybackLoop mapId={currentMapId} />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <KeplerMapContainer mapId={currentMapId} />
        </div>
      </div>
    </div>
  );
}
