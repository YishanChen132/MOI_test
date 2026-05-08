# MOI Taipei OSM Pipeline

這個 workspace 提供四個 CLI：

- `build-road-graph`
- `assign-od-to-routes`
- `export-city2graph`
- `export-flowmap`
- `export-road-node-flowmap`

目前實作採用標準函式庫即可執行的版本，輸入是 OSM 匯出的道路 `GeoJSON` 與 OD `JSON`。若環境安裝 `pyarrow`，加上 `--parquet` 後會同步輸出 parquet。

前端目前已經收斂成 graph-only flowmap：

- trajectory flowmap 仍可讀取 `locations + flows`
- road-node-transition flowmap 讀取 `flowmap_node_locations + flowmap_node_transitions`
- road graph underlay 另外讀取 `road_nodes + road_edges`

因此 pipeline 輸出的 v1 目標檔案應對齊下列命名：

- `taipei_osm_road_nodes.json` / `.parquet`
- `taipei_osm_road_edges.json` / `.parquet`
- `taipei_osm_edge_flows_100.json` / `.parquet`
- `taipei_osm_edge_flows_2000.json` / `.parquet`
- `taipei_osm_edge_flows_5000.json` / `.parquet`
- `taipei_osm_edge_flows_9000.json` / `.parquet`
- `flowmap_node_locations.json` / `.parquet`
- `flowmap_node_transitions.json` / `.parquet`

## Input expectations

`build-road-graph --osm-input`
- `FeatureCollection`
- `LineString` features
- `properties.highway`
- `properties.oneway`
- `properties.maxspeed`

`assign-od-to-routes --od-input`
- JSON array
- `od_id`
- `origin_lon`, `origin_lat`
- `dest_lon`, `dest_lat`
- `mode`
- `time_bucket`
- `flow_count`

## Example

```bash
npm run pipeline:build-road-graph -- --osm-input pipeline/tests/fixtures/taipei_roads.geojson --output-dir /tmp/moi-graph
npm run pipeline:assign-od-to-routes -- --graph-dir /tmp/moi-graph --od-input pipeline/tests/fixtures/taipei_od.json --output-dir /tmp/moi-routes
npm run pipeline:export-city2graph -- --graph-dir /tmp/moi-graph --edge-flows /tmp/moi-routes/edge_flows.json --output /tmp/moi-routes/city2graph_graph.json
npm run pipeline:export-flowmap -- --graph-dir /tmp/moi-graph --od-routes /tmp/moi-routes/od_routes.json --output /tmp/moi-routes/flowmap_edge_transitions.json
npm run pipeline:export-road-node-flowmap -- --graph-dir /tmp/moi-graph --od-routes /tmp/moi-routes/od_routes.json --output-dir /tmp/moi-routes
```
