// 這個檔案負責定義 flowmap.gl 與 road-graph renderer 會共用的型別。

export type FlowmapSelection = {
  selectedFlowId: string | null;
};

export type FlowmapLocation = {
  id: string;
  lon: number;
  lat: number;
  passCount?: number;
  inFlow?: number;
  outFlow?: number;
};

export type FlowmapFlow = {
  id: string;
  origin: string;
  dest: string;
  count: number;
  mode: number;
  modeLabel: string;
  timestamp: number;
  timestampMs: number;
  timeBucket: number;
  routeCount?: number;
};

export type FlowmapLayerData = {
  locations: FlowmapLocation[];
  flows: FlowmapFlow[];
};

export type FlowmapRoadSegment = {
  id: string;
  edgeId: string;
  path: [number, number][];
  count: number;
  mode: number;
  modeLabel: string;
  timeBucket: number;
  roadClass: string;
  sourceNodeId: string;
  sourceLon: number;
  sourceLat: number;
  targetNodeId: string;
  targetLon: number;
  targetLat: number;
};

export type FlowmapRoadEdge = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  path: [number, number][];
  roadClass: string;
};

export type FlowmapTooltipState = {
  x: number;
  y: number;
  title: string;
  count: number;
  subtitle?: string;
};
