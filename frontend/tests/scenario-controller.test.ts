// 這個檔案負責測試場景控制器的時間、模式與刷新判斷邏輯。
import {
  clampTimeRange,
  computeScenarioRefreshTargets,
  createAppliedScenario,
  createBenchmarkEntry,
  createInitialScenario,
  isCurrentRequest,
  scenarioEquals,
  toggleModeSelection,
} from '../lib/controller';

describe('scenario controller helpers', () => {
  it('creates a stable initial scenario', () => {
    const scenario = createInitialScenario();

    expect(scenario.datasetId).toBe('2000');
    expect(scenario.layers).toEqual({
      trips: false,
      arc: true,
      heatmap: false,
    });
    expect(scenario.modes).toHaveLength(4);
    expect(scenario.timeRange).toEqual([9_000_000, 9_600_000]);
  });

  it('clamps invalid time ranges to a safe ascending window', () => {
    expect(clampTimeRange([20_000_000, 19_000_000])).toEqual([20_000_000, 20_600_000]);
    expect(clampTimeRange([-50, 86_999_000])).toEqual([21_000_000, 21_600_000]);
  });

  it('always preserves a 10-minute playback window', () => {
    expect(clampTimeRange([9_000_000, 12_000_000])).toEqual([11_400_000, 12_000_000]);
    expect(clampTimeRange([9_500_000, 9_700_000])).toEqual([9_500_000, 10_100_000]);
  });

  it('only refreshes the trip source when trips/heatmap inputs change', () => {
    const previous = createInitialScenario();
    const next = {
      ...previous,
      layers: {
        ...previous.layers,
        arc: false,
      },
    };

    expect(computeScenarioRefreshTargets(previous, next)).toEqual(['arcSource', 'keplerMap']);
  });

  it('refreshes both source queries when filters change', () => {
    const previous = createInitialScenario();
    const next = {
      ...previous,
      datasetId: '5000' as const,
      timeRange: [10_000_000, 12_000_000] as [number, number],
    };

    expect(computeScenarioRefreshTargets(previous, next)).toEqual([
      'tripSource',
      'arcSource',
      'keplerMap',
    ]);
  });

  it('creates monotonically newer applied scenarios and ignores stale run completions', () => {
    const scenario = createInitialScenario();
    const first = createAppliedScenario(scenario, 2, 100);
    const second = createAppliedScenario(
      {
        ...scenario,
        datasetId: '9000',
      },
      3,
      110,
    );

    expect(second.requestId).toBeGreaterThan(first.requestId);
    expect(isCurrentRequest(second.requestId, first.requestId)).toBe(false);
    expect(isCurrentRequest(second.requestId, second.requestId)).toBe(true);
  });

  it('preserves sorted mode selection order and compares scenarios structurally', () => {
    const scenario = createInitialScenario();
    const withoutRail = toggleModeSelection(scenario.modes, 16, false);
    const restored = toggleModeSelection(withoutRail, 16, true);

    expect(withoutRail).not.toContain(16);
    expect(restored).toEqual(scenario.modes);
    expect(scenarioEquals(scenario, {...scenario})).toBe(true);
  });

  it('creates benchmark entries with scenario metadata', () => {
    const applied = createAppliedScenario(createInitialScenario(), 4, 200);
    const entry = createBenchmarkEntry(
      applied,
      345,
      {
        tripSegments: 10,
        arcRows: 22,
        heatmapPoints: 101,
      },
      'success',
    );

    expect(entry.requestId).toBe(4);
    expect(entry.durationMs).toBe(345);
    expect(entry.layerSummary).toBe('Arc');
    expect(entry.counts.arcRows).toBe(22);
  });
});
