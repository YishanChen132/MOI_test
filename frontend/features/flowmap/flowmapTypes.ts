// 這個檔案負責定義 flowmap 資料流各階段共用的 location / flow / UI 選取型別。
export type FlowmapLocation = {
  id: string;
  lon: number;
  lat: number;
  label?: string;
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
};

export type FlowmapLayerData = {
  locations: FlowmapLocation[];
  flows: FlowmapFlow[];
};

export type FlowmapSelection = {
  selectedFlowId: string | null;
};
