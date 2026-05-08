from __future__ import annotations

import math
from collections import defaultdict
from pathlib import Path

from .io_utils import read_json, try_write_parquet, write_json
from .models import RoadEdge, RoadNode, as_record

DEFAULT_SPEED_KPH_BY_HIGHWAY = {
    'motorway': 70.0,
    'trunk': 60.0,
    'primary': 50.0,
    'secondary': 40.0,
    'tertiary': 35.0,
    'residential': 25.0,
    'service': 15.0,
}


def haversine_meters(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    radius = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def polyline_length_meters(geometry: list[list[float]]) -> float:
    return sum(
        haversine_meters(left[0], left[1], right[0], right[1])
        for left, right in zip(geometry, geometry[1:])
    )


def normalize_maxspeed(raw_value: object, highway: str) -> float:
    if isinstance(raw_value, (int, float)):
        return float(raw_value)
    if isinstance(raw_value, str):
        digits = ''.join(ch for ch in raw_value if ch.isdigit() or ch == '.')
        if digits:
            return float(digits)
    return DEFAULT_SPEED_KPH_BY_HIGHWAY.get(highway, 30.0)


def build_road_graph(osm_input: Path, output_dir: Path, parquet: bool = False) -> dict[str, object]:
    data = read_json(osm_input)
    features = data.get('features', []) if isinstance(data, dict) else []
    nodes_by_coord: dict[tuple[float, float], str] = {}
    nodes: list[RoadNode] = []
    edges: list[RoadEdge] = []
    adjacency: dict[str, list[dict[str, object]]] = defaultdict(list)

    def node_id_for(lon: float, lat: float) -> str:
        key = (round(lon, 7), round(lat, 7))
        node_id = nodes_by_coord.get(key)
        if node_id is None:
            node_id = f'node-{len(nodes_by_coord) + 1:05d}'
            nodes_by_coord[key] = node_id
            nodes.append(RoadNode(node_id=node_id, lon=key[0], lat=key[1]))
        return node_id

    for feature_index, feature in enumerate(features):
        geometry = feature.get('geometry', {})
        properties = feature.get('properties', {})
        if geometry.get('type') != 'LineString':
            continue
        coordinates = geometry.get('coordinates', [])
        if len(coordinates) < 2:
            continue

        highway = str(properties.get('highway', 'residential'))
        oneway = bool(properties.get('oneway', False))
        mode_mask = int(properties.get('mode_mask', 31))
        speed_kph = normalize_maxspeed(properties.get('maxspeed'), highway)
        forward_geometry = [[float(lon), float(lat)] for lon, lat in coordinates]
        reverse_geometry = list(reversed(forward_geometry))

        for direction_index, directed_geometry in enumerate(
            [forward_geometry] if oneway else [forward_geometry, reverse_geometry]
        ):
            edge_id = f'edge-{feature_index + 1:05d}-{direction_index}'
            u = node_id_for(*directed_geometry[0])
            v = node_id_for(*directed_geometry[-1])
            length_m = polyline_length_meters(directed_geometry)
            speed_mps = max(speed_kph * 1000 / 3600, 0.1)
            travel_time_s = length_m / speed_mps
            edge = RoadEdge(
                edge_id=edge_id,
                u=u,
                v=v,
                geometry=directed_geometry,
                length_m=round(length_m, 3),
                travel_time_s=round(travel_time_s, 3),
                road_class=highway,
                mode_mask=mode_mask,
                oneway=oneway,
                speed_kph=speed_kph,
            )
            edges.append(edge)
            adjacency[u].append({'edge_id': edge_id, 'to_node': v, 'travel_time_s': edge.travel_time_s})

    node_rows = [as_record(node) for node in nodes]
    edge_rows = [
        {
            **as_record(edge),
            'geometry_wkt': 'LINESTRING (' + ', '.join(f'{lon} {lat}' for lon, lat in edge.geometry) + ')',
        }
        for edge in edges
    ]
    manifest = {
        'graph_name': 'taipei_osm_local_road_graph',
        'node_count': len(node_rows),
        'edge_count': len(edge_rows),
        'files': {
            'road_nodes': 'road_nodes.json',
            'road_edges': 'road_edges.json',
        },
    }

    write_json(output_dir / 'road_nodes.json', node_rows)
    write_json(output_dir / 'road_edges.json', edge_rows)
    write_json(output_dir / 'graph_manifest.json', manifest)
    if parquet:
        try_write_parquet(output_dir / 'road_nodes.parquet', node_rows)
        try_write_parquet(output_dir / 'road_edges.parquet', edge_rows)
    return manifest
