// 這個檔案負責定義 scenario SQL query hook 之間共用的查詢結果型別。
import type * as arrow from 'apache-arrow';
import type {QueryTrajectoryRow} from '../../../types';

export type TrajectoryQueryResult = {
  data?: {rows: () => Iterable<QueryTrajectoryRow>; arrowTable: arrow.Table} | null;
  error?: Error | null;
  isLoading: boolean;
};
