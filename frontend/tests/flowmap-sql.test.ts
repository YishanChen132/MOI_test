import {buildFlowmapSourceQuery, buildRoadFlowSourceQuery} from '../features/flowmap/flowmapSql';
import {ROAD_NODE_TRANSITION_FLOWMAP_LIMIT} from '../features/flowmap/flowmapCache';
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

describe('flowmap source SQL', () => {
  it('uses trajectory sources for the legacy presets', () => {
    const query = buildFlowmapSourceQuery(buildAppliedScenario('2000'));

    expect(query).toContain('SELECT');
    expect(query).toContain('row_number() OVER () - 1 AS agent_id');
    expect(query).toContain('FROM "moi_trip_2000"');
    expect(query).toContain('list_contains(modes, 2)');
  });

  it('uses road-node-transition sources for the node flowmap preset', () => {
    const query = buildFlowmapSourceQuery({
      ...buildAppliedScenario('taipei_road_node_flowmap'),
      timeRange: [9_060_000, 9_599_000],
    });

    expect(query).toContain('origin_node_id AS origin_id');
    expect(query).toContain('FROM "moi_flowmap_node_transitions_shuangbei_osm"');
    expect(query).toContain('time_bucket >= 9000 AND time_bucket <= 9600');
    expect(query).toContain('mode IN (2, 8)');
    expect(query).toContain('route_count');
    expect(query).toContain(`LIMIT ${ROAD_NODE_TRANSITION_FLOWMAP_LIMIT}`);
    expect(query).not.toContain('SELECT *');
  });

  it('builds a road-flow join query for the path-based road renderer', () => {
    const query = buildRoadFlowSourceQuery({
      ...buildAppliedScenario('taipei_edge_flowmap'),
      timeRange: [9_060_000, 9_599_000],
    });

    expect(query).toContain('FROM "moi_road_flow_9000" AS flow');
    expect(query).toContain('JOIN "moi_road_edges_shuangbei_osm" AS road');
    expect(query).toContain('JOIN "moi_road_nodes_shuangbei_osm" AS source');
    expect(query).toContain('JOIN "moi_road_nodes_shuangbei_osm" AS target');
    expect(query).toContain('flow.time_bucket >= 9000 AND flow.time_bucket <= 9600');
    expect(query).toContain('road.geometry');
    expect(query).toContain('source.node_id AS source_node_id');
    expect(query).toContain("concat(flow.edge_id, ':', flow.mode, ':', flow.time_bucket) AS id");
  });
});
