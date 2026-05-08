import {
  ROAD_NODE_TRANSITION_FLOWMAP_LIMIT,
  buildFlowmapCacheKey,
  buildFlowmapModeKey,
  buildFlowmapTimeRangeKey,
  clearFlowmapCaches,
} from '../features/flowmap/flowmapCache';

describe('flowmap cache helpers', () => {
  afterEach(() => {
    clearFlowmapCaches();
  });

  it('builds stable cache keys for the same dataset, source, modes, and time range', () => {
    const keyA = buildFlowmapCacheKey('2000', 'trajectory', [2, 8], [9_000, 9_600]);
    const keyB = buildFlowmapCacheKey('2000', 'trajectory', [2, 8], [9_000, 9_600]);

    expect(keyA).toBe(keyB);
    expect(buildFlowmapModeKey([2, 8])).toBe('2,8');
    expect(buildFlowmapTimeRangeKey([9_000, 9_600])).toBe('9000:9600');
  });

  it('invalidates the cache key when mode filters or time windows change', () => {
    const base = buildFlowmapCacheKey('taipei_road_node_flowmap', 'road-node-transition', [2, 8], [9_000, 9_600]);
    const differentModes = buildFlowmapCacheKey('taipei_road_node_flowmap', 'road-node-transition', [2], [9_000, 9_600]);
    const differentTimeRange = buildFlowmapCacheKey('taipei_road_node_flowmap', 'road-node-transition', [2, 8], [9_060, 9_600]);

    expect(base).not.toBe(differentModes);
    expect(base).not.toBe(differentTimeRange);
    expect(ROAD_NODE_TRANSITION_FLOWMAP_LIMIT).toBe(3_000);
  });
});
