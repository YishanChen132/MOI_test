from __future__ import annotations

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class RoadNode:
    node_id: str
    lon: float
    lat: float


@dataclass(frozen=True)
class RoadEdge:
    edge_id: str
    u: str
    v: str
    geometry: list[list[float]]
    length_m: float
    travel_time_s: float
    road_class: str
    mode_mask: int
    oneway: bool
    speed_kph: float

    @property
    def centroid_lon(self) -> float:
        return sum(point[0] for point in self.geometry) / len(self.geometry)

    @property
    def centroid_lat(self) -> float:
        return sum(point[1] for point in self.geometry) / len(self.geometry)


@dataclass(frozen=True)
class OdFlow:
    od_id: str
    origin_lon: float
    origin_lat: float
    dest_lon: float
    dest_lat: float
    mode: int
    time_bucket: int
    flow_count: float


@dataclass(frozen=True)
class RoutedOd:
    od_id: str
    snapped_origin_node: str
    snapped_dest_node: str
    mode: int
    time_bucket: int
    flow_count: float
    route_node_ids: list[str]
    route_edge_ids: list[str]
    path_length_m: float
    travel_time_s: float


@dataclass(frozen=True)
class EdgeFlow:
    edge_id: str
    time_bucket: int
    mode: int
    flow_count: float
    od_count: int
    avg_path_length_m: float
    in_flow: float
    out_flow: float


def as_record(value: object) -> dict[str, object]:
    return asdict(value)
