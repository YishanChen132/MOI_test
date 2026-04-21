// 這個檔案負責顯示並控制各地圖圖層的開關與透明度。
import {Badge, Slider} from '@sqlrooms/ui';
import type {
  AdjustableLayerId,
  LayerId,
  LayerOpacity,
  LayerVisibility,
} from '../../types';
import {LayerVisibilityButton} from './LayerVisibilityButton';
import {
  opacityToSliderValue,
  sliderValueToOpacity,
} from './controlMenuUtils';

const LAYER_CONTROLS: Array<{
  id: AdjustableLayerId;
  label: string;
  toggleLabel: string;
}> = [
  {id: 'boundary', label: 'Boundary', toggleLabel: 'Toggle boundary'},
  {id: 'heatmap', label: 'Heatmap', toggleLabel: 'Toggle heatmap'},
  {id: 'arc', label: 'Arc', toggleLabel: 'Toggle arc'},
  {id: 'trips', label: 'Trip', toggleLabel: 'Toggle trip'},
];

export function LayerControls({
  layers,
  layerOpacity,
  layerSummary,
  enabledLayerCount,
  setLayerEnabled,
  setLayerOpacity,
}: {
  layers: LayerVisibility;
  layerOpacity: LayerOpacity;
  layerSummary: string;
  enabledLayerCount: number;
  setLayerEnabled: (layerId: LayerId, enabled: boolean) => void;
  setLayerOpacity: (layerId: AdjustableLayerId, opacity: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="moi-section-header flex items-center justify-between text-sm font-medium">
        <span className="moi-section-title">Layers</span>
        <Badge className="moi-section-badge" title={layerSummary} variant="outline">
          {enabledLayerCount} active
        </Badge>
      </div>
      <div className="space-y-2">
        {LAYER_CONTROLS.map((layer) => (
          <div className="moi-layer-control-row" key={layer.id}>
            <label className="moi-layer-toggle">
              <LayerVisibilityButton
                checked={layers[layer.id]}
                label={layer.toggleLabel}
                onToggle={() => setLayerEnabled(layer.id, !layers[layer.id])}
              />
              <span>{layer.label}</span>
            </label>
            <Slider
              className="moi-layer-slider"
              disabled={!layers[layer.id]}
              max={100}
              min={0}
              step={1}
              value={[opacityToSliderValue(layerOpacity[layer.id])]}
              onValueChange={(value) => setLayerOpacity(layer.id, sliderValueToOpacity(value[0] ?? 0))}
            />
            <strong className="moi-layer-opacity-value">{Math.round(layerOpacity[layer.id] * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
