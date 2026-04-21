// 這個檔案負責查詢目前後端資料表的實際資料筆數並顯示在 Control menu。
import {useSql} from '@sqlrooms/duckdb';
import {DataSourceStatus} from '@sqlrooms/room-shell';
import {useMemo} from 'react';
import {getDatasetPreset} from '../../constants/datasets';
import type {DatasetPresetId} from '../../constants/datasets';
import {quoteIdentifier} from '../../lib/sql';
import {
  type DatasetRowCount,
  getRowCountLabel,
} from './controlMenuUtils';

type DataSourceStates = Record<string, {status?: DataSourceStatus} | undefined>;

export function DatasetRowsStat({
  datasetId,
  roomInitialized,
  dataSourceStates,
}: {
  datasetId: DatasetPresetId;
  roomInitialized: boolean;
  dataSourceStates: DataSourceStates;
}) {
  const datasetPreset = getDatasetPreset(datasetId);
  const rowCountQuery = useMemo(
    () => `
      SELECT
        (SELECT COUNT(*) FROM ${quoteIdentifier(datasetPreset.tripTable)})::DOUBLE AS trip_count,
        (SELECT COUNT(*) FROM ${quoteIdentifier(datasetPreset.arcTable)})::DOUBLE AS arc_count
    `,
    [datasetPreset.arcTable, datasetPreset.tripTable],
  );
  const rowCountReady =
    roomInitialized &&
    dataSourceStates[datasetPreset.tripTable]?.status === DataSourceStatus.READY &&
    dataSourceStates[datasetPreset.arcTable]?.status === DataSourceStatus.READY;
  const rowCountResult = useSql<DatasetRowCount>({
    query: rowCountQuery,
    enabled: rowCountReady,
  });
  const datasetRowCount = useMemo(
    () => Array.from(rowCountResult.data?.rows?.() ?? [])[0] ?? null,
    [rowCountResult.data],
  );
  const rowCountDisplay = getRowCountLabel(
    datasetRowCount,
    datasetPreset.tripTable,
    datasetPreset.arcTable,
  );

  return (
    <div className="moi-mini-stat">
      <span>Rows</span>
      <strong title={rowCountDisplay.title}>{rowCountDisplay.label}</strong>
    </div>
  );
}
