import {useSyncExternalStore} from 'react';
import {
  getPlaybackFrameSnapshot,
  getPlaybackLayerSnapshot,
  subscribePlaybackFrame,
  subscribePlaybackLayer,
} from './playbackRuntime';

export function usePlaybackFrameTimeRange() {
  return useSyncExternalStore(
    subscribePlaybackFrame,
    () => getPlaybackFrameSnapshot().timeRange,
    () => getPlaybackFrameSnapshot().timeRange,
  );
}

export function usePlaybackLayerTimeRange() {
  return useSyncExternalStore(
    subscribePlaybackLayer,
    () => getPlaybackLayerSnapshot().timeRange,
    () => getPlaybackLayerSnapshot().timeRange,
  );
}
