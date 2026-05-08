import type {FlowmapSourceType} from '../../constants/datasets';

type FlowmapQueryStateInput = {
  flowmapEnabled: boolean;
  roomInitialized: boolean;
  sourceType: FlowmapSourceType;
  hasSelectedModes: boolean;
  trajectorySourceReady: boolean;
  roadNodeTransitionSourceReady: boolean;
  roadFlowSourceReady: boolean;
  roadNetworkSourceReady: boolean;
  roadNodeSourceReady: boolean;
  hasCachedTripEntry: boolean;
  hasCachedTrajectoryData: boolean;
  hasCachedRoadNodeTransitionEntry: boolean;
  hasCachedRoadPathSegments: boolean;
  isFlowmapQueryLoading: boolean;
  isRoadFlowQueryLoading: boolean;
  flowmapQueryError: unknown;
  roadFlowQueryError: unknown;
};

export type FlowmapQueryState = {
  shouldQueryFlowmapSource: boolean;
  shouldQueryRoadFlowSource: boolean;
  isReady: boolean;
};

export function buildFlowmapQueryState(input: FlowmapQueryStateInput): FlowmapQueryState {
  const baseEnabled = input.roomInitialized && input.flowmapEnabled && input.hasSelectedModes;

  if (input.sourceType === 'trajectory') {
    return {
      shouldQueryFlowmapSource: false,
      shouldQueryRoadFlowSource: false,
      isReady: input.flowmapEnabled && (
        input.hasCachedTrajectoryData ||
        (input.trajectorySourceReady && input.hasCachedTripEntry)
      ),
    };
  }

  if (input.sourceType === 'road-node-transition') {
    return {
      shouldQueryFlowmapSource:
        baseEnabled &&
        input.roadNodeTransitionSourceReady &&
        !input.hasCachedRoadNodeTransitionEntry,
      shouldQueryRoadFlowSource: false,
      isReady:
        input.flowmapEnabled &&
        input.roadNodeTransitionSourceReady &&
        (
          input.hasCachedRoadNodeTransitionEntry ||
          (!input.isFlowmapQueryLoading && !input.flowmapQueryError)
        ),
    };
  }

  return {
    shouldQueryFlowmapSource: false,
    shouldQueryRoadFlowSource:
      baseEnabled &&
      input.roadFlowSourceReady &&
      input.roadNetworkSourceReady &&
      input.roadNodeSourceReady &&
      !input.hasCachedRoadPathSegments,
    isReady:
      input.flowmapEnabled &&
      input.roadFlowSourceReady &&
      input.roadNetworkSourceReady &&
      input.roadNodeSourceReady &&
      (
        input.hasCachedRoadPathSegments ||
        (!input.isRoadFlowQueryLoading && !input.roadFlowQueryError)
      ),
  };
}
