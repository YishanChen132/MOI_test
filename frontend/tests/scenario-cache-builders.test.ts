import {
  buildPlaybackHistogramBins,
  buildPlaybackHistogramBinsFromArcRows,
  buildPlaybackHistogramBinsFromTripRows,
  filterTrajectoryRowsByBounds,
} from '../components/mapLayers/scenario/scenarioCacheBuilders';
import {
  buildScenarioCacheKey,
  buildDatasetList,
  buildViewportBoundsKey,
  getTripCacheEntry,
  MAX_SCENARIO_CACHE_ENTRIES,
  setTripCacheEntry,
} from '../components/mapLayers/scenario/scenarioDataSyncHelpers';
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

  it('keeps only trajectory rows that touch the current viewport bounds', () => {
    const rows: QueryTrajectoryRow[] = [
      {
        agent_id: 1,
        paths: [121.5, 25.05, 121.55, 25.08],
        timestamps: [9_000, 9_120],
        modes: [3, 3],
      },
      {
        agent_id: 2,
        paths: [122, 26, 122.1, 26.1],
        timestamps: [9_000, 9_120],
        modes: [3, 3],
      },
    ];

    const filteredRows = filterTrajectoryRowsByBounds(rows, {
      west: 121.45,
      south: 24.95,
      east: 121.65,
      north: 25.1,
    });

    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.agent_id).toBe(1);
  });

  it('keeps only the most recently used scenario trip caches', () => {
    const cacheRef = {current: new Map()};
    const baseEntry = {
      arrowTable: null,
      tripDatasets: [],
      trajectoryRows: [],
      tripSegments: 0,
      heatmapPoints: 0,
    };

    setTripCacheEntry(cacheRef, 'scenario-a', baseEntry);
    setTripCacheEntry(cacheRef, 'scenario-b', baseEntry);
    getTripCacheEntry(cacheRef, 'scenario-a');
    setTripCacheEntry(cacheRef, 'scenario-c', baseEntry);

    expect(cacheRef.current.size).toBe(MAX_SCENARIO_CACHE_ENTRIES);
    expect(cacheRef.current.has('scenario-a')).toBe(true);
    expect(cacheRef.current.has('scenario-b')).toBe(false);
    expect(cacheRef.current.has('scenario-c')).toBe(true);
  });

  it('builds a combined kepler dataset list from trip and arc caches', () => {
    const datasets = buildDatasetList(
      {
        arrowTable: null,
        tripDatasets: [{id: 'trip-1', label: 'Trip 1', processed: {}}],
        trajectoryRows: [],
        tripSegments: 0,
        heatmapPoints: 0,
      },
      {
        arcDatasets: [{id: 'arc-1', label: 'Arc 1', processed: {}}],
        arcRows: [],
      },
    );

    expect(datasets.map((dataset) => dataset.id)).toEqual(['trip-1', 'arc-1']);
  });

  it('includes rounded viewport bounds in the scenario cache key when provided', () => {
    const boundsKey = buildViewportBoundsKey({
      west: 121.456789,
      south: 24.987654,
      east: 121.654321,
      north: 25.123456,
    });

    expect(boundsKey).toBe('121.4568:24.9877:121.6543:25.1235');
    expect(buildScenarioCacheKey('9000', [2, 8], boundsKey)).toBe(
      '9000::2,8::121.4568:24.9877:121.6543:25.1235',
    );
    expect(buildScenarioCacheKey('9000', [2, 8])).toBe('9000::2,8');
  });
});
