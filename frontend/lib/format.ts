// 這個檔案負責提供畫面上會用到的時間與耗時文字格式化工具。
export function formatSecondsToClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatMillisecondsToClock(totalMilliseconds: number): string {
  return formatSecondsToClock(totalMilliseconds / 1_000);
}

export function formatMillisecondsToHourMinute(totalMilliseconds: number): string {
  const safe = Math.max(0, Math.floor(totalMilliseconds));
  const hours = Math.floor(safe / 3_600_000)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((safe % 3_600_000) / 60_000)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMillisecondsToHourLabel(totalMilliseconds: number): string {
  const safe = Math.max(0, Math.floor(totalMilliseconds));
  const hours = Math.floor(safe / 3_600_000)
    .toString()
    .padStart(2, '0');
  return `${hours}:00`;
}

export function formatDurationMs(durationMs: number): string {
  if (durationMs >= 1_000) {
    return `${(durationMs / 1_000).toFixed(2)} s`;
  }

  return `${Math.round(durationMs)} ms`;
}
