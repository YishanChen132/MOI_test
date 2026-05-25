// 這個檔案專門把 Arc 圖層查回來的原始資料整理成 kepler 需要的列資料。
import {toModeLabel} from '../../../constants/modes';
import {secondsOfDayToPlaybackIso, secondsOfDayToPlaybackMs} from '../../../lib/timeplayback';
import {getTrajectoryPointCount, normalizeNumericArray} from '../../../lib/transforms';
import type {ArcDatum, QueryTrajectoryRow, TimeRangeSeconds} from '../../../types';

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function flattenArcRows(
  rows: Iterable<QueryTrajectoryRow>,
  selectedModes: readonly number[],
  timeRange?: TimeRangeSeconds,
): ArcDatum[] {
  const selectedModeSet = new Set(selectedModes);
  const startTime = timeRange?.[0] ?? Number.NEGATIVE_INFINITY;
  const endTime = timeRange?.[1] ?? Number.POSITIVE_INFINITY;
  const result: ArcDatum[] = [];

  for (const row of rows) {
    const paths = normalizeNumericArray(row.paths);
    const timestamps = normalizeNumericArray(row.timestamps);
    const modes = normalizeNumericArray(row.modes);
    const scalarTimestamp = toFiniteNumber(row.timestamps);
    const scalarMode = toFiniteNumber(row.modes);
    const pointCount = getTrajectoryPointCount(row);

    if (
      pointCount < 2 &&
      paths.length >= 4 &&
      scalarTimestamp != null &&
      scalarMode != null
    ) {
      if (
        selectedModeSet.has(scalarMode) &&
        scalarTimestamp >= startTime &&
        scalarTimestamp <= endTime
      ) {
        const sourceLng = paths[0];
        const sourceLat = paths[1];
        const targetLng = paths[2];
        const targetLat = paths[3];

        if (
          Number.isFinite(sourceLng) &&
          Number.isFinite(sourceLat) &&
          Number.isFinite(targetLng) &&
          Number.isFinite(targetLat)
        ) {
          result.push({
            arc_key: buildArcKey(row.agent_id, 0, scalarMode, scalarTimestamp),
            agent_id: row.agent_id,
            segment_index: 0,
            source_lng: sourceLng,
            source_lat: sourceLat,
            target_lng: targetLng,
            target_lat: targetLat,
            mode: scalarMode,
            mode_label: toModeLabel(scalarMode),
            timestamp: scalarTimestamp,
            timestamp_ms: secondsOfDayToPlaybackMs(scalarTimestamp),
            timestamp_iso: secondsOfDayToPlaybackIso(scalarTimestamp),
          });
        }
      }

      continue;
    }

    if (pointCount < 2) {
      continue;
    }

    for (let segmentIndex = 0; segmentIndex < pointCount - 1; segmentIndex += 1) {
      const mode = modes[segmentIndex];
      const timestamp = timestamps[segmentIndex];

      if (!selectedModeSet.has(mode) || timestamp < startTime || timestamp > endTime) {
        continue;
      }

      const sourceLng = paths[segmentIndex * 2];
      const sourceLat = paths[segmentIndex * 2 + 1];
      const targetLng = paths[segmentIndex * 2 + 2];
      const targetLat = paths[segmentIndex * 2 + 3];

      if (
        !Number.isFinite(sourceLng) ||
        !Number.isFinite(sourceLat) ||
        !Number.isFinite(targetLng) ||
        !Number.isFinite(targetLat)
      ) {
        continue;
      }

      result.push({
        arc_key: buildArcKey(row.agent_id, segmentIndex, mode, timestamp),
        agent_id: row.agent_id,
        segment_index: segmentIndex,
        source_lng: sourceLng,
        source_lat: sourceLat,
        target_lng: targetLng,
        target_lat: targetLat,
        mode,
        mode_label: toModeLabel(mode),
        timestamp,
        timestamp_ms: secondsOfDayToPlaybackMs(timestamp),
        timestamp_iso: secondsOfDayToPlaybackIso(timestamp),
      });
    }
  }

  return result;
}

export function buildArcKey(
  agentId: number,
  segmentIndex: number,
  mode: number,
  timestamp: number,
): string {
  return `${agentId}:${segmentIndex}:${mode}:${timestamp}`;
}
