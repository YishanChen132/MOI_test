// 這個檔案負責組出前端送給 SQLRooms DuckDB 的查詢字串。
import {getDatasetPreset} from './datasets';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from './timeplayback';
import type {AppliedScenario} from './types';

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function buildModeOverlapCondition(column: string, modes: readonly number[]): string {
  if (!modes.length) {
    return 'FALSE';
  }

  return `(${modes.map((mode) => `list_contains(${column}, ${mode})`).join(' OR ')})`;
}

function buildTimeOverlapCondition(column: string, start: number, end: number): string {
  return `list_max(${column}) >= ${start} AND list_min(${column}) <= ${end}`;
}

function buildLimitClause(limit?: number): string {
  return typeof limit === 'number' && limit > 0 ? `LIMIT ${limit}` : '';
}

export function buildTripSourceQuery(applied: AppliedScenario): string {
  const preset = getDatasetPreset(applied.datasetId);
  const table = quoteIdentifier(preset.tripTable);
  const [start, end] = millisecondsRangeToSeconds(applied.timeRange);

  return `
    SELECT
      row_number() OVER () - 1 AS agent_id,
      paths,
      timestamps,
      modes
    FROM ${table}
    WHERE
      ${buildTimeOverlapCondition('timestamps', start, end)}
      AND ${buildModeOverlapCondition('modes', applied.modes)}
    ORDER BY agent_id
  `;
}

export function buildArcSourceQuery(applied: AppliedScenario): string {
  const preset = getDatasetPreset(applied.datasetId);
  const table = quoteIdentifier(preset.arcTable);
  const [start, end] = millisecondsRangeToSeconds(PLAYBACK_DOMAIN);

  return `
    SELECT
      row_number() OVER () - 1 AS agent_id,
      paths,
      timestamps,
      modes
    FROM ${table}
    WHERE
      ${buildTimeOverlapCondition('timestamps', start, end)}
      AND ${buildModeOverlapCondition('modes', applied.modes)}
    ORDER BY agent_id
    ${buildLimitClause(preset.arcRowLimit)}
  `;
}
