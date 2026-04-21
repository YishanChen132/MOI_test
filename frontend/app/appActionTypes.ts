// 這個檔案負責定義 app slice action factory 會共用到的 set/get 型別。
import type {StateCreator} from 'zustand';
import type {AppSliceState} from './appStoreTypes';
import type {RoomState} from './store';

type AppStateCreator = StateCreator<RoomState, [], [], AppSliceState>;

export type AppSet = Parameters<AppStateCreator>[0];
export type AppGet = Parameters<AppStateCreator>[1];
