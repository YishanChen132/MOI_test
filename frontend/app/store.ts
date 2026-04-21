// 這個檔案負責建立 SQLRooms 與 kepler 共用的前端狀態管理 store。
import {createWasmDuckDbConnector} from '@sqlrooms/duckdb';
import {createKeplerSlice, type KeplerSliceState} from '@sqlrooms/kepler';
import {createRoomShellSlice, createRoomStore, type RoomShellSliceState} from '@sqlrooms/room-shell';
import {
  createAppliedScenario,
  createBenchmarkEntry,
  createInitialScenario,
  DEFAULT_LAYERS,
  sortModes,
  summarizeLayers,
  toggleModeSelection,
  clampTimeRange as clampScenarioTimeRange,
  computeScenarioRefreshTargets as computeScenarioTargets,
  scenarioEquals as scenarioConfigEquals,
} from '../lib/controller';
import {
  DEFAULT_DATASET_PRESET_ID,
  getPresetRoomDataSources,
  type DatasetPresetId,
} from '../constants/datasets';
import type {ModeCode} from '../constants/modes';
import {
  clampDisplayRange,
  derivePlaybackRange,
  getInitialAccumulatedAmount,
  getInitialDisplayRange,
  PLAYBACK_DOMAIN,
  PLAYBACK_INITIAL_SPEED,
  PLAYBACK_WINDOW_MS,
} from '../lib/timeplayback';
import type {
  AppliedScenario,
  AdjustableLayerId,
  BenchmarkCounts,
  BenchmarkEntry,
  LayerId,
  LayerOpacity,
  ScenarioConfig,
  TimeRangeMilliseconds,
} from '../types';

type MoiSliceState = {
  moi: {
    draft: ScenarioConfig;
    applied: AppliedScenario;
    lastRefreshTargets: string[];
    runStatus: 'loading' | 'ready' | 'error';
    runStartedAt: number;
    benchmarks: BenchmarkEntry[];
    lastError: string | null;
    lastCounts: BenchmarkCounts;
    selectedArcKey: string | null;
    layerOpacity: LayerOpacity;
    isPlaying: boolean;
    tickStartTimestamp: number | null;
    accumulatedAmount: number;
    timeScale: number;
    viewTimeRange: TimeRangeMilliseconds;
    displayTimeRange: TimeRangeMilliseconds;
    setDatasetPreset: (datasetId: DatasetPresetId) => void;
    setLayerEnabled: (layerId: LayerId, enabled: boolean) => void;
    setModeEnabled: (mode: ModeCode, enabled: boolean) => void;
    setLayerOpacity: (layerId: AdjustableLayerId, opacity: number) => void;
    setSelectedArc: (arcKey: string | null) => void;
    clearSelectedArc: () => void;
    startPlayback: () => void;
    pausePlayback: () => void;
    tickPlayback: (now?: number) => void;
    seekPlaybackPosition: (nextValue: number) => void;
    setDisplayTimeRange: (nextRange: TimeRangeMilliseconds) => void;
    setTimeRange: (nextRange: TimeRangeMilliseconds) => void;
    setPlaybackSpeed: (speed: number) => void;
    applyDraft: () => void;
    completeRun: (
      requestId: number,
      counts: BenchmarkCounts,
      status: 'success' | 'error',
      errorMessage?: string,
    ) => void;
    clearBenchmarks: () => void;
    hasDraftChanges: () => boolean;
    getLayerSummary: () => string;
  };
};

export type RoomState = RoomShellSliceState & KeplerSliceState & MoiSliceState;

const initialScenario = createInitialScenario();

const initialCounts: BenchmarkCounts = {
  tripSegments: 0,
  arcRows: 0,
  heatmapPoints: 0,
};

const DEFAULT_LAYER_OPACITY: LayerOpacity = {
  heatmap: 0.55,
  trips: 0.7,
  arc: 0.75,
  boundary: 0.9,
};

const MIN_ACTIVE_WINDOW_MS = 60_000;

function getActiveWindowWidth(
  timeRange: TimeRangeMilliseconds,
  displayTimeRange: TimeRangeMilliseconds,
): number {
  const displayWidth = Math.max(0, displayTimeRange[1] - displayTimeRange[0]);
  const rawWidth = Number.isFinite(timeRange[1] - timeRange[0]) ? timeRange[1] - timeRange[0] : PLAYBACK_WINDOW_MS;
  return Math.max(MIN_ACTIVE_WINDOW_MS, Math.min(rawWidth, displayWidth));
}

function clampActiveTimeRange(
  [start, end]: TimeRangeMilliseconds,
  displayTimeRange: TimeRangeMilliseconds,
): TimeRangeMilliseconds {
  const displayStart = displayTimeRange[0];
  const displayEnd = displayTimeRange[1];
  const safeStart = Number.isFinite(start) ? start : displayStart;
  const safeEnd = Number.isFinite(end) ? end : displayStart + PLAYBACK_WINDOW_MS;
  const minWindow = Math.min(MIN_ACTIVE_WINDOW_MS, displayEnd - displayStart);
  const nextStart = Math.max(displayStart, Math.min(safeStart, displayEnd - minWindow));
  const nextEnd = Math.max(
    nextStart + minWindow,
    Math.min(safeEnd, displayEnd),
  );

  return [nextStart, nextEnd];
}

