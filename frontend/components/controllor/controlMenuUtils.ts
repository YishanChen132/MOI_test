// 這個檔案負責放 Control menu 會共用到的純工具函式。
import {Bus, Car, Footprints, TrainFront} from 'lucide-react';

export type DatasetRowCount = {
  trip_count: number;
  arc_count: number;
};

export function opacityToSliderValue(opacity: number): number {
  return Math.round(Math.pow(Math.max(0, Math.min(1, opacity)), 1 / 1.6) * 100);
}

export function sliderValueToOpacity(value: number): number {
  const normalized = Math.max(0, Math.min(100, value)) / 100;
  return Math.pow(normalized, 1.6);
}

export function countEnabledLayers(layers: {
  trips: boolean;
  arc: boolean;
  heatmap: boolean;
  boundary: boolean;
}, flowmapEnabled = false): number {
  return [
    layers.trips,
    layers.arc,
    layers.heatmap,
    layers.boundary,
    flowmapEnabled,
  ].filter(Boolean).length;
}

export function getModeIcon(modeCode: number) {
  if (modeCode === 1) return Footprints;
  if (modeCode === 2) return Car;
  if (modeCode === 8) return Bus;
  return TrainFront;
}

export function formatCount(value: number | null): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US').format(value)
    : '...';
}

export function getRowCountLabel(
  count: DatasetRowCount | null,
  tripTable: string,
  arcTable: string,
): {label: string; title: string} {
  if (!count) {
    return {label: '...', title: 'Loading current backend row count'};
  }

  const tripRows = formatCount(count.trip_count);
  const arcRows = formatCount(count.arc_count);

  return {
    label: tripRows,
    title: `Trip ${tripTable}: ${tripRows} rows; Arc ${arcTable}: ${arcRows} rows`,
  };
}
