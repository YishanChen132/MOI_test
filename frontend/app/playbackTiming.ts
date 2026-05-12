// 這個檔案負責放 app store 內播放時間窗的計算與限制規則。
import {
  PLAYBACK_WINDOW_MS,
} from '../lib/timeplayback';
import type {TimeRangeMilliseconds} from '../types';
import type {AppSliceState} from './appStoreTypes';

const MIN_ACTIVE_WINDOW_MS = 60_000;
export const APPLIED_PLAYBACK_SYNC_BUCKET_MS = 600_000;

export function getActiveWindowWidth(
  timeRange: TimeRangeMilliseconds,
  displayTimeRange: TimeRangeMilliseconds,
): number {
  const displayWidth = Math.max(0, displayTimeRange[1] - displayTimeRange[0]);
  const rawWidth = Number.isFinite(timeRange[1] - timeRange[0]) ? timeRange[1] - timeRange[0] : PLAYBACK_WINDOW_MS;
  return Math.max(MIN_ACTIVE_WINDOW_MS, Math.min(rawWidth, displayWidth));
}

export function clampActiveTimeRange(
  [start, end]: TimeRangeMilliseconds,
  displayTimeRange: TimeRangeMilliseconds,
): TimeRangeMilliseconds {
  const displayStart = displayTimeRange[0];
  const displayEnd = displayTimeRange[1];
  const safeStart = Number.isFinite(start) ? start : displayStart;
  const safeEnd = Number.isFinite(end) ? end : displayStart + PLAYBACK_WINDOW_MS;
  const minWindow = Math.min(MIN_ACTIVE_WINDOW_MS, displayEnd - displayStart);
  const nextStart = Math.max(displayStart, Math.min(safeStart, displayEnd - minWindow));
  const nextEnd = Math.max(
    nextStart + minWindow,
    Math.min(safeEnd, displayEnd),
  );

  return [nextStart, nextEnd];
}

export function getPlaybackPosition(
  moi: Pick<
    AppSliceState['moi'],
    'accumulatedAmount' | 'displayTimeRange' | 'isPlaying' | 'tickStartTimestamp' | 'timeScale'
  >,
  now = Date.now(),
): number {
  if (!moi.isPlaying || !moi.tickStartTimestamp) {
    return Math.max(moi.displayTimeRange[0], Math.min(moi.accumulatedAmount, moi.displayTimeRange[1]));
  }

  return Math.max(
    moi.displayTimeRange[0],
    Math.min(moi.accumulatedAmount + (now - moi.tickStartTimestamp) * moi.timeScale, moi.displayTimeRange[1]),
  );
}

export function bucketTimeRange(
  [start, end]: TimeRangeMilliseconds,
  bucketMs = APPLIED_PLAYBACK_SYNC_BUCKET_MS,
): TimeRangeMilliseconds {
  const safeBucketMs = Math.max(1, Math.floor(bucketMs));
  const bucketedStart = Math.floor(start / safeBucketMs) * safeBucketMs;
  const bucketedEnd = Math.ceil(end / safeBucketMs) * safeBucketMs;

  return [bucketedStart, Math.max(bucketedStart, bucketedEnd)];
}

export function shouldSyncAppliedTimeRange(
  currentAppliedRange: TimeRangeMilliseconds,
  nextDraftRange: TimeRangeMilliseconds,
  bucketMs = APPLIED_PLAYBACK_SYNC_BUCKET_MS,
): boolean {
  const [currentStart, currentEnd] = bucketTimeRange(currentAppliedRange, bucketMs);
  const [nextStart, nextEnd] = bucketTimeRange(nextDraftRange, bucketMs);

  return currentStart !== nextStart || currentEnd !== nextEnd;
}
