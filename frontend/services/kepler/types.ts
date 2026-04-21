// 這個檔案負責集中定義 kepler service 對外共用的資料與 store 型別。
import type {KeplerSliceState} from '@sqlrooms/kepler';
import type {StoreApi} from 'zustand';

export type DatasetDescriptor = {
  id: string;
  label: string;
  processed: unknown;
};

export type RoomStoreWithKepler = StoreApi<KeplerSliceState>;
