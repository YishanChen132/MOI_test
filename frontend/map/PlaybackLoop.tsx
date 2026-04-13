// 這個檔案負責把播放狀態同步給 kepler，並用動畫迴圈推進時間。
import {useEffect} from 'react';
import {syncPlaybackWindow} from '../lib/kepler';
import {roomStore, useRoomStore} from '../store';

type PlaybackLoopProps = {
  mapId: string;
};

export function PlaybackLoop({mapId}: PlaybackLoopProps) {
  const isPlaying = useRoomStore((state) => state.moi.isPlaying);
  const tickPlayback = useRoomStore((state) => state.moi.tickPlayback);
  const timeRange = useRoomStore((state) => state.moi.applied.timeRange);
  const timeScale = useRoomStore((state) => state.moi.timeScale);

  useEffect(() => {
    if (!mapId) {
      return;
    }

    syncPlaybackWindow(roomStore, mapId, timeRange, timeScale);
  }, [mapId, timeRange, timeScale]);

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
