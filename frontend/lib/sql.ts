// 這個檔案放 SQL 查詢會共用到的字串拼接小工具。

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function buildModeOverlapCondition(column: string, modes: readonly number[]): string {
  if (!modes.length) {
    return 'FALSE';
  }

  return `(${modes.map((mode) => `list_contains(${column}, ${mode})`).join(' OR ')})`;
}

export function buildTimeOverlapCondition(column: string, start: number, end: number): string {
  return `list_max(${column}) >= ${start} AND list_min(${column}) <= ${end}`;
}

export function buildLimitClause(limit?: number): string {
  return typeof limit === 'number' && limit > 0 ? `LIMIT ${limit}` : '';
}
