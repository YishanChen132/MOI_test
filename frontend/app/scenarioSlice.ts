// 這個檔案負責建立 dataset 選擇、draft apply 與 scenario diff 相關 actions。
import {
  createAppliedScenario,
  sortModes,
  clampTimeRange as clampScenarioTimeRange,
  computeScenarioRefreshTargets as computeScenarioTargets,
  scenarioEquals as scenarioConfigEquals,
} from '../lib/controller';
import type {
  AppGet,
  AppSet,
} from './appActionTypes';
import type {AppSliceState} from './appStoreTypes';

export function createScenarioSlice(
  set: AppSet,
  get: AppGet,
): Pick<
  AppSliceState['moi'],
  | 'setDatasetPreset'
  | 'applyDraft'
  | 'hasDraftChanges'
> {
  return {
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
        },
      }));
    },
    hasDraftChanges: () => {
      const {draft, applied} = get().moi;
      return !scenarioConfigEquals(draft, applied);
    },
  };
}
