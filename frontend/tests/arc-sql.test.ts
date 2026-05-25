import {buildArcSourceQuery} from '../components/layers/odArcLayer/arcSql';
import type {AppliedScenario} from '../types';

function buildAppliedScenario(datasetId: AppliedScenario['datasetId']): AppliedScenario {
  return {
    datasetId,
    layers: {
      trips: false,
      arc: true,
      heatmap: false,
      boundary: true,
    },
    modes: [2, 8],
    timeRange: [9_000_000, 9_600_000],
    requestId: 1,
    appliedAt: 0,
  };
}

describe('arc source SQL', () => {
  it('uses list overlap predicates for legacy arc presets', () => {
    const query = buildArcSourceQuery(buildAppliedScenario('9000'));

    expect(query).toContain('list_max(timestamps) >= 9000');
    expect(query).toContain('list_min(timestamps) <= 19800');
    expect(query).toContain('list_contains(modes, 2)');
  });

  it('uses scalar predicates for the 20000 arc preset', () => {
    const query = buildArcSourceQuery(buildAppliedScenario('20000'));

    expect(query).toContain('timestamps >= 9000 AND timestamps <= 19800');
    expect(query).toContain('modes IN (2, 8)');
    expect(query).not.toContain('list_max(');
    expect(query).not.toContain('list_contains(');
  });

  it('keeps list-based arc SQL unchanged after viewport filtering moved to cache building', () => {
    const query = buildArcSourceQuery(buildAppliedScenario('9000'));
    expect(query).toContain('list_max(timestamps) >= 9000');
    expect(query).toContain('list_contains(modes, 2)');
    expect(query).not.toContain('point_index');
  });

  it('keeps scalar arc SQL unchanged after viewport filtering moved to cache building', () => {
    const query = buildArcSourceQuery(buildAppliedScenario('20000'));
    expect(query).toContain('timestamps >= 9000 AND timestamps <= 19800');
    expect(query).toContain('modes IN (2, 8)');
    expect(query).not.toContain('point_index');
  });
});
