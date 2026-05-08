import {buildFlowmapQueryState} from '../features/flowmap/flowmapQueryState';

describe('flowmap query state', () => {
  const baseState = {
    flowmapEnabled: true,
    roomInitialized: true,
    hasSelectedModes: true,
    trajectorySourceReady: true,
    roadNodeTransitionSourceReady: true,
    roadFlowSourceReady: true,
    roadNetworkSourceReady: true,
    roadNodeSourceReady: true,
    hasCachedTripEntry: false,
    hasCachedTrajectoryData: false,
    hasCachedRoadNodeTransitionEntry: false,
    hasCachedRoadPathSegments: false,
    isFlowmapQueryLoading: false,
    isRoadFlowQueryLoading: false,
    flowmapQueryError: null,
    roadFlowQueryError: null,
  } as const;

  it('keeps trajectory flowmap on the shared trip cache instead of enabling a second SQL query', () => {
    const state = buildFlowmapQueryState({
      ...baseState,
      sourceType: 'trajectory',
      hasCachedTripEntry: true,
    });

    expect(state.shouldQueryFlowmapSource).toBe(false);
    expect(state.shouldQueryRoadFlowSource).toBe(false);
    expect(state.isReady).toBe(true);
  });

  it('queries road-node-transition sources until the cache is filled, then stops requerying', () => {
    const uncached = buildFlowmapQueryState({
      ...baseState,
      sourceType: 'road-node-transition',
    });
    const cached = buildFlowmapQueryState({
      ...baseState,
      sourceType: 'road-node-transition',
      hasCachedRoadNodeTransitionEntry: true,
    });

    expect(uncached.shouldQueryFlowmapSource).toBe(true);
    expect(cached.shouldQueryFlowmapSource).toBe(false);
    expect(cached.isReady).toBe(true);
  });

  it('keeps road-path flowmap dependent on the joined road tables only when its segment cache is empty', () => {
    const uncached = buildFlowmapQueryState({
      ...baseState,
      sourceType: 'road-path',
    });
    const cached = buildFlowmapQueryState({
      ...baseState,
      sourceType: 'road-path',
      hasCachedRoadPathSegments: true,
    });

    expect(uncached.shouldQueryRoadFlowSource).toBe(true);
    expect(cached.shouldQueryRoadFlowSource).toBe(false);
    expect(cached.isReady).toBe(true);
  });
});
