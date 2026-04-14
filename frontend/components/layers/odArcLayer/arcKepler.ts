// 這個檔案專門放 Arc 圖層在 kepler 裡的資料格式、圖層設定和時間過濾設定。
import {processRowObject} from '@kepler.gl/processors';
import {ALL_MODE_CODES, buildModeColorRange} from '../../../constants/modes';
import {
  PLAYBACK_INITIAL_SPEED,
  PLAYBACK_TIME_FORMAT,
  PLAYBACK_TIMEZONE,
} from '../../../lib/timeplayback';
import type {ArcDatum} from '../../../types';

const MODE_COLOR_RANGE = buildModeColorRange();

type DatasetDescriptor = {
  id: string;
  label: string;
  processed: unknown;
};

export const ARC_DATASET_ID = 'moi_arc_segments';
export const ARC_TIME_FILTER_ID = 'moi-arc-time-filter';

export const ARC_TOOLTIP_FIELDS = [
  {name: 'agent_id'},
  {name: 'segment_index'},
  {name: 'mode_label'},
  {name: 'timestamp'},
] as const;

export function buildArcDataset(arcRows: ArcDatum[]): DatasetDescriptor | null {
  if (arcRows.length === 0) {
    return null;
  }

  return {
    id: ARC_DATASET_ID,
    label: 'OD Arc',
    processed: processRowObject(arcRows),
  };
}

export function buildArcLayerConfig(isVisible = true, opacity = 0.8) {
  return {
    id: 'moi-arc-layer',
    type: 'arc',
    config: {
      dataId: ARC_DATASET_ID,
      label: 'OD Arc',
      color: [255, 177, 27],
      colorDomain: ALL_MODE_CODES,
      colorField: {
        name: 'mode',
        type: 'integer',
      },
      colorScale: 'ordinal',
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
        colorRange: MODE_COLOR_RANGE,
        sizeRange: [0, 6],
        targetColor: [255, 255, 255],
      },
      hidden: false,
      textLabel: [],
    },
    visualChannels: {
      colorField: {
        name: 'mode',
        type: 'integer',
      },
      colorScale: 'ordinal',
      sizeField: null,
      sizeScale: 'linear',
    },
  };
}

export function buildArcTimeFilter(
  playbackDomainMs: [number, number],
  playbackValueMs: [number, number],
) {
  return {
    id: ARC_TIME_FILTER_ID,
    dataId: ARC_DATASET_ID,
    name: 'timestamp_ms',
    type: 'timeRange',
    view: 'enlarged',
    enabled: true,
    fixedDomain: true,
    isAnimating: false,
    domain: playbackDomainMs,
    value: playbackValueMs,
    plotType: 'histogram',
    animationWindow: 'free',
    speed: PLAYBACK_INITIAL_SPEED,
    timeFormat: PLAYBACK_TIME_FORMAT,
    defaultTimeFormat: PLAYBACK_TIME_FORMAT,
    timezone: PLAYBACK_TIMEZONE,
    step: 60_000,
  };
}
