import {buildTripSourceQuery} from '../components/layers/tripsLayer/tripSql';
import type {AppliedScenario} from '../types';

function buildAppliedScenario(datasetId: AppliedScenario['datasetId']): AppliedScenario {
  return {
    datasetId,
    layers: {
      trips: true,
      arc: false,
      heatmap: false,
      boundary: true,
    },
    modes: [2, 8],
    timeRange: [9_000_000, 9_600_000],
    requestId: 1,
    appliedAt: 0,
  };
}

describe('trip source SQL', () => {
  it('keeps the legacy global query when viewport bounds are missing', () => {
    const query = buildTripSourceQuery(buildAppliedScenario('9000'));

    expect(query).toContain('list_max(timestamps) >= 9000');
    expect(query).toContain('list_min(timestamps) <= 19800');
    expect(query).toContain('list_contains(modes, 2)');
    expect(query).not.toContain('point_index');
  });

  it('keeps the same SQL shape regardless of viewport handling moving to cache filtering', () => {
    const query = buildTripSourceQuery(buildAppliedScenario('9000'));
    expect(query).toContain('list_max(timestamps) >= 9000');
    expect(query).toContain('list_contains(modes, 2)');
    expect(query).not.toContain('point_index');
  });
});
