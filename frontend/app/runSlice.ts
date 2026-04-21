// 這個檔案負責建立 run 完成回報、benchmark 紀錄與清除 actions。
import {createBenchmarkEntry} from '../lib/controller';
import type {
  AppGet,
  AppSet,
} from './appActionTypes';
import type {AppSliceState} from './appStoreTypes';

export function createRunSlice(
  set: AppSet,
  get: AppGet,
): Pick<
  AppSliceState['moi'],
  | 'completeRun'
  | 'clearBenchmarks'
> {
  return {
    completeRun: (requestId, counts, status, errorMessage) => {
      const activeRequestId = get().moi.applied.requestId;
      if (activeRequestId !== requestId) {
        return;
      }

      const {applied, runStartedAt} = get().moi;
      const durationMs = Math.max(0, Date.now() - runStartedAt);
      const entry = createBenchmarkEntry(applied, durationMs, counts, status, errorMessage);

      set((state) => ({
        moi: {
          ...state.moi,
          benchmarks: [entry, ...state.moi.benchmarks].slice(0, 12),
          runStatus: status === 'success' ? 'ready' : 'error',
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
  };
}
