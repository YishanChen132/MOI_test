// 這個檔案負責渲染頁面底部的時間播放條，並讓使用者調整實際播放窗與播放位置。
import {Button, Card} from '@sqlrooms/ui';
import {Pause, Play} from 'lucide-react';
import {useRef} from 'react';
import {
  formatMillisecondsToClock,
  formatMillisecondsToHourMinute,
} from '../lib/format';
import {PLAYBACK_WINDOW_MS} from '../lib/timeplayback';
import {useRoomStore} from '../store';

type DragMode = 'seek' | 'window-start' | 'window-end' | null;

function clampPercent(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function PlaybackBar() {
  const viewTimeRange = useRoomStore((state) => state.moi.viewTimeRange);
  const timeRange = useRoomStore((state) => state.moi.applied.timeRange);
  const isPlaying = useRoomStore((state) => state.moi.isPlaying);
  const timeScale = useRoomStore((state) => state.moi.timeScale);
  const startPlayback = useRoomStore((state) => state.moi.startPlayback);
  const pausePlayback = useRoomStore((state) => state.moi.pausePlayback);
  const seekPlaybackPosition = useRoomStore((state) => state.moi.seekPlaybackPosition);
  const setTimeRange = useRoomStore((state) => state.moi.setTimeRange);
  const setPlaybackSpeed = useRoomStore((state) => state.moi.setPlaybackSpeed);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragModeRef = useRef<DragMode>(null);

  const domainSpan = viewTimeRange[1] - viewTimeRange[0];
  const windowLeftPercent = ((timeRange[0] - viewTimeRange[0]) / domainSpan) * 100;
  const windowWidthPercent = ((timeRange[1] - timeRange[0]) / domainSpan) * 100;
  const playbackHeadPercent = ((timeRange[1] - viewTimeRange[0]) / domainSpan) * 100;

  const getValueFromClientX = (clientX: number) => {
    if (!trackRef.current) {
      return viewTimeRange[0];
    }

    const rect = trackRef.current.getBoundingClientRect();
    const percent = clampPercent((clientX - rect.left) / rect.width);
    return viewTimeRange[0] + percent * domainSpan;
  };

  const handleTrackPointerMove = (clientX: number) => {
    const nextValue = getValueFromClientX(clientX);

    if (dragModeRef.current === 'seek') {
      seekPlaybackPosition(nextValue);
      return;
    }

    if (dragModeRef.current === 'window-start') {
      setTimeRange([nextValue, timeRange[1]]);
      return;
    }

    if (dragModeRef.current === 'window-end') {
      setTimeRange([timeRange[0], nextValue]);
    }
  };

  return (
    <Card className="moi-playback-shell border-border/70 bg-card/90 shadow-2xl backdrop-blur-md">
      <div className="moi-playback-toolbar">
        <div className="moi-playback-controls">
          <Button
            className="rounded-xl"
            onClick={() => (isPlaying ? pausePlayback() : startPlayback())}
            variant={isPlaying ? 'secondary' : 'default'}
          >
            {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <div className="moi-playback-speed-group">
            {[30, 60, 120, 240].map((speed) => (
              <Button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                size="sm"
                variant={timeScale === speed ? 'default' : 'outline'}
              >
                x{speed}
              </Button>
            ))}
          </div>
        </div>
        <div className="moi-playback-readout">
          <strong>{formatMillisecondsToHourMinute(timeRange[0])}</strong>
          <span>-</span>
          <strong>{formatMillisecondsToHourMinute(timeRange[1])}</strong>
        </div>
      </div>

      <div
        ref={trackRef}
        className="moi-playback-track"
        onPointerDown={(event) => {
          dragModeRef.current = 'seek';
          pausePlayback();
          handleTrackPointerMove(event.clientX);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragModeRef.current) {
            return;
          }

          handleTrackPointerMove(event.clientX);
        }}
        onPointerUp={(event) => {
          dragModeRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          dragModeRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <div className="moi-playback-track-rail" />

        <div
          className="moi-playback-window"
          style={{
            left: `${windowLeftPercent}%`,
            width: `${windowWidthPercent}%`,
          }}
        />

        <button
          aria-label="Adjust active window start"
          className="moi-playback-window-handle"
          style={{left: `${windowLeftPercent}%`}}
          type="button"
          onPointerDown={(event) => {
            dragModeRef.current = 'window-start';
            pausePlayback();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragModeRef.current !== 'window-start') {
              return;
            }

            handleTrackPointerMove(event.clientX);
          }}
          onPointerUp={(event) => {
            dragModeRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
        />

        <button
          aria-label="Adjust active window end"
          className="moi-playback-window-handle"
          style={{left: `${windowLeftPercent + windowWidthPercent}%`}}
          type="button"
          onPointerDown={(event) => {
            dragModeRef.current = 'window-end';
            pausePlayback();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragModeRef.current !== 'window-end') {
              return;
            }

            handleTrackPointerMove(event.clientX);
          }}
          onPointerUp={(event) => {
            dragModeRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
        />

        <div
          className="moi-playback-head"
          style={{
            left: `${playbackHeadPercent}%`,
          }}
        />
      </div>

      <div className="moi-playback-caption">
        <span>Active range</span>
        <span>{formatMillisecondsToClock(timeRange[0])} - {formatMillisecondsToClock(timeRange[1])}</span>
        <span>Speed x{timeScale}</span>
      </div>

      <div className="moi-playback-boundary-row">
        <span>Start {formatMillisecondsToClock(viewTimeRange[0])}</span>
        <span>Default {Math.round(PLAYBACK_WINDOW_MS / 60_000)} min</span>
        <span>End {formatMillisecondsToClock(viewTimeRange[1])}</span>
      </div>
    </Card>
  );
}
