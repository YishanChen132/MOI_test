// 這個檔案負責定義這個全域狀態系統要長什麼樣子，還有外部可以呼叫哪些動作
import type {DatasetPresetId} from '../constants/datasets';
import type {ModeCode} from '../constants/modes';
import type {
  AppliedScenario,
  AdjustableLayerId,
  BenchmarkCounts,
  BenchmarkEntry,
  LayerId,
  LayerOpacity,
  PlaybackHistogramBin,
  ScenarioConfig,
  TimeRangeMilliseconds,
} from '../types';

export type AppSliceState = {
  moi: {
    draft: ScenarioConfig;
    applied: AppliedScenario;
    lastRefreshTargets: string[];
    runStatus: 'loading' | 'ready' | 'error';
    runStartedAt: number;
    benchmarks: BenchmarkEntry[];
    lastCounts: BenchmarkCounts;
    selectedArcKey: string | null;
    flowmapEnabled: boolean;
    flowmapOpacity: number;
    selectedFlowId: string | null;
    layerOpacity: LayerOpacity;
    isPlaying: boolean;
    tickStartTimestamp: number | null;
    accumulatedAmount: number;
    timeScale: number;
    viewTimeRange: TimeRangeMilliseconds;
    displayTimeRange: TimeRangeMilliseconds;
    playbackHistogramBins: PlaybackHistogramBin[];
    setDatasetPreset: (datasetId: DatasetPresetId) => void;
    setLayerEnabled: (layerId: LayerId, enabled: boolean) => void;
    setModeEnabled: (mode: ModeCode, enabled: boolean) => void;
    setLayerOpacity: (layerId: AdjustableLayerId, opacity: number) => void;
    setSelectedArc: (arcKey: string | null) => void;
    clearSelectedArc: () => void;
    setFlowmapEnabled: (enabled: boolean) => void;
    setFlowmapOpacity: (opacity: number) => void;
    setSelectedFlowId: (flowId: string | null) => void;
    clearSelectedFlowId: () => void;
    startPlayback: () => void;
    pausePlayback: () => void;
    tickPlayback: (now?: number) => void;
    seekPlaybackPosition: (nextValue: number) => void;
    setDisplayTimeRange: (nextRange: TimeRangeMilliseconds) => void;
    setTimeRange: (nextRange: TimeRangeMilliseconds) => void;
    setPlaybackSpeed: (speed: number) => void;
    setPlaybackHistogramBins: (bins: PlaybackHistogramBin[]) => void;
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
