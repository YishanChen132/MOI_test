// 這個檔案負責組合 Control menu 的狀態摘要、模式控制、圖層控制與錯誤提示。
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@sqlrooms/ui';
import {Gauge} from 'lucide-react';
import {summarizeLayers} from '../../lib/controller';
import {useRoomStore} from '../../app/store';
import {DatasetRowsStat} from './DatasetRowsStat';
import {LayerControls} from './LayerControls';
import {ModeControls} from './ModeControls';
import {countEnabledLayers} from './controlMenuUtils';

export function ControlMenu() {
  const draft = useRoomStore((state) => state.moi.draft);
  const runStatus = useRoomStore((state) => state.moi.runStatus);
  const latestError = useRoomStore((state) => state.moi.benchmarks[0]?.errorMessage ?? null);
  const layerOpacity = useRoomStore((state) => state.moi.layerOpacity);
  const flowmapEnabled = useRoomStore((state) => state.moi.flowmapEnabled);
  const flowmapOpacity = useRoomStore((state) => state.moi.flowmapOpacity);
  const setLayerEnabled = useRoomStore((state) => state.moi.setLayerEnabled);
  const setLayerOpacity = useRoomStore((state) => state.moi.setLayerOpacity);
  const setFlowmapEnabled = useRoomStore((state) => state.moi.setFlowmapEnabled);
  const setFlowmapOpacity = useRoomStore((state) => state.moi.setFlowmapOpacity);
  const setModeEnabled = useRoomStore((state) => state.moi.setModeEnabled);
  const roomInitialized = useRoomStore((state) => state.room.initialized);
  const dataSourceStates = useRoomStore((state) => state.room.dataSourceStates);
  const enabledLayerCount = countEnabledLayers(draft.layers, flowmapEnabled);
  const layerSummary = flowmapEnabled
    ? `${summarizeLayers(draft.layers)} + Flowmap`
    : summarizeLayers(draft.layers);

  return (
    <div className="moi-control-shell flex h-full flex-col gap-4">
      <Card className="moi-control-card border-border/70 bg-card/85 shadow-lg backdrop-blur-md">
        <CardHeader className="space-y-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="moi-control-title flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Control menu
            </CardTitle>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="moi-mini-stat">
              <span>Status</span>
              <strong>{runStatus.toUpperCase()}</strong>
            </div>
            <div className="moi-mini-stat">
              <span>Layers</span>
              <strong title={layerSummary}>{enabledLayerCount} active</strong>
            </div>
            <DatasetRowsStat
              datasetId={draft.datasetId}
              roomInitialized={roomInitialized}
              dataSourceStates={dataSourceStates}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ModeControls
            selectedModes={draft.modes}
            setModeEnabled={setModeEnabled}
          />
          <LayerControls
            layers={draft.layers}
            layerOpacity={layerOpacity}
            flowmapEnabled={flowmapEnabled}
            flowmapOpacity={flowmapOpacity}
            layerSummary={layerSummary}
            enabledLayerCount={enabledLayerCount}
            setLayerEnabled={setLayerEnabled}
            setLayerOpacity={setLayerOpacity}
            setFlowmapEnabled={setFlowmapEnabled}
            setFlowmapOpacity={setFlowmapOpacity}
          />
          {latestError ? (
            <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {latestError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
