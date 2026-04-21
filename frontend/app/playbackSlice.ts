// 這個檔案負責建立 playback 播放、暫停，包含：
// - 播放（startPlayback）
// - 暫停（pausePlayback）
// - 每一幀推進（tickPlayback）
// - 拖曳時間（seek）
// - 改時間窗（displayTimeRange）
// - 改播放速度

// 這些是時間計算工具
import {
  clampDisplayRange,
  derivePlaybackRange,
  PLAYBACK_INITIAL_SPEED,
} from '../lib/timeplayback';
import type {AppSet} from './appActionTypes';

// 這些是播放邏輯 
import {
  clampActiveTimeRange,
  getActiveWindowWidth,
  getPlaybackPosition,
} from './playbackTiming';
import type {AppSliceState} from './appStoreTypes';

export function createPlaybackSlice(
  set: AppSet,
): Pick<
  AppSliceState['moi'],
  | 'startPlayback'
  | 'pausePlayback'
  | 'tickPlayback'
  | 'seekPlaybackPosition'
  | 'setDisplayTimeRange'
  | 'setTimeRange'
  | 'setPlaybackSpeed'
> {
  return {
    startPlayback: () => {
      set((state) => {
        if (state.moi.isPlaying) {
          return state;
        }

         // 判斷是不是已經播到最後
        const atEnd = state.moi.applied.timeRange[1] >= state.moi.displayTimeRange[1];
        // 計算目前播放視窗寬度
        const activeWindowWidth = getActiveWindowWidth(
          state.moi.applied.timeRange,
          state.moi.displayTimeRange,
        );
        const nextAccumulatedAmount = atEnd
          ? Math.min(
              state.moi.displayTimeRange[0] + activeWindowWidth,
              state.moi.displayTimeRange[1],
            )
          : state.moi.accumulatedAmount;
        
        // 目前位置 + 視窗寬度算出新的 timeRange
          const nextTimeRange = derivePlaybackRange(
          nextAccumulatedAmount,
          activeWindowWidth,
          state.moi.displayTimeRange,
        );

        return {
          moi: {
            ...state.moi,
            isPlaying: true,
            tickStartTimestamp: Date.now(),
            accumulatedAmount: nextAccumulatedAmount,
            draft: {
              ...state.moi.draft,
              timeRange: nextTimeRange,
            },
            applied: {
              ...state.moi.applied,
              timeRange: nextTimeRange,
            },
          },
        };
      });
    },
    pausePlayback: () => {
      set((state) => {
        if (!state.moi.isPlaying) {
          return state;
        }

        const nextAccumulatedAmount = getPlaybackPosition(state.moi);
        const activeWindowWidth = getActiveWindowWidth(
          state.moi.applied.timeRange,
          state.moi.displayTimeRange,
        );
        const nextTimeRange = derivePlaybackRange(
          nextAccumulatedAmount,
          activeWindowWidth,
          state.moi.displayTimeRange,
        );

        return {
          moi: {
            ...state.moi,
            isPlaying: false,
            tickStartTimestamp: null,
            accumulatedAmount: nextAccumulatedAmount,
            draft: {
              ...state.moi.draft,
              timeRange: nextTimeRange,
            },
            applied: {
              ...state.moi.applied,
              timeRange: nextTimeRange,
            },
          },
        };
      });
    },
    
    // 每一幀更新
    tickPlayback: (now = Date.now()) => {
      set((state) => {
        if (!state.moi.isPlaying || !state.moi.tickStartTimestamp) {
          return state;
        }
        // 算現在應該播放到哪裡
        const nextPlaybackPosition = getPlaybackPosition(state.moi, now);
        const activeWindowWidth = getActiveWindowWidth(
          state.moi.applied.timeRange,
          state.moi.displayTimeRange,
        );
        const nextTimeRange = derivePlaybackRange(
          nextPlaybackPosition,
          activeWindowWidth,
          state.moi.displayTimeRange,
        );

        if (nextPlaybackPosition >= state.moi.displayTimeRange[1]) {
          return {
            moi: {
              ...state.moi,
              isPlaying: false,
              tickStartTimestamp: null,
              accumulatedAmount: state.moi.displayTimeRange[1],
              draft: {
                ...state.moi.draft,
                timeRange: nextTimeRange,
              },
              applied: {
                ...state.moi.applied,
                timeRange: nextTimeRange,
              },
            },
          };
        }

        return {
          moi: {
            ...state.moi,
            draft: {
              ...state.moi.draft,
              timeRange: nextTimeRange,
            },
            applied: {
              ...state.moi.applied,
              timeRange: nextTimeRange,
            },
          },
        };
      });
    },

    // 拖曳時間
    seekPlaybackPosition: (nextValue) => {
      set((state) => {
        const nextAccumulatedAmount = Math.max(
          state.moi.displayTimeRange[0],
          Math.min(Math.round(nextValue), state.moi.displayTimeRange[1]),
        );
        const activeWindowWidth = getActiveWindowWidth(
          state.moi.applied.timeRange,
          state.moi.displayTimeRange,
        );
        const nextTimeRange = derivePlaybackRange(
          nextAccumulatedAmount,
          activeWindowWidth,
          state.moi.displayTimeRange,
        );

        return {
          moi: {
            ...state.moi,
            isPlaying: false,  // 拖曳會停止播放
            tickStartTimestamp: null,
            accumulatedAmount: nextAccumulatedAmount,
            draft: {
              ...state.moi.draft,
              timeRange: nextTimeRange,
            },
            applied: {
              ...state.moi.applied,
              timeRange: nextTimeRange,
            },
          },
        };
      });
    },

    // 改變時間視窗（UI）
    setDisplayTimeRange: (nextRange) => {
      set((state) => {
         // 限制不能超出總時間
        const nextDisplayTimeRange = clampDisplayRange(nextRange, state.moi.viewTimeRange);
        const activeWindowWidth = getActiveWindowWidth(
          state.moi.applied.timeRange,
          nextDisplayTimeRange,
        );
        const nextAccumulatedAmount = Math.max(
          nextDisplayTimeRange[0] + activeWindowWidth,
          Math.min(getPlaybackPosition(state.moi), nextDisplayTimeRange[1]),
        );
        const nextTimeRange = derivePlaybackRange(
          nextAccumulatedAmount,
          activeWindowWidth,
          nextDisplayTimeRange,
        );

        return {
          moi: {
            ...state.moi,
            isPlaying: false,
            tickStartTimestamp: null,
            accumulatedAmount: nextAccumulatedAmount,
            displayTimeRange: nextDisplayTimeRange,
            draft: {
              ...state.moi.draft,
              timeRange: nextTimeRange,
            },
            applied: {
              ...state.moi.applied,
              timeRange: nextTimeRange,
            },
          },
        };
      });
    },

    // 設定播放範圍
    setTimeRange: (nextRange) => {
      set((state) => {
        const nextTimeRange = clampActiveTimeRange(nextRange, state.moi.displayTimeRange);
        const nextAccumulatedAmount = nextTimeRange[1];

        return {
          moi: {
            ...state.moi,
            isPlaying: false,
            tickStartTimestamp: null,
            accumulatedAmount: nextAccumulatedAmount,
            draft: {
              ...state.moi.draft,
              timeRange: nextTimeRange,
            },
            applied: {
              ...state.moi.applied,
              timeRange: nextTimeRange,
            },
          },
        };
      });
    },

    // 改播放速度
    setPlaybackSpeed: (speed) => {
      set((state) => {
        const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : PLAYBACK_INITIAL_SPEED;
        const nextAccumulatedAmount = getPlaybackPosition(state.moi);
        const activeWindowWidth = getActiveWindowWidth(
          state.moi.applied.timeRange,
          state.moi.displayTimeRange,
        );
        const nextTimeRange = derivePlaybackRange(
          nextAccumulatedAmount,
          activeWindowWidth,
          state.moi.displayTimeRange,
        );

        return {
          moi: {
            ...state.moi,
            accumulatedAmount: nextAccumulatedAmount,
            timeScale: safeSpeed,
            tickStartTimestamp: state.moi.isPlaying ? Date.now() : null,
            draft: {
              ...state.moi.draft,
              timeRange: nextTimeRange,
            },
            applied: {
              ...state.moi.applied,
              timeRange: nextTimeRange,
            },
          },
        };
      });
    },
  };
}
