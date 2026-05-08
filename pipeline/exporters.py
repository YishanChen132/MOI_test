from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from .io_utils import read_json, try_write_parquet, write_json


def export_city2graph(graph_dir: Path, edge_flows_path: Path, output_path: Path, parquet: bool = False) -> dict[str, object]:
    nodes = read_json(graph_dir / 'road_nodes.json')
    edges = read_json(graph_dir / 'road_edges.json')
    edge_flows = read_json(edge_flows_path)
    time_buckets = sorted({row['time_bucket'] for row in edge_flows})
    next_bucket_by_bucket = {
        bucket: time_buckets[index + 1] if index + 1 < len(time_buckets) else bucket
        for index, bucket in enumerate(time_buckets)
    }
    flow_lookup = {
        (row['edge_id'], row['time_bucket'], row['mode']): row['flow_count']
        for row in edge_flows
    }
    graph_payload = {
        'nodes': nodes,
        'edges': [
            {
                'edge_id': edge['edge_id'],
                'u': edge['u'],
                'v': edge['v'],
                'static_features': {
                    'length_m': edge['length_m'],
                    'travel_time_s': edge['travel_time_s'],
                    'road_class': edge['road_class'],
                    'speed_kph': edge['speed_kph'],
                    'mode_mask': edge['mode_mask'],
                },
            }
            for edge in edges
        ],
        'time_slices': [
            {
                'time_bucket': bucket,
                'edge_features': [
                    {
                        'edge_id': row['edge_id'],
                        'mode': row['mode'],
                        'flow_count': row['flow_count'],
                        'od_count': row['od_count'],
                        'avg_path_length_m': row['avg_path_length_m'],
                        'label_next_bucket_flow_count': flow_lookup.get(
                            (row['edge_id'], next_bucket_by_bucket[bucket], row['mode']),
                            row['flow_count'],
                        ),
                    }
                    for row in edge_flows
                    if row['time_bucket'] == bucket
                ],
            }
            for bucket in time_buckets
        ],
    }
    write_json(output_path, graph_payload)
    if parquet:
        flattened = []
        for slice_row in graph_payload['time_slices']:
            for feature in slice_row['edge_features']:
                flattened.append({'time_bucket': slice_row['time_bucket'], **feature})
        try_write_parquet(output_path.with_suffix('.parquet'), flattened)
    return graph_payload


def export_flowmap(graph_dir: Path, od_routes_path: Path, output_path: Path, parquet: bool = False) -> list[dict[str, object]]:
    edges = {
        row['edge_id']: row
        for row in read_json(graph_dir / 'road_edges.json')
    }
    od_routes = read_json(od_routes_path)
    transitions: dict[tuple[str, str, int, int], dict[str, object]] = defaultdict(
        lambda: {'count': 0.0}
    )

    for route in od_routes:
        route_edge_ids = route.get('route_edge_ids', [])
        if len(route_edge_ids) < 2:
            continue
        for origin_edge_id, dest_edge_id in zip(route_edge_ids, route_edge_ids[1:]):
            origin_edge = edges[origin_edge_id]
            dest_edge = edges[dest_edge_id]
            key = (origin_edge_id, dest_edge_id, route['mode'], route['time_bucket'])
            transition = transitions[key]
            transition.update(
                {
                    'origin_edge_id': origin_edge_id,
                    'origin_lon': round(sum(point[0] for point in origin_edge['geometry']) / len(origin_edge['geometry']), 6),
                    'origin_lat': round(sum(point[1] for point in origin_edge['geometry']) / len(origin_edge['geometry']), 6),
                    'dest_edge_id': dest_edge_id,
                    'dest_lon': round(sum(point[0] for point in dest_edge['geometry']) / len(dest_edge['geometry']), 6),
                    'dest_lat': round(sum(point[1] for point in dest_edge['geometry']) / len(dest_edge['geometry']), 6),
                    'mode': route['mode'],
                    'time_bucket': route['time_bucket'],
                }
            )
            transition['count'] += route['flow_count']

    transition_rows = [
        {
            **value,
            'count': round(float(value['count']), 3),
        }
        for _, value in sorted(transitions.items())
    ]
    write_json(output_path, transition_rows)
    if parquet:
        try_write_parquet(output_path.with_suffix('.parquet'), transition_rows)
    return transition_rows


def export_road_node_flowmap(
    graph_dir: Path,
    od_routes_path: Path,
    output_dir: Path,
    parquet: bool = False,
) -> dict[str, list[dict[str, object]]]:
    nodes = {
        row['node_id']: row
        for row in read_json(graph_dir / 'road_nodes.json')
    }
    od_routes = read_json(od_routes_path)
    node_stats: dict[str, dict[str, object]] = defaultdict(
        lambda: {'pass_count': 0.0, 'in_flow': 0.0, 'out_flow': 0.0}
    )
    transitions: dict[tuple[str, str, int, int], dict[str, object]] = defaultdict(
        lambda: {'count': 0.0, 'route_count': 0}
    )

    for route in od_routes:
        route_node_ids = route.get('route_node_ids', [])
        if len(route_node_ids) < 2:
            continue

        for node_id in route_node_ids:
            if node_id not in nodes:
                continue
            node_row = nodes[node_id]
            stat = node_stats[node_id]
            stat.update(
                {
                    'node_id': node_id,
                    'lon': round(float(node_row['lon']), 6),
                    'lat': round(float(node_row['lat']), 6),
                }
            )
            stat['pass_count'] += route['flow_count']

        for origin_node_id, dest_node_id in zip(route_node_ids, route_node_ids[1:]):
            if origin_node_id not in nodes or dest_node_id not in nodes:
                continue

            origin_node = nodes[origin_node_id]
            dest_node = nodes[dest_node_id]
            key = (origin_node_id, dest_node_id, route['mode'], route['time_bucket'])
            transition = transitions[key]
            transition.update(
                {
                    'origin_node_id': origin_node_id,
                    'origin_lon': round(float(origin_node['lon']), 6),
                    'origin_lat': round(float(origin_node['lat']), 6),
                    'dest_node_id': dest_node_id,
                    'dest_lon': round(float(dest_node['lon']), 6),
                    'dest_lat': round(float(dest_node['lat']), 6),
                    'mode': route['mode'],
                    'time_bucket': route['time_bucket'],
                }
            )
            transition['count'] += route['flow_count']
            transition['route_count'] += 1

            node_stats[origin_node_id]['out_flow'] += route['flow_count']
            node_stats[dest_node_id]['in_flow'] += route['flow_count']

    location_rows = [
        {
            **value,
            'pass_count': round(float(value['pass_count']), 3),
            'in_flow': round(float(value['in_flow']), 3),
            'out_flow': round(float(value['out_flow']), 3),
        }
        for _, value in sorted(node_stats.items())
    ]
    transition_rows = [
        {
            **value,
            'count': round(float(value['count']), 3),
            'route_count': int(value['route_count']),
        }
        for _, value in sorted(transitions.items())
    ]

    location_path = output_dir / 'flowmap_node_locations.json'
    transition_path = output_dir / 'flowmap_node_transitions.json'
    write_json(location_path, location_rows)
    write_json(transition_path, transition_rows)
    if parquet:
        try_write_parquet(location_path.with_suffix('.parquet'), location_rows)
        try_write_parquet(transition_path.with_suffix('.parquet'), transition_rows)
    return {
        'locations': location_rows,
        'transitions': transition_rows,
    }
