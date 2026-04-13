// 這個檔案負責測試資料轉換是否正確切段、展平和保留時間資訊。
import {
  flattenArcRows,
  flattenHeatmapRows,
  normalizeNumericArray,
  segmentTripRows,
} from '../lib/transforms';
import type {QueryTrajectoryRow} from '../lib/types';

describe('transform helpers', () => {
  it('segments trips by continuous mode within the selected window', () => {
    const rows: QueryTrajectoryRow[] = [
      {
        agent_id: 7,
        paths: [121.5, 25.0, 121.51, 25.01, 121.52, 25.02, 121.53, 25.03],
        timestamps: [10_000, 10_100, 10_200, 10_300],
        modes: [2, 2, 8, 8],
      },
    ];

    const geojson = segmentTripRows(rows, [2, 8], [9_900, 10_400]);

    expect(geojson.features).toHaveLength(2);
    expect(geojson.features[0]?.properties).toMatchObject({
      agent_id: 7,
      segment_index: 0,
      mode: 2,
      start_time: 10_000,
      end_time: 10_100,
    });
    expect(geojson.features[0]?.geometry.coordinates).toEqual([
      [121.5, 25.0, 0, 10_000],
      [121.51, 25.01, 0, 10_100],
    ]);
    expect(geojson.features[1]?.properties).toMatchObject({
      segment_index: 1,
      mode: 8,
      start_time: 10_200,
      end_time: 10_300,
    });
  });

  it('ignores invalid or too-short trip rows', () => {
    const rows: QueryTrajectoryRow[] = [
      {
        agent_id: 1,
        paths: [121.5, 25.0],
        timestamps: [10_000],
        modes: [2],
      },
      {
        agent_id: 2,
        paths: [121.5, 25.0, 121.51, 25.01],
        timestamps: [10_000],
        modes: [2, 2],
      },
    ];

    const geojson = segmentTripRows(rows, [2], [9_900, 10_100]);
    expect(geojson.features).toHaveLength(0);
  });

  it('flattens arc rows with the source-point indexing used by the old custom layer', () => {
    const rows: QueryTrajectoryRow[] = [
      {
        agent_id: 4,
        paths: [121.4, 25.1, 121.41, 25.11, 121.42, 25.12],
        timestamps: [11_000, 11_050, 11_100],
        modes: [2, 8, 8],
      },
    ];

    const arcRows = flattenArcRows(rows, [2, 8], [10_900, 11_100]);

    expect(arcRows).toEqual([
      {
        agent_id: 4,
        segment_index: 0,
        source_lng: 121.4,
        source_lat: 25.1,
        target_lng: 121.41,
        target_lat: 25.11,
        mode: 2,
        mode_label: 'Car',
        timestamp: 11_000,
        timestamp_ms: 1_704_078_200_000,
        timestamp_iso: '2024-01-01T03:03:20Z',
      },
      {
        agent_id: 4,
        segment_index: 1,
        source_lng: 121.41,
        source_lat: 25.11,
        target_lng: 121.42,
        target_lat: 25.12,
        mode: 8,
        mode_label: 'Bus',
        timestamp: 11_050,
        timestamp_ms: 1_704_078_250_000,
        timestamp_iso: '2024-01-01T03:04:10Z',
      },
    ]);
  });

  it('flattens heatmap points with the expected path coordinate pairing', () => {
    const rows: QueryTrajectoryRow[] = [
      {
        agent_id: 9,
        paths: [121.45, 25.15, 121.46, 25.16, 121.47, 25.17],
        timestamps: [12_000, 12_010, 12_020],
        modes: [1, 2, 4],
      },
    ];

    const heatmapRows = flattenHeatmapRows(rows, [2, 4], [12_005, 12_020]);

    expect(heatmapRows).toEqual([
      {
        agent_id: 9,
        point_index: 1,
        lng: 121.46,
        lat: 25.16,
        mode: 2,
        mode_label: 'Car',
        timestamp: 12_010,
      },
      {
        agent_id: 9,
        point_index: 2,
        lng: 121.47,
        lat: 25.17,
        mode: 4,
        mode_label: 'Mode 4',
        timestamp: 12_020,
      },
    ]);
  });

  it('normalizes typed arrays into plain numeric arrays', () => {
    expect(normalizeNumericArray(new Float32Array([1, 2, 3]))).toEqual([1, 2, 3]);
  });
});
