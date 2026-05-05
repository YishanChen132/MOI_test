import {
  buildPlaybackHistogramBins,
  buildPlaybackHistogramBinsFromArcRows,
  buildPlaybackHistogramBinsFromTripRows,
} from '../components/mapLayers/scenario/scenarioCacheBuilders';
import type {ArcDatum, QueryTrajectoryRow} from '../types';

describe('scenario cache histogram builders', () => {
  it('places samples into the expected playback buckets', () => {
    const bins = buildPlaybackHistogramBins(
      [0, 1_000, 5_999, 6_000, 11_999],
      [0, 12_000],
      2,
    );

    expect(bins).toEqual([
      {startMs: 0, endMs: 6_000, count: 3},
      {startMs: 6_000, endMs: 12_000, count: 2},
    ]);
  });

  it('filters trip samples by the selected modes before binning', () => {
    const tripRows: QueryTrajectoryRow[] = [
      {
        agent_id: 1,
        paths: [121, 25, 121.1, 25.1, 121.2, 25.2],
        timestamps: [9_000, 9_120, 9_240],
        modes: [3, 4, 3],
      },
    ];

    const bins = buildPlaybackHistogramBinsFromTripRows(tripRows, [3]);

    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(2);
  });

  it('uses arc timestamps directly when building the histogram', () => {
    const arcRows: ArcDatum[] = [
      {
        arc_key: 'a',
        agent_id: 1,
        segment_index: 0,
        source_lng: 121,
        source_lat: 25,
        target_lng: 121.1,
        target_lat: 25.1,
        mode: 3,
        mode_label: 'Bus',
        timestamp: 9_000,
        timestamp_ms: 0,
        timestamp_iso: '2024-01-01T02:30:00Z',
      },
      {
        arc_key: 'b',
        agent_id: 1,
        segment_index: 1,
        source_lng: 121.1,
        source_lat: 25.1,
        target_lng: 121.2,
        target_lat: 25.2,
        mode: 3,
        mode_label: 'Bus',
        timestamp: 9_300,
        timestamp_ms: 0,
        timestamp_iso: '2024-01-01T02:35:00Z',
      },
    ];

    const bins = buildPlaybackHistogramBinsFromArcRows(arcRows);

    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(2);
  });
});
