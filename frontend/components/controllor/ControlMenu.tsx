// 這個檔案就是目前測試版的 Control menu，負責切換圖層、透明度和載具模式。
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Slider,
} from '@sqlrooms/ui';
import {Bus, Car, Eye, EyeOff, Footprints, Gauge, TrainFront} from 'lucide-react';
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

function countEnabledLayers(layers: {trips: boolean; arc: boolean; heatmap: boolean; boundary: boolean}): number {
  return [layers.trips, layers.arc, layers.heatmap, layers.boundary].filter(Boolean).length;
}

function getModeIcon(modeCode: number) {
  if (modeCode === 1) return Footprints;
  if (modeCode === 2) return Car;
  if (modeCode === 8) return Bus;
  return TrainFront;
}

function LayerVisibilityButton({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const Icon = checked ? Eye : EyeOff;

  return (
    <button
      type="button"
      className={`moi-layer-visibility-button${checked ? ' is-visible' : ''}`}
      aria-pressed={checked}
      title={label}
      onClick={onToggle}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
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
  const enabledLayerCount = countEnabledLayers(draft.layers);
  const layerSummary = summarizeLayers(draft.layers);

  return (
    <div className="moi-control-shell flex h-full flex-col gap-4">
      <Card className="moi-control-card border-border/70 bg-card/85 shadow-lg backdrop-blur-md">
        <CardHeader className="space-y-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="moi-control-title flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Control menu
            </CardTitle>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="moi-mini-stat">
              <span>Status</span>
              <strong>{runStatus.toUpperCase()}</strong>
            </div>
            <div className="moi-mini-stat">
              <span>Layers</span>
              <strong title={layerSummary}>{enabledLayerCount} active</strong>
            </div>
            <div className="moi-mini-stat">
              <span>Playback</span>
              <strong>{isPlaying ? 'PLAYING' : 'PAUSED'}</strong>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="moi-section-header flex items-center justify-between text-sm font-medium">
              <span className="moi-section-title">Mobility modes</span>
              <Badge className="moi-section-badge" variant="outline">{draft.modes.length} selected</Badge>
            </div>
            <div className="moi-mode-strip">
              {MODE_DEFINITIONS.map((mode) => {
                const Icon = getModeIcon(mode.code);
                const selected = draft.modes.includes(mode.code);

                return (
                  <button
                    key={mode.code}
                    type="button"
                    className={`moi-mode-icon-button${selected ? ' is-selected' : ''}`}
                    title={mode.label}
                    aria-pressed={selected}
                    onClick={() => setModeEnabled(mode.code, !selected)}
                  >
                    <Icon className="h-6 w-6" style={{color: selected ? mode.color : '#6b7280'}} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <div className="moi-section-header flex items-center justify-between text-sm font-medium">
              <span className="moi-section-title">Layers</span>
              <Badge className="moi-section-badge" title={layerSummary} variant="outline">
                {enabledLayerCount} active
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="moi-layer-control-row">
                <label className="moi-layer-toggle">
                  <LayerVisibilityButton
                    checked={draft.layers.boundary}
                    label="Toggle boundary"
                    onToggle={() => setLayerEnabled('boundary', !draft.layers.boundary)}
                  />
                  <span>Boundary</span>
                </label>
                <Slider
                  className="moi-layer-slider"
                  disabled={!draft.layers.boundary}
                  max={100}
                  min={0}
                  step={1}
                  value={[opacityToSliderValue(layerOpacity.boundary)]}
                  onValueChange={(value) => setLayerOpacity('boundary', sliderValueToOpacity(value[0] ?? 0))}
                />
                <strong className="moi-layer-opacity-value">{Math.round(layerOpacity.boundary * 100)}%</strong>
              </div>
              <div className="moi-layer-control-row">
                <label className="moi-layer-toggle">
                  <LayerVisibilityButton
                    checked={draft.layers.heatmap}
                    label="Toggle heatmap"
                    onToggle={() => setLayerEnabled('heatmap', !draft.layers.heatmap)}
                  />
                  <span>Heatmap</span>
                </label>
                <Slider
                  className="moi-layer-slider"
                  disabled={!draft.layers.heatmap}
                  max={100}
                  min={0}
                  step={1}
                  value={[opacityToSliderValue(layerOpacity.heatmap)]}
                  onValueChange={(value) => setLayerOpacity('heatmap', sliderValueToOpacity(value[0] ?? 0))}
                />
                <strong className="moi-layer-opacity-value">{Math.round(layerOpacity.heatmap * 100)}%</strong>
              </div>
              <div className="moi-layer-control-row">
                <label className="moi-layer-toggle">
                  <LayerVisibilityButton
                    checked={draft.layers.arc}
                    label="Toggle arc"
                    onToggle={() => setLayerEnabled('arc', !draft.layers.arc)}
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
                  <LayerVisibilityButton
                    checked={draft.layers.trips}
                    label="Toggle trip"
                    onToggle={() => setLayerEnabled('trips', !draft.layers.trips)}
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
