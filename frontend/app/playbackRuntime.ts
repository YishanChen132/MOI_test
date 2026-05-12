import {getInitialPlaybackRange} from '../lib/timeplayback';
import type {TimeRangeMilliseconds} from '../types';

export const PLAYBACK_LAYER_SYNC_INTERVAL_MS = 120;

type PlaybackRuntimeListener = () => void;

type PlaybackRuntimeSnapshot = {
  timeRange: TimeRangeMilliseconds;
};

const initialTimeRange = getInitialPlaybackRange();

let frameSnapshot: PlaybackRuntimeSnapshot = {
  timeRange: [...initialTimeRange],
};

let layerSnapshot: PlaybackRuntimeSnapshot = {
  timeRange: [...initialTimeRange],
};

let lastLayerSyncTimestamp = 0;

const frameListeners = new Set<PlaybackRuntimeListener>();
const layerListeners = new Set<PlaybackRuntimeListener>();

function emit(listeners: Set<PlaybackRuntimeListener>): void {
  for (const listener of listeners) {
    listener();
  }
}

function setFrameSnapshot(nextTimeRange: TimeRangeMilliseconds): void {
  if (
    frameSnapshot.timeRange[0] === nextTimeRange[0] &&
    frameSnapshot.timeRange[1] === nextTimeRange[1]
  ) {
    return;
  }

  frameSnapshot = {
    timeRange: [...nextTimeRange],
  };
  emit(frameListeners);
}

function setLayerSnapshot(nextTimeRange: TimeRangeMilliseconds): void {
  if (
    layerSnapshot.timeRange[0] === nextTimeRange[0] &&
    layerSnapshot.timeRange[1] === nextTimeRange[1]
  ) {
    return;
  }

  layerSnapshot = {
    timeRange: [...nextTimeRange],
  };
  emit(layerListeners);
}

export function syncPlaybackRuntimeTimeRange(
  nextTimeRange: TimeRangeMilliseconds,
  now = Date.now(),
  forceLayerSync = false,
): void {
  setFrameSnapshot(nextTimeRange);

  if (forceLayerSync || now - lastLayerSyncTimestamp >= PLAYBACK_LAYER_SYNC_INTERVAL_MS) {
    setLayerSnapshot(nextTimeRange);
    lastLayerSyncTimestamp = now;
  }
}

export function getPlaybackFrameSnapshot(): PlaybackRuntimeSnapshot {
  return frameSnapshot;
}

export function getPlaybackLayerSnapshot(): PlaybackRuntimeSnapshot {
  return layerSnapshot;
}

export function subscribePlaybackFrame(listener: PlaybackRuntimeListener): () => void {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}

export function subscribePlaybackLayer(listener: PlaybackRuntimeListener): () => void {
  layerListeners.add(listener);
  return () => {
    layerListeners.delete(listener);
  };
}
