// 這個檔案負責統一定義播放時間範圍、初始速度和時間格式轉換規則。
import type {TimeRangeMilliseconds, TimeRangeSeconds} from './types';

export const PLAYBACK_DOMAIN: TimeRangeMilliseconds = [9_000_000, 21_600_000];
export const PLAYBACK_WINDOW_MS = 600_000;
export const PLAYBACK_INITIAL_SPEED = 30;
export const PLAYBACK_TIMEZONE = 'UTC';
export const PLAYBACK_TIME_FORMAT = 'HH:mm:ss';

export function getInitialPlaybackRange(): TimeRangeMilliseconds {
  return [PLAYBACK_DOMAIN[0], Math.min(PLAYBACK_DOMAIN[0] + PLAYBACK_WINDOW_MS, PLAYBACK_DOMAIN[1])];
}

export function getInitialDisplayRange(): TimeRangeMilliseconds {
  return [...PLAYBACK_DOMAIN];
}

export function getInitialAccumulatedAmount(): number {
  return getInitialPlaybackRange()[1];
}

export function clampPlaybackPosition(
  timestampMs: number,
  domain: TimeRangeMilliseconds = PLAYBACK_DOMAIN,
): number {
  const safe = Number.isFinite(timestampMs) ? timestampMs : getInitialAccumulatedAmount();
  return Math.max(domain[0], Math.min(safe, domain[1]));
}

export function derivePlaybackRange(
  playbackPositionMs: number,
  windowMs = PLAYBACK_WINDOW_MS,
  domain: TimeRangeMilliseconds = PLAYBACK_DOMAIN,
): TimeRangeMilliseconds {
  const safeWindow = Math.min(windowMs, domain[1] - domain[0]);
  const clampedEnd = clampPlaybackPosition(playbackPositionMs, domain);
  const clampedStart = Math.max(domain[0], clampedEnd - safeWindow);
  return [clampedStart, clampedEnd];
}

export function clampDisplayRange(
  [startMs, endMs]: TimeRangeMilliseconds,
  domain: TimeRangeMilliseconds = PLAYBACK_DOMAIN,
  minWindowMs = PLAYBACK_WINDOW_MS,
): TimeRangeMilliseconds {
  const safeMinWindow = Math.min(minWindowMs, domain[1] - domain[0]);
  const safeStart = Number.isFinite(startMs) ? startMs : domain[0];
  const safeEnd = Number.isFinite(endMs) ? endMs : domain[0] + safeMinWindow;
  const nextStart = Math.max(domain[0], Math.min(safeStart, domain[1] - safeMinWindow));
  const nextEnd = Math.max(
    nextStart + safeMinWindow,
    Math.min(safeEnd, domain[1]),
  );

  return [nextStart, nextEnd];
}

export function millisecondsRangeToSeconds([startMs, endMs]: TimeRangeMilliseconds): TimeRangeSeconds {
  return [Math.floor(startMs / 1_000), Math.ceil(endMs / 1_000)];
}

export function millisecondsOfDayToPlaybackDate(timestampMs: number): Date {
  const safe = Math.max(0, Math.floor(timestampMs));
  const hours = Math.floor(safe / 3_600_000) % 24;
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  return new Date(Date.UTC(2024, 0, 1, hours, minutes, seconds));
}

export function millisecondsOfDayToPlaybackIso(timestampMs: number): string {
  return millisecondsOfDayToPlaybackDate(timestampMs).toISOString().replace('.000Z', 'Z');
}

export function millisecondsOfDayToPlaybackEpochMs(timestampMs: number): number {
  return millisecondsOfDayToPlaybackDate(timestampMs).getTime();
}

export function secondsOfDayToPlaybackIso(timestampSeconds: number): string {
  return millisecondsOfDayToPlaybackIso(timestampSeconds * 1_000);
}

export function secondsOfDayToPlaybackMs(timestampSeconds: number): number {
  return millisecondsOfDayToPlaybackEpochMs(timestampSeconds * 1_000);
}
