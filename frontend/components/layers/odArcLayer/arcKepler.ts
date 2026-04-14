// 這個檔案專門放 Arc 圖層在 kepler 裡的資料格式、圖層設定和時間過濾設定。
import {processRowObject} from '@kepler.gl/processors';
import {MODE_DEFINITIONS} from '../../../constants/modes';
import {
  PLAYBACK_TIME_FORMAT,
  PLAYBACK_TIMEZONE,
} from '../../../lib/timeplayback';
import type {ArcDatum} from '../../../types';

type DatasetDescriptor = {
  id: string;
  label: string;
  processed: unknown;
};

export const ARC_DATASET_IDS = MODE_DEFINITIONS.map((mode) => `moi_arc_segments_mode_${mode.code}`) as string[];
export const ARC_TIME_FILTER_ID = 'moi-arc-time-filter';

export const ARC_TOOLTIP_FIELDS = [
  {name: 'agent_id'},
  {name: 'segment_index'},
  {name: 'mode_label'},
  {name: 'timestamp'},
] as const;

export function isArcDatasetId(datasetId: string): boolean {
  return ARC_DATASET_IDS.includes(datasetId);
}

export function buildArcDatasets(arcRows: ArcDatum[]): DatasetDescriptor[] {
  if (arcRows.length === 0) {
    return [];
  }

  return MODE_DEFINITIONS.flatMap((mode) => {
    const rows = arcRows.filter((row) => row.mode === mode.code);
    if (rows.length === 0) {
      return [];
    }

    return [{
      id: `moi_arc_segments_mode_${mode.code}`,
      label: `OD Arc ${mode.label}`,
      processed: processRowObject(rows),
    }];
  });
}

export function buildArcLayerConfigs(isVisible = true, opacity = 0.8) {
  return MODE_DEFINITIONS.map((mode) => {
    // Arc 頭尾都用同一個顏色，避免 kepler 預設的漸層感。
    const arcColor = hexToRgb(mode.color);

    return {
      id: `moi-arc-layer-${mode.code}`,
      type: 'arc',
      config: {
        dataId: `moi_arc_segments_mode_${mode.code}`,
        label: `OD Arc ${mode.label}`,
        color: arcColor,
        columns: {
          lat0: 'source_lat',
          lng0: 'source_lng',
          lat1: 'target_lat',
          lng1: 'target_lng',
        },
        isVisible,
        visConfig: {
          opacity,
          thickness: 3,
          sizeRange: [0, 6],
          targetColor: arcColor,
        },
        hidden: false,
        textLabel: [],
      },
      visualChannels: {
        colorField: null,
        colorScale: 'ordinal',
        sizeField: null,
        sizeScale: 'linear',
      },
    };
  });
}

export function buildArcTimeFilter(
  datasetIds: readonly string[],
  playbackDomainMs: [number, number],
  playbackValueMs: [number, number],
) {
  return {
    id: ARC_TIME_FILTER_ID,
    dataId: [...datasetIds],
    name: datasetIds.map(() => 'timestamp_ms'),
    type: 'timeRange',
    view: 'enlarged',
    enabled: true,
    fixedDomain: true,
    isAnimating: false,
    domain: playbackDomainMs,
    value: playbackValueMs,
    plotType: 'histogram',
    animationWindow: 'free',
    speed: 1,
    timeFormat: PLAYBACK_TIME_FORMAT,
    defaultTimeFormat: PLAYBACK_TIME_FORMAT,
    timezone: PLAYBACK_TIMEZONE,
    step: 60_000,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((digit) => `${digit}${digit}`).join('')
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return [red, green, blue];
}
