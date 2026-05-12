// 這個檔案負責把播放狀態同步給 kepler，並用動畫迴圈推進時間。
import {useEffect} from 'react';
import {syncPlaybackWindow} from '../../services/kepler';
import {roomStore, useRoomStore} from '../../app/store';
import {getPlaybackFrameSnapshot, subscribePlaybackFrame} from '../../app/playbackRuntime';

type PlaybackLoopProps = {
  mapId: string;
};

export function PlaybackLoop({mapId}: PlaybackLoopProps) {
  const isPlaying = useRoomStore((state) => state.moi.isPlaying);
  const tickPlayback = useRoomStore((state) => state.moi.tickPlayback);

  useEffect(() => {
    if (!mapId) {
      return;
    }

    syncPlaybackWindow(roomStore, mapId, getPlaybackFrameSnapshot().timeRange);
    return subscribePlaybackFrame(() => {
      syncPlaybackWindow(roomStore, mapId, getPlaybackFrameSnapshot().timeRange);
    });
  }, [mapId]);

  useEffect(() => {
    if (!mapId || !isPlaying) {
      return;
    }

    let frameId = 0;

    const loop = () => {
      tickPlayback(Date.now());
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPlaying, mapId, tickPlayback]);

  return null;
}
