// 這個檔案就是目前測試版的 Control menu，負責切換圖層、透明度和載具模式。
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Slider,
} from '@sqlrooms/ui';
import {Gauge} from 'lucide-react';
import {summarizeLayers} from '../../lib/controller';
import {MODE_DEFINITIONS} from '../../constants/modes';
import {useRoomStore} from '../../app/store';

function opacityToSliderValue(opacity: number): number {
  return Math.round(Math.pow(Math.max(0, Math.min(1, opacity)), 1 / 1.6) * 100);
}

function sliderValueToOpacity(value: number): number {
  const normalized = Math.max(0, Math.min(100, value)) / 100;
  return Math.pow(normalized, 1.6);
}

export function ControlMenu() {
  const draft = useRoomStore((state) => state.moi.draft);
  const runStatus = useRoomStore((state) => state.moi.runStatus);
  const lastError = useRoomStore((state) => state.moi.lastError);
  const isPlaying = useRoomStore((state) => state.moi.isPlaying);
  const layerOpacity = useRoomStore((state) => state.moi.layerOpacity);
  const setLayerEnabled = useRoomStore((state) => state.moi.setLayerEnabled);
  const setLayerOpacity = useRoomStore((state) => state.moi.setLayerOpacity);
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
              <strong>{summarizeLayers(draft.layers)}</strong>
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
              <span>Layers</span>
              <Badge variant="outline">{summarizeLayers(draft.layers)}</Badge>
            </div>
            <div className="space-y-2">
              <div className="moi-layer-control-row">
                <label className="moi-layer-toggle">
                  <Checkbox
                    checked={draft.layers.arc}
                    onCheckedChange={(checked) => setLayerEnabled('arc', checked === true)}
                  />
                  <span>Arc</span>
                </label>
                <Slider
                  className="moi-layer-slider"
                  disabled={!draft.layers.arc}
                  max={100}
                  min={0}
                  step={1}
                  value={[opacityToSliderValue(layerOpacity.arc)]}
                  onValueChange={(value) => setLayerOpacity('arc', sliderValueToOpacity(value[0] ?? 0))}
                />
                <strong className="moi-layer-opacity-value">{Math.round(layerOpacity.arc * 100)}%</strong>
              </div>
              <div className="moi-layer-control-row">
                <label className="moi-layer-toggle">
                  <Checkbox
                    checked={draft.layers.trips}
                    onCheckedChange={(checked) => setLayerEnabled('trips', checked === true)}
                  />
                  <span>Trip</span>
                </label>
                <Slider
                  className="moi-layer-slider"
                  disabled={!draft.layers.trips}
                  max={100}
                  min={0}
                  step={1}
                  value={[opacityToSliderValue(layerOpacity.trips)]}
                  onValueChange={(value) => setLayerOpacity('trips', sliderValueToOpacity(value[0] ?? 0))}
                />
                <strong className="moi-layer-opacity-value">{Math.round(layerOpacity.trips * 100)}%</strong>
              </div>
            </div>
          </div>
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
