// 這個檔案建立
// - 開關圖層（layer）
// - 開關交通模式（mode）
// - 調整透明度
// - 選取 / 取消選取 arc
import {
  summarizeLayers,
  toggleModeSelection,
} from '../lib/controller';
import type {
  AppGet,
  AppSet,
} from './appActionTypes';
import type {AppSliceState} from './appStoreTypes';

export function createMobilitySlice(
  set: AppSet,
  get: AppGet,
): Pick<
  AppSliceState['moi'],
  | 'setLayerEnabled'
  | 'setModeEnabled'
  | 'setLayerOpacity'
  | 'setSelectedArc'
  | 'clearSelectedArc'
  | 'setFlowmapEnabled'
  | 'setFlowmapOpacity'
  | 'setSelectedFlowId'
  | 'clearSelectedFlowId'
  | 'getLayerSummary'
> {
  return {
    
   // 開關圖層
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
    
    // 開關交通模式
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

    //調整圖層透明度
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

    // 選取 arc（用來 highlight）
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
    setFlowmapEnabled: (enabled) => {
      set((state) => ({
        moi: {
          ...state.moi,
          flowmapEnabled: enabled,
          selectedFlowId: enabled ? state.moi.selectedFlowId : null,
        },
      }));
    },
    setFlowmapOpacity: (opacity) => {
      set((state) => ({
        moi: {
          ...state.moi,
          flowmapOpacity: Math.max(0.02, Math.min(1, opacity)),
        },
      }));
    },
    setSelectedFlowId: (flowId) => {
      set((state) => ({
        moi: {
          ...state.moi,
          selectedFlowId: flowId,
        },
      }));
    },
    clearSelectedFlowId: () => {
      set((state) => ({
        moi: {
          ...state.moi,
          selectedFlowId: null,
        },
      }));
    },
    
    // 取得圖層摘要
    getLayerSummary: () => summarizeLayers(get().moi.applied.layers),
  };
}
