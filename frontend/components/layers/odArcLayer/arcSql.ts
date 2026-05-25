// 這個檔案專門放 Arc 圖層要用的 SQL 查詢字串。
import {getDatasetPreset} from '../../../constants/datasets';
import {
  buildLimitClause,
  buildModeOverlapCondition,
  buildScalarModeCondition,
  buildScalarTimeRangeCondition,
  buildTimeOverlapCondition,
  quoteIdentifier,
} from '../../../lib/sql';
import {millisecondsRangeToSeconds, PLAYBACK_DOMAIN} from '../../../lib/timeplayback';
import type {AppliedScenario} from '../../../types';

export function buildArcSourceQuery(applied: AppliedScenario): string {
  const preset = getDatasetPreset(applied.datasetId);
  const table = quoteIdentifier(preset.arcTable);
  const [start, end] = millisecondsRangeToSeconds(PLAYBACK_DOMAIN);
  const timeCondition = preset.arcValueShape === 'scalar'
    ? buildScalarTimeRangeCondition('timestamps', start, end)
    : buildTimeOverlapCondition('timestamps', start, end);
  const modeCondition = preset.arcValueShape === 'scalar'
    ? buildScalarModeCondition('modes', applied.modes)
    : buildModeOverlapCondition('modes', applied.modes);

  return `
    SELECT
      row_number() OVER () - 1 AS agent_id,
      paths,
      timestamps,
      modes
    FROM ${table}
    WHERE
      ${timeCondition}
      AND ${modeCondition}
    ORDER BY agent_id
    ${buildLimitClause(preset.arcRowLimit)}
  `;
}