function getPlaybackPosition(
  moi: Pick<
    MoiSliceState['moi'],
    'accumulatedAmount' | 'displayTimeRange' | 'isPlaying' | 'tickStartTimestamp' | 'timeScale'
  >,
  now = Date.now(),
): number {
  if (!moi.isPlaying || !moi.tickStartTimestamp) {
    return Math.max(moi.displayTimeRange[0], Math.min(moi.accumulatedAmount, moi.displayTimeRange[1]));
  }

  return Math.max(
    moi.displayTimeRange[0],
    Math.min(moi.accumulatedAmount + (now - moi.tickStartTimestamp) * moi.timeScale, moi.displayTimeRange[1]),
  );
}

export const {roomStore, useRoomStore} = createRoomStore<RoomState>((set, get, store) => ({
  ...createRoomShellSlice({
    config: {
      title: 'MOI Test',
      dataSources: getPresetRoomDataSources(DEFAULT_DATASET_PRESET_ID),
    },
    connector: createWasmDuckDbConnector({
      query: {
        castTimestampToDate: true,
        castBigIntToDouble: true,
      },
    }),
  })(set, get, store),
  ...createKeplerSlice({
    actionLogging: false,
  })(set, get, store),
  moi: {
    draft: initialScenario,
    applied: createAppliedScenario(initialScenario, 1),
    lastRefreshTargets: ['tripSource', 'arcSource', 'keplerMap'],
    runStatus: 'loading',
    runStartedAt: Date.now(),
    benchmarks: [],
    lastError: null,
    lastCounts: initialCounts,
    selectedArcKey: null,
    layerOpacity: DEFAULT_LAYER_OPACITY,
    isPlaying: false,
    tickStartTimestamp: null,
    accumulatedAmount: getInitialAccumulatedAmount(),
    timeScale: PLAYBACK_INITIAL_SPEED,
    viewTimeRange: [...PLAYBACK_DOMAIN],
    displayTimeRange: getInitialDisplayRange(),
    setDatasetPreset: (datasetId) => {
      set((state) => ({
        moi: {
          ...state.moi,
          draft: {
            ...state.moi.draft,
            datasetId,
          },
        },
      }));
      get().moi.applyDraft();
    },
    setLayerEnabled: (layerId, enabled) => {
      set((state) => ({
        moi: {
          ...state.moi,
          selectedArcKey:
            layerId === 'arc' && !enabled ? null : state.moi.selectedArcKey,
          draft: {
            ...state.moi.draft,
            layers: {
              ...state.moi.draft.layers,
              [layerId]: enabled,
            },
          },
        },
      }));
      get().moi.applyDraft();
    },
    setModeEnabled: (mode, enabled) => {
      set((state) => ({
        moi: {
          ...state.moi,
          draft: {
            ...state.moi.draft,
            modes: toggleModeSelection(state.moi.draft.modes, mode, enabled),
          },
        },
      }));
      get().moi.applyDraft();
    },
    setLayerOpacity: (layerId, opacity) => {
      set((state) => ({
        moi: {
          ...state.moi,
          layerOpacity: {
            ...state.moi.layerOpacity,
            [layerId]: Math.max(0.02, Math.min(1, opacity)),
          },
        },
      }));
    },
    setSelectedArc: (arcKey) => {
      set((state) => ({
        moi: {
          ...state.moi,
          selectedArcKey: arcKey,
        },
      }));
    },
    clearSelectedArc: () => {
      set((state) => ({
        moi: {
          ...state.moi,
          selectedArcKey: null,
        },
      }));
    },
    startPlayback: () => {
      set((state) => {
        if (state.moi.isPlaying) {
          return state;
        }

        const atEnd = state.moi.applied.timeRange[1] >= state.moi.displayTimeRange[1];
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
    tickPlayback: (now = Date.now()) => {
      set((state) => {
        if (!state.moi.isPlaying || !state.moi.tickStartTimestamp) {
          return state;
        }

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
    setDisplayTimeRange: (nextRange) => {
      set((state) => {
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
    applyDraft: () => {
      const {draft, applied} = get().moi;
      const nextApplied = createAppliedScenario(
        {
          ...draft,
          modes: sortModes(draft.modes),
          timeRange: clampScenarioTimeRange(draft.timeRange),
        },
        applied.requestId + 1,
      );

      set((state) => ({
        moi: {
          ...state.moi,
          applied: nextApplied,
          lastRefreshTargets: computeScenarioTargets(state.moi.applied, nextApplied),
          runStatus: 'loading',
          runStartedAt: Date.now(),
          lastError: null,
        },
      }));
    },
    completeRun: (requestId, counts, status, errorMessage) => {
      const activeRequestId = get().moi.applied.requestId;
      if (activeRequestId !== requestId) {
        return;
      }

      const {applied, runStartedAt, benchmarks} = get().moi;
      const durationMs = Math.max(0, Date.now() - runStartedAt);
      const entry = createBenchmarkEntry(applied, durationMs, counts, status, errorMessage);

      set((state) => ({
        moi: {
          ...state.moi,
          benchmarks: [entry, ...state.moi.benchmarks].slice(0, 12),
          runStatus: status === 'success' ? 'ready' : 'error',
          lastError: errorMessage ?? null,
          lastCounts: counts,
        },
      }));
    },
    clearBenchmarks: () => {
      set((state) => ({
        moi: {
          ...state.moi,
          benchmarks: [],
        },
      }));
    },
    hasDraftChanges: () => {
      const {draft, applied} = get().moi;
      return !scenarioConfigEquals(draft, applied);
    },
    getLayerSummary: () => summarizeLayers(get().moi.applied.layers),
  },
}));
