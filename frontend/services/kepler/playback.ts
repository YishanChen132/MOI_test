// 這個檔案負責把 MOI 播放時間窗同步到 kepler 的 filter 與 animation config。
import {
  setAnimationConfig,
  setFilter,
} from '@kepler.gl/actions';
import {
  ARC_TIME_FILTER_ID,
} from '../../components/layers/odArcLayer/arcKepler';
import {
  millisecondsOfDayToPlaybackEpochMs,
  PLAYBACK_DOMAIN,
  PLAYBACK_TIMEZONE,
  PLAYBACK_TIME_FORMAT,
} from '../../lib/timeplayback';
import type {
  TimeRangeMilliseconds,
} from '../../types';
import {KEPLER_PASSIVE_SPEED} from './config';
import type {RoomStoreWithKepler} from './types';

export function syncPlaybackWindow(
  roomStore: RoomStoreWithKepler,
  mapId: string,
  timeRange: TimeRangeMilliseconds,
): void {
  const currentMap = roomStore.getState().kepler.map[mapId];
  const filterIndex = currentMap?.visState.filters.findIndex(
    (filter) => filter.id === ARC_TIME_FILTER_ID,
  );

  const playbackDomainMs = PLAYBACK_DOMAIN.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];
  const playbackValueMs = timeRange.map(millisecondsOfDayToPlaybackEpochMs) as [number, number];

  if (filterIndex != null && filterIndex >= 0) {
    roomStore.getState().kepler.dispatchAction(mapId, setFilter(filterIndex, 'value', playbackValueMs));
  }

  roomStore.getState().kepler.dispatchAction(
    mapId,
    setAnimationConfig({
      currentTime: playbackValueMs[1],
      domain: playbackDomainMs,
      speed: KEPLER_PASSIVE_SPEED,
      timeSteps: null,
      defaultTimeFormat: null,
      timeFormat: PLAYBACK_TIME_FORMAT,
      timezone: PLAYBACK_TIMEZONE,
    }),
  );
}
