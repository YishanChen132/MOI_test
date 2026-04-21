// 這個檔案負責組合 SQLRooms room、kepler 與 app slice 成單一前端 store。
import {createWasmDuckDbConnector} from '@sqlrooms/duckdb';
import {createKeplerSlice, type KeplerSliceState} from '@sqlrooms/kepler';
import {createRoomShellSlice, createRoomStore, type RoomShellSliceState} from '@sqlrooms/room-shell';
import {
  DEFAULT_DATASET_PRESET_ID,
  getPresetRoomDataSources,
} from '../constants/datasets';
import {createAppSlice} from './appSlice';
import type {AppSliceState} from './appStoreTypes';

export type RoomState = RoomShellSliceState & KeplerSliceState & AppSliceState;

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
  ...createAppSlice(set, get, store),
}));
