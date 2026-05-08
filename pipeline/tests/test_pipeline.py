from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from pipeline.exporters import export_city2graph, export_flowmap, export_road_node_flowmap
from pipeline.graph_builder import build_road_graph
from pipeline.io_utils import read_json
from pipeline.routing import assign_od_to_routes


FIXTURES_DIR = Path(__file__).parent / 'fixtures'


class PipelineIntegrationTest(unittest.TestCase):
    def test_pipeline_outputs_are_consistent(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir_name:
            tmp_dir = Path(tmp_dir_name)
            graph_dir = tmp_dir / 'graph'
            route_dir = tmp_dir / 'routes'

            manifest = build_road_graph(FIXTURES_DIR / 'taipei_roads.geojson', graph_dir)
            self.assertGreater(manifest['node_count'], 0)
            self.assertGreater(manifest['edge_count'], 0)

            qa_report = assign_od_to_routes(graph_dir, FIXTURES_DIR / 'taipei_od.json', route_dir)
            self.assertEqual(qa_report['unrouted_od_count'], 0)

            od_routes = read_json(route_dir / 'od_routes.json')
            edge_flows = read_json(route_dir / 'edge_flows.json')
            self.assertEqual(len(od_routes), 2)
            self.assertTrue(all(route['route_edge_ids'] for route in od_routes))
            self.assertTrue(all(route['route_node_ids'] for route in od_routes))

            total_distributed_flow = sum(row['flow_count'] for row in edge_flows)
            self.assertGreater(total_distributed_flow, 0)
            self.assertGreaterEqual(total_distributed_flow, sum(route['flow_count'] for route in od_routes))

            city2graph = export_city2graph(
                graph_dir,
                route_dir / 'edge_flows.json',
                route_dir / 'city2graph_graph.json',
            )
            self.assertEqual(len(city2graph['nodes']), manifest['node_count'])
            self.assertEqual(len(city2graph['edges']), manifest['edge_count'])
            self.assertGreater(len(city2graph['time_slices']), 0)

            transitions = export_flowmap(
                graph_dir,
                route_dir / 'od_routes.json',
                route_dir / 'flowmap_edge_transitions.json',
            )
            self.assertGreater(len(transitions), 0)
            self.assertTrue(all(row['origin_edge_id'] != row['dest_edge_id'] for row in transitions))

            node_flowmap = export_road_node_flowmap(
                graph_dir,
                route_dir / 'od_routes.json',
                route_dir,
            )
            self.assertGreater(len(node_flowmap['locations']), 0)
            self.assertGreater(len(node_flowmap['transitions']), 0)
            self.assertTrue(all(row['origin_node_id'] != row['dest_node_id'] for row in node_flowmap['transitions']))


if __name__ == '__main__':
    unittest.main()
