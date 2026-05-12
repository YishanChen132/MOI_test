// 這個檔案負責組合 app slice 的初始狀態與各類 domain actions。
import type {StateCreator} from 'zustand';
import {createAppInitialState} from './appInitialState';
import {createMobilitySlice} from './mobilitySlice';
import {createPlaybackSlice} from './playbackSlice';
import {createRunSlice} from './runSlice';
import {createScenarioSlice} from './scenarioSlice';
import type {AppSliceState} from './appStoreTypes';
import type {RoomState} from './store';

export const createAppSlice: StateCreator<RoomState, [], [], AppSliceState> = (set, get) => ({
  moi: {
    ...createAppInitialState(),
    ...createScenarioSlice(set, get),
    ...createMobilitySlice(set, get),
    ...createPlaybackSlice(set, get),
    ...createRunSlice(set, get),
  },
});
