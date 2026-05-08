from __future__ import annotations

import argparse
from pathlib import Path

from .exporters import export_city2graph, export_flowmap, export_road_node_flowmap
from .graph_builder import build_road_graph
from .routing import assign_od_to_routes


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='MOI Taipei OSM -> road-flow -> City2Graph pipeline')
    subparsers = parser.add_subparsers(dest='command', required=True)

    graph_parser = subparsers.add_parser('build-road-graph')
    graph_parser.add_argument('--osm-input', type=Path, required=True)
    graph_parser.add_argument('--output-dir', type=Path, required=True)
    graph_parser.add_argument('--parquet', action='store_true')

    routing_parser = subparsers.add_parser('assign-od-to-routes')
    routing_parser.add_argument('--graph-dir', type=Path, required=True)
    routing_parser.add_argument('--od-input', type=Path, required=True)
    routing_parser.add_argument('--output-dir', type=Path, required=True)
    routing_parser.add_argument('--parquet', action='store_true')

    city2graph_parser = subparsers.add_parser('export-city2graph')
    city2graph_parser.add_argument('--graph-dir', type=Path, required=True)
    city2graph_parser.add_argument('--edge-flows', type=Path, required=True)
    city2graph_parser.add_argument('--output', type=Path, required=True)
    city2graph_parser.add_argument('--parquet', action='store_true')

    flowmap_parser = subparsers.add_parser('export-flowmap')
    flowmap_parser.add_argument('--graph-dir', type=Path, required=True)
    flowmap_parser.add_argument('--od-routes', type=Path, required=True)
    flowmap_parser.add_argument('--output', type=Path, required=True)
    flowmap_parser.add_argument('--parquet', action='store_true')

    node_flowmap_parser = subparsers.add_parser('export-road-node-flowmap')
    node_flowmap_parser.add_argument('--graph-dir', type=Path, required=True)
    node_flowmap_parser.add_argument('--od-routes', type=Path, required=True)
    node_flowmap_parser.add_argument('--output-dir', type=Path, required=True)
    node_flowmap_parser.add_argument('--parquet', action='store_true')

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == 'build-road-graph':
        build_road_graph(args.osm_input, args.output_dir, parquet=args.parquet)
        return 0
    if args.command == 'assign-od-to-routes':
        assign_od_to_routes(args.graph_dir, args.od_input, args.output_dir, parquet=args.parquet)
        return 0
    if args.command == 'export-city2graph':
        export_city2graph(args.graph_dir, args.edge_flows, args.output, parquet=args.parquet)
        return 0
    if args.command == 'export-flowmap':
        export_flowmap(args.graph_dir, args.od_routes, args.output, parquet=args.parquet)
        return 0
    if args.command == 'export-road-node-flowmap':
        export_road_node_flowmap(args.graph_dir, args.od_routes, args.output_dir, parquet=args.parquet)
        return 0
    return 1
