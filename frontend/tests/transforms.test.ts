// 這個檔案負責測試資料轉換是否正確切段、展平和轉成 trajectory / road-node flowmap。
import {flattenArcRows} from '../components/layers/odArcLayer/arcTransform';
import {
  FLOWMAP_COORD_PRECISION,
  FLOWMAP_TIME_BUCKET_SECONDS,
  transformRoadEdgeRowsToSegments,
  transformRoadFlowRowsToSegments,
  transformRoadNodeTransitionRowsToFlowmapData,
  transformTrajectoryRowsToFlowmapData,
} from '../features/flowmap/flowmapTransform';
import {segmentTripRows} from '../components/layers/tripsLayer/tripTransform';
import {secondsOfDayToPlaybackMs} from '../lib/timeplayback';
import {flattenHeatmapRows, normalizeNumericArray} from '../lib/transforms';
import type {
  QueryRoadFlowRow,
  QueryRoadNodeTransitionRow,
  QueryTrajectoryRow,
} from '../types';

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
    expect(geojson.features[0]?.properties?.mode).toBe(2);
    expect(geojson.features[1]?.properties?.mode).toBe(8);
  });

  it('flattens arc rows with the source-point indexing used by the custom layer', () => {
    const rows: QueryTrajectoryRow[] = [
      {
        agent_id: 4,
        paths: [121.4, 25.1, 121.41, 25.11, 121.42, 25.12],
        timestamps: [11_000, 11_050, 11_100],
        modes: [2, 8, 8],
      },
    ];

    const arcRows = flattenArcRows(rows, [2, 8], [10_900, 11_100]);
    expect(arcRows).toHaveLength(2);
    expect(arcRows[0]?.mode_label).toBe('Car');
    expect(arcRows[1]?.mode_label).toBe('Bus');
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
    expect(heatmapRows).toHaveLength(2);
    expect(heatmapRows[0]?.mode_label).toBe('Car');
  });

  it('normalizes typed arrays into plain numeric arrays', () => {
    expect(normalizeNumericArray(new Float32Array([1, 2, 3]))).toEqual([1, 2, 3]);
  });

  it('aggregates trajectory rows into classic flowmap locations and flows', () => {
    const rows: QueryTrajectoryRow[] = [
      {
        agent_id: 3,
        paths: [121.50001, 25.00001, 121.60001, 25.10001, 121.70001, 25.20001],
        timestamps: [11_000, 11_020, 11_150],
        modes: [2, 2, 2],
      },
      {
        agent_id: 4,
        paths: [121.50002, 25.00002, 121.60002, 25.10002],
        timestamps: [11_030, 11_040],
        modes: [2, 2],
      },
    ];

    const data = transformTrajectoryRowsToFlowmapData(rows, [2], [10_900, 11_200]);

    expect(data.locations).toEqual([
      {id: '121.5,25', lon: 121.5, lat: 25},
      {id: '121.6,25.1', lon: 121.6, lat: 25.1},
      {id: '121.7,25.2', lon: 121.7, lat: 25.2},
    ]);
    expect(data.flows).toEqual([
      {
        id: '121.5,25->121.6,25.1:2:10800',
        origin: '121.5,25',
        dest: '121.6,25.1',
        count: 2,
        mode: 2,
        modeLabel: 'Car',
        timestamp: 10_800,
        timestampMs: secondsOfDayToPlaybackMs(10_800),
        timeBucket: 10_800,
      },
      {
        id: '121.6,25.1->121.7,25.2:2:10800',
        origin: '121.6,25.1',
        dest: '121.7,25.2',
        count: 1,
        mode: 2,
        modeLabel: 'Car',
        timestamp: 10_800,
        timestampMs: secondsOfDayToPlaybackMs(10_800),
        timeBucket: 10_800,
      },
    ]);
    expect(FLOWMAP_COORD_PRECISION).toBe(4);
    expect(FLOWMAP_TIME_BUCKET_SECONDS).toBe(600);
  });

  it('aggregates road-node transition rows into the same flowmap layer shape', () => {
    const rows: QueryRoadNodeTransitionRow[] = [
      {
        origin_id: 'node-a',
        origin_lon: 121.501,
        origin_lat: 25.041,
        dest_id: 'node-b',
        dest_lon: 121.503,
        dest_lat: 25.044,
        mode: 2,
        time_bucket: 12_000,
        count: 4,
        route_count: 2,
      },
      {
        origin_id: 'node-a',
        origin_lon: 121.501,
        origin_lat: 25.041,
        dest_id: 'node-b',
        dest_lon: 121.503,
        dest_lat: 25.044,
        mode: 2,
        time_bucket: 12_000,
        count: 3,
        route_count: 1,
      },
      {
        origin_id: 'node-b',
        origin_lon: 121.503,
        origin_lat: 25.044,
        dest_id: 'node-c',
        dest_lon: 121.506,
        dest_lat: 25.047,
        mode: 8,
        time_bucket: 12_060,
        count: 2,
        route_count: 1,
      },
    ];

    const data = transformRoadNodeTransitionRowsToFlowmapData(rows, [2, 8], [11_900, 12_120]);

    expect(data.locations).toEqual([
      {id: 'node-a', lon: 121.501, lat: 25.041},
      {id: 'node-b', lon: 121.503, lat: 25.044},
      {id: 'node-c', lon: 121.506, lat: 25.047},
    ]);
    expect(data.flows).toEqual([
      {
        id: 'node-a->node-b:2:12000',
        origin: 'node-a',
        dest: 'node-b',
        count: 7,
        mode: 2,
        modeLabel: 'Car',
        timestamp: 12_000,
        timestampMs: 1_704_079_200_000,
        timeBucket: 12_000,
        routeCount: 3,
      },
      {
        id: 'node-b->node-c:8:12060',
        origin: 'node-b',
        dest: 'node-c',
        count: 2,
        mode: 8,
        modeLabel: 'Bus',
        timestamp: 12_060,
        timestampMs: 1_704_079_260_000,
        timeBucket: 12_060,
        routeCount: 1,
      },
    ]);
  });

  it('converts joined road-flow rows into sorted road network path segments and road underlay segments', () => {
    const rows: QueryRoadFlowRow[] = [
      {
        id: 'road-a:2:12000',
        edge_id: 'road-a',
        geometry: [[121.5, 25.05], [121.5009, 25.0512], [121.5018, 25.0524]],
        road_class: 'primary',
        source_node_id: 'node-a',
        source_lon: 121.5,
        source_lat: 25.05,
        target_node_id: 'node-b',
        target_lon: 121.5018,
        target_lat: 25.0524,
        mode: 2,
        time_bucket: 12_000,
        flow_count: 9,
      },
      {
        id: 'road-b:8:12060',
        edge_id: 'road-b',
        geometry: [[121.49, 25.04], [121.4907, 25.0408]],
        road_class: 'secondary',
        source_node_id: 'node-c',
        source_lon: 121.49,
        source_lat: 25.04,
        target_node_id: 'node-d',
        target_lon: 121.4907,
        target_lat: 25.0408,
        mode: 8,
        time_bucket: 12_060,
        flow_count: 3,
      },
    ];

    const segments = transformRoadFlowRowsToSegments(rows, [2, 8], [11_900, 12_120]);
    const edges = transformRoadEdgeRowsToSegments([
      {
        edge_id: 'edge-1',
        u: 'node-1',
        v: 'node-2',
        geometry: [[121.5, 25.05], [121.5006, 25.0506]],
        road_class: 'primary',
      },
      {
        edge_id: 'edge-2',
        u: 'node-2',
        v: 'node-3',
        geometry: [[121.5006, 25.0506]],
        road_class: 'secondary',
      },
    ]);

    expect(segments).toHaveLength(2);
    expect(edges).toEqual([
      {
        edgeId: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        path: [[121.5, 25.05], [121.5006, 25.0506]],
        roadClass: 'primary',
      },
    ]);
  });
});
