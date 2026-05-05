// 這個檔案負責建立 app slice 的初始 scenario、圖層透明度與播放狀態。
import {
  createAppliedScenario,
  createInitialScenario,
} from '../lib/controller';

// 這裡是時間播放系統的工具，負責：時間範圍、播放速度、動畫起點
import {
  getInitialAccumulatedAmount,  // 已經播放了多少時間（初始）
  getInitialDisplayRange,
  PLAYBACK_DOMAIN,
  PLAYBACK_INITIAL_SPEED,    //預設播放速度（例如 1x）
} from '../lib/timeplayback';

//  型別（只是檢查用）
import type {
  BenchmarkCounts,
  LayerOpacity,
} from '../types';
import type {AppSliceState} from './appStoreTypes';

// 建立一開始的資料設定 例如：預設用哪個 dataset、哪些條件
const initialScenario = createInitialScenario();
// 用來記錄目前畫面上有多少資料量
const initialCounts: BenchmarkCounts = {
  tripSegments: 0,
  arcRows: 0,
  heatmapPoints: 0,
};

// 圖層透明度預設
const DEFAULT_LAYER_OPACITY: LayerOpacity = {
  heatmap: 0.55,
  trips: 0.7,
  arc: 0.75,
  boundary: 0.9,
};

// 建立整個 App 的初始狀態
export function createAppInitialState(): Pick<
  AppSliceState['moi'],
  | 'draft'
  | 'applied'
  | 'lastRefreshTargets'
  | 'runStatus'
  | 'runStartedAt'
  | 'benchmarks'
  | 'lastCounts'
  | 'selectedArcKey'
  | 'flowmapEnabled'
  | 'flowmapOpacity'
  | 'selectedFlowId'
  | 'layerOpacity'
  | 'isPlaying'
  | 'tickStartTimestamp'
  | 'accumulatedAmount'
  | 'timeScale'
  | 'viewTimeRange'
  | 'displayTimeRange'
  | 'playbackHistogramBins'
> {
  return {
    draft: initialScenario,
    applied: createAppliedScenario(initialScenario, 1),
    lastRefreshTargets: ['tripSource', 'arcSource', 'keplerMap'],
    runStatus: 'loading',
    runStartedAt: Date.now(),
    benchmarks: [],
    lastCounts: initialCounts,
    selectedArcKey: null,
    flowmapEnabled: false,
    flowmapOpacity: 0.7,
    selectedFlowId: null,
    layerOpacity: DEFAULT_LAYER_OPACITY,
    isPlaying: false,
    tickStartTimestamp: null,
    accumulatedAmount: getInitialAccumulatedAmount(),
    timeScale: PLAYBACK_INITIAL_SPEED,
    viewTimeRange: [...PLAYBACK_DOMAIN],
    displayTimeRange: getInitialDisplayRange(),
    playbackHistogramBins: [],
  };
}
