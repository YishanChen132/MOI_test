// 這個檔案負責渲染地圖旁的控制面板，讓使用者切換模式與場景。
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
} from '@sqlrooms/ui';
import {Gauge} from 'lucide-react';
import {summarizeLayers} from '../lib/controller';
import {MODE_DEFINITIONS} from '../lib/modes';
import {useRoomStore} from '../store';

export function QueryControlPanel() {
  const draft = useRoomStore((state) => state.moi.draft);
  const runStatus = useRoomStore((state) => state.moi.runStatus);
  const lastError = useRoomStore((state) => state.moi.lastError);
  const isPlaying = useRoomStore((state) => state.moi.isPlaying);
  const setModeEnabled = useRoomStore((state) => state.moi.setModeEnabled);

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="border-border/70 bg-card/85 shadow-lg backdrop-blur-md">
        <CardHeader className="space-y-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Control menu
            </CardTitle>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="moi-mini-stat">
              <span>Status</span>
              <strong>{runStatus}</strong>
            </div>
            <div className="moi-mini-stat">
              <span>Layers</span>
              <strong>{summarizeLayers({trips: false, arc: true, heatmap: false})}</strong>
            </div>
            <div className="moi-mini-stat">
              <span>Playback</span>
              <strong>{isPlaying ? 'Playing' : 'Paused'}</strong>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Mobility modes</span>
              <Badge variant="outline">{draft.modes.length} selected</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MODE_DEFINITIONS.map((mode) => (
                <label key={mode.code} className="moi-toggle-row">
                  <Checkbox
                    checked={draft.modes.includes(mode.code)}
                    onCheckedChange={(checked) => setModeEnabled(mode.code, checked === true)}
                  />
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{backgroundColor: mode.color}}
                    />
                    {mode.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {lastError ? (
            <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {lastError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
