import {
  APPLIED_PLAYBACK_SYNC_BUCKET_MS,
  bucketTimeRange,
  shouldSyncAppliedTimeRange,
} from '../app/playbackTiming';

describe('playback timing helpers', () => {
  it('buckets playback ranges to coarse sync windows', () => {
    expect(bucketTimeRange([9_060_000, 9_599_000])).toEqual([9_000_000, 9_600_000]);
    expect(APPLIED_PLAYBACK_SYNC_BUCKET_MS).toBe(600_000);
  });

  it('only syncs applied time when the coarse playback bucket changes', () => {
    expect(shouldSyncAppliedTimeRange([9_000_000, 9_600_000], [9_120_000, 9_540_000])).toBe(false);
    expect(shouldSyncAppliedTimeRange([9_000_000, 9_600_000], [9_120_000, 9_720_000])).toBe(true);
  });
});
