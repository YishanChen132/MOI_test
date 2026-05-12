// 這個檔案就是目前測試版的 Timebar，負責播放、倍速和底部時間窗拖曳。
import {Button, Card} from '@sqlrooms/ui';
import {Pause, Play} from 'lucide-react';
import {useEffect, useMemo, useRef} from 'react';
import {
  formatMillisecondsToClock,
  formatMillisecondsToHourMinute,
} from '../../lib/format';
import {useRoomStore} from '../../app/store';
import {getPlaybackFrameSnapshot, subscribePlaybackFrame} from '../../app/playbackRuntime';

type DragMode = 'seek' | 'window-start' | 'window-end' | null;

function clampPercent(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function Timebar() {
  const viewTimeRange = useRoomStore((state) => state.moi.viewTimeRange);
  const timeRange = useRoomStore((state) => state.moi.draft.timeRange);
  const isPlaying = useRoomStore((state) => state.moi.isPlaying);
  const timeScale = useRoomStore((state) => state.moi.timeScale);
  const playbackHistogramBins = useRoomStore((state) => state.moi.playbackHistogramBins);
  const startPlayback = useRoomStore((state) => state.moi.startPlayback);
  const pausePlayback = useRoomStore((state) => state.moi.pausePlayback);
  const seekPlaybackPosition = useRoomStore((state) => state.moi.seekPlaybackPosition);
  const setTimeRange = useRoomStore((state) => state.moi.setTimeRange);
  const setPlaybackSpeed = useRoomStore((state) => state.moi.setPlaybackSpeed);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragModeRef = useRef<DragMode>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const startHandleRef = useRef<HTMLButtonElement | null>(null);
  const endHandleRef = useRef<HTMLButtonElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const readoutStartRef = useRef<HTMLElement | null>(null);
  const readoutEndRef = useRef<HTMLElement | null>(null);
  const captionRangeRef = useRef<HTMLElement | null>(null);

  // 這幾個不是寫死的 magic number，而是把目前時間窗換成播放條上的百分比位置。
  const domainSpan = viewTimeRange[1] - viewTimeRange[0];
  const windowLeftPercent = ((timeRange[0] - viewTimeRange[0]) / domainSpan) * 100;
  const windowWidthPercent = ((timeRange[1] - timeRange[0]) / domainSpan) * 100;
  const playbackHeadPercent = ((timeRange[1] - viewTimeRange[0]) / domainSpan) * 100;
  const maxHistogramCount = useMemo(
    () => Math.max(1, ...playbackHistogramBins.map((bin) => bin.count)),
    [playbackHistogramBins],
  );

  useEffect(() => {
    const updatePlaybackChrome = (nextTimeRange: typeof timeRange) => {
      const nextDomainSpan = viewTimeRange[1] - viewTimeRange[0];
      if (nextDomainSpan <= 0) {
        return;
      }

      const nextWindowLeftPercent = ((nextTimeRange[0] - viewTimeRange[0]) / nextDomainSpan) * 100;
      const nextWindowWidthPercent = ((nextTimeRange[1] - nextTimeRange[0]) / nextDomainSpan) * 100;
      const nextPlaybackHeadPercent = ((nextTimeRange[1] - viewTimeRange[0]) / nextDomainSpan) * 100;

      if (windowRef.current) {
        windowRef.current.style.left = `${nextWindowLeftPercent}%`;
        windowRef.current.style.width = `${nextWindowWidthPercent}%`;
      }

      if (startHandleRef.current) {
        startHandleRef.current.style.left = `${nextWindowLeftPercent}%`;
      }

      if (endHandleRef.current) {
        endHandleRef.current.style.left = `${nextWindowLeftPercent + nextWindowWidthPercent}%`;
      }

      if (headRef.current) {
        headRef.current.style.left = `${nextPlaybackHeadPercent}%`;
      }

      if (readoutStartRef.current) {
        readoutStartRef.current.textContent = formatMillisecondsToHourMinute(nextTimeRange[0]);
      }

      if (readoutEndRef.current) {
        readoutEndRef.current.textContent = formatMillisecondsToHourMinute(nextTimeRange[1]);
      }

      if (captionRangeRef.current) {
        captionRangeRef.current.textContent = `${formatMillisecondsToClock(nextTimeRange[0])} - ${formatMillisecondsToClock(nextTimeRange[1])}`;
      }
    };

    updatePlaybackChrome(timeRange);
    return subscribePlaybackFrame(() => {
      updatePlaybackChrome(getPlaybackFrameSnapshot().timeRange);
    });
  }, [timeRange, viewTimeRange]);

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
            className="moi-playback-toggle rounded-full"
            onClick={() => (isPlaying ? pausePlayback() : startPlayback())}
            variant={isPlaying ? 'secondary' : 'default'}
          >
            {isPlaying ? <Pause className="moi-playback-toggle-icon h-4 w-4" /> : <Play className="moi-playback-toggle-icon h-4 w-4" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>
          <div className="moi-playback-speed-group">
            {[30, 60, 120, 240].map((speed) => (
              <Button
                className={`moi-playback-speed-button${timeScale === speed ? ' is-active' : ''}`}
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
          <strong ref={readoutStartRef}>{formatMillisecondsToHourMinute(timeRange[0])}</strong>
          <span>-</span>
          <strong ref={readoutEndRef}>{formatMillisecondsToHourMinute(timeRange[1])}</strong>
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
        <div className="moi-playback-histogram" aria-hidden="true">
          {playbackHistogramBins.map((bin) => {
            const left = ((bin.startMs - viewTimeRange[0]) / domainSpan) * 100;
            const width = ((bin.endMs - bin.startMs) / domainSpan) * 100;
            const height = bin.count > 0
              ? Math.max(8, (bin.count / maxHistogramCount) * 100)
              : 0;

            return (
              <span
                key={`${bin.startMs}-${bin.endMs}`}
                className="moi-playback-histogram-bar"
                style={{
                  left: `${left}%`,
                  width: `max(2px, calc(${width}% - 1px))`,
                  height: `${height}%`,
                }}
              />
            );
          })}
        </div>

        <div className="moi-playback-track-rail" />

        <div
          ref={windowRef}
          className="moi-playback-window"
          style={{
            left: `${windowLeftPercent}%`,
            width: `${windowWidthPercent}%`,
          }}
        />

        <button
          ref={startHandleRef}
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
          ref={endHandleRef}
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
          ref={headRef}
          className="moi-playback-head"
          style={{
            left: `${playbackHeadPercent}%`,
          }}
        />
      </div>

      <div className="moi-playback-caption">
        <span>Active range</span>
        <span ref={captionRangeRef}>{formatMillisecondsToClock(timeRange[0])} - {formatMillisecondsToClock(timeRange[1])}</span>
        <span>Speed x{timeScale}</span>
      </div>

      <div className="moi-playback-boundary-row">
        <span>Start {formatMillisecondsToClock(viewTimeRange[0])}</span>
        <span>End {formatMillisecondsToClock(viewTimeRange[1])}</span>
      </div>
    </Card>
  );
}
