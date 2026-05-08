from __future__ import annotations

import heapq
import math
from collections import defaultdict
from pathlib import Path

from .graph_builder import haversine_meters
from .io_utils import read_json, try_write_parquet, write_json
from .models import EdgeFlow, OdFlow, RoutedOd, as_record


def load_graph(graph_dir: Path) -> tuple[dict[str, dict[str, object]], dict[str, dict[str, object]], dict[str, list[dict[str, object]]]]:
    nodes = {
        row['node_id']: row
        for row in read_json(graph_dir / 'road_nodes.json')
    }
    edges = {
        row['edge_id']: row
        for row in read_json(graph_dir / 'road_edges.json')
    }
    adjacency: dict[str, list[dict[str, object]]] = defaultdict(list)
    for edge in edges.values():
        adjacency[edge['u']].append(edge)
    return nodes, edges, adjacency


def nearest_node_id(nodes: dict[str, dict[str, object]], lon: float, lat: float) -> str:
    return min(
        nodes,
        key=lambda node_id: haversine_meters(lon, lat, float(nodes[node_id]['lon']), float(nodes[node_id]['lat'])),
    )


def shortest_path(
    adjacency: dict[str, list[dict[str, object]]],
    start_node: str,
    end_node: str,
) -> tuple[list[str], list[str]]:
    queue: list[tuple[float, str]] = [(0.0, start_node)]
    distance_by_node = {start_node: 0.0}
    previous_by_node: dict[str, tuple[str, str]] = {}

    while queue:
        current_distance, current_node = heapq.heappop(queue)
        if current_node == end_node:
            break
        if current_distance > distance_by_node.get(current_node, math.inf):
            continue
        for edge in adjacency.get(current_node, []):
            next_node = edge['v']
            next_distance = current_distance + float(edge['travel_time_s'])
            if next_distance >= distance_by_node.get(next_node, math.inf):
                continue
            distance_by_node[next_node] = next_distance
            previous_by_node[next_node] = (current_node, edge['edge_id'])
            heapq.heappush(queue, (next_distance, next_node))

    if end_node not in distance_by_node:
        return [], []

    route_edge_ids: list[str] = []
    route_node_ids: list[str] = [end_node]
    cursor = end_node
    while cursor != start_node:
        previous_node, edge_id = previous_by_node[cursor]
        route_edge_ids.append(edge_id)
        route_node_ids.append(previous_node)
        cursor = previous_node
    route_edge_ids.reverse()
    route_node_ids.reverse()
    return route_node_ids, route_edge_ids


def assign_od_to_routes(
    graph_dir: Path,
    od_input: Path,
    output_dir: Path,
    parquet: bool = False,
) -> dict[str, object]:
    nodes, edges, adjacency = load_graph(graph_dir)
    raw_rows = read_json(od_input)
    od_rows = [OdFlow(**row) for row in raw_rows]
    routed_rows: list[RoutedOd] = []
    qa_rows: list[dict[str, object]] = []
    edge_flow_stats: dict[tuple[str, int, int], dict[str, float]] = defaultdict(
        lambda: {'flow_count': 0.0, 'od_count': 0, 'path_length_sum': 0.0}
    )

    for od_row in od_rows:
        origin_node = nearest_node_id(nodes, od_row.origin_lon, od_row.origin_lat)
        dest_node = nearest_node_id(nodes, od_row.dest_lon, od_row.dest_lat)
        route_node_ids, route_edge_ids = shortest_path(adjacency, origin_node, dest_node)
        if not route_edge_ids:
            qa_rows.append({'od_id': od_row.od_id, 'status': 'route_not_found'})
            continue

        path_length_m = sum(float(edges[edge_id]['length_m']) for edge_id in route_edge_ids)
        travel_time_s = sum(float(edges[edge_id]['travel_time_s']) for edge_id in route_edge_ids)
        routed_rows.append(
            RoutedOd(
                od_id=od_row.od_id,
                snapped_origin_node=origin_node,
                snapped_dest_node=dest_node,
                mode=od_row.mode,
                time_bucket=od_row.time_bucket,
                flow_count=od_row.flow_count,
                route_node_ids=route_node_ids,
                route_edge_ids=route_edge_ids,
                path_length_m=round(path_length_m, 3),
                travel_time_s=round(travel_time_s, 3),
            )
        )

        for edge_id in route_edge_ids:
            stat = edge_flow_stats[(edge_id, od_row.time_bucket, od_row.mode)]
            stat['flow_count'] += od_row.flow_count
            stat['od_count'] += 1
            stat['path_length_sum'] += path_length_m

    edge_flow_rows = [
        EdgeFlow(
            edge_id=edge_id,
            time_bucket=time_bucket,
            mode=mode,
            flow_count=round(stats['flow_count'], 3),
            od_count=int(stats['od_count']),
            avg_path_length_m=round(stats['path_length_sum'] / stats['od_count'], 3),
            in_flow=round(stats['flow_count'], 3),
            out_flow=round(stats['flow_count'], 3),
        )
        for (edge_id, time_bucket, mode), stats in sorted(edge_flow_stats.items())
    ]

    routed_records = [as_record(row) for row in routed_rows]
    edge_flow_records = [as_record(row) for row in edge_flow_rows]
    qa_report = {
        'input_od_count': len(od_rows),
        'routed_od_count': len(routed_rows),
        'unrouted_od_count': len(qa_rows),
        'issues': qa_rows,
    }
    write_json(output_dir / 'od_routes.json', routed_records)
    write_json(output_dir / 'edge_flows.json', edge_flow_records)
    write_json(output_dir / 'qa_report.json', qa_report)
    if parquet:
        try_write_parquet(output_dir / 'od_routes.parquet', routed_records)
        try_write_parquet(output_dir / 'edge_flows.parquet', edge_flow_records)
    return qa_report
