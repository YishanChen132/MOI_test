// 這個檔案專門把 Trips 圖層查回來的資料切成連續 mode 的軌跡片段。
import {toModeLabel} from '../../../constants/modes';
import {secondsOfDayToPlaybackMs} from '../../../lib/timeplayback';
import type {
  QueryTrajectoryRow,
  TimeRangeSeconds,
  TripFeatureCollection,
  TripLayerDatum,
} from '../../../types';
import {forEachTripSegment} from './tripSegments';

export function segmentTripRows(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): TripFeatureCollection {
  const features: TripFeatureCollection['features'] = [];

  forEachTripSegment(rows, selectedModes, timeRange, (segment) => {
    features.push({
      type: 'Feature',
      properties: {
        agent_id: segment.row.agent_id,
        segment_index: segment.segmentIndex,
        mode: segment.mode,
        mode_label: toModeLabel(segment.mode),
        start_time: segment.startTime,
        end_time: segment.endTime,
      },
      geometry: {
        type: 'LineString',
        coordinates: segment.points.map((point) => [
          point.lng,
          point.lat,
          0,
          secondsOfDayToPlaybackMs(point.timestamp),
        ]),
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function buildTripLayerData(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): TripLayerDatum[] {
  const trips: TripLayerDatum[] = [];

  forEachTripSegment(rows, selectedModes, timeRange, (segment) => {
    trips.push({
      agent_id: segment.row.agent_id,
      segment_index: segment.segmentIndex,
      mode: segment.mode,
      mode_label: toModeLabel(segment.mode),
      start_time: segment.startTime,
      end_time: segment.endTime,
      path: segment.points.map((point) => [point.lng, point.lat]),
      timestamps: segment.points.map((point) => point.timestamp * 1_000),
    });
  });

  return trips;
}

export function countTripLayerSegments(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange: TimeRangeSeconds,
): number {
  let segmentCount = 0;

  forEachTripSegment(rows, selectedModes, timeRange, () => {
    segmentCount += 1;
  });

  return segmentCount;
}
