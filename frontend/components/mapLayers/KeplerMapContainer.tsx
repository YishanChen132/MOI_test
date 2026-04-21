// 這個檔案負責建立一個可注入 customLayers 的本地 kepler 地圖容器。
import {
  BottomWidgetFactory,
  GeocoderPanelFactory,
  MapContainerFactory,
  MapViewStateContextProvider,
  ModalContainerFactory,
  RootContext,
  bottomWidgetSelector,
  geoCoderPanelSelector,
  mapFieldsSelector,
  modalContainerSelector,
} from '@kepler.gl/components';
import {computeDeckLayers} from '@kepler.gl/reducers';
import {getAnimatableVisibleLayers, useDimensions} from '@kepler.gl/utils';
import {
  getKeplerFactory,
  KeplerProvider,
  useKeplerStateActions,
  useStoreWithKepler,
} from '@sqlrooms/kepler';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type MutableRefObject,
} from 'react';
import styled, {useTheme} from 'styled-components';

const MapContainer = getKeplerFactory(MapContainerFactory);
const BottomWidget = getKeplerFactory(BottomWidgetFactory);
const GeoCoderPanel = getKeplerFactory(GeocoderPanelFactory);
const ModalContainer = getKeplerFactory(ModalContainerFactory);

const DEFAULT_DIMENSIONS = {
  width: 0,
  height: 0,
};

const KEPLER_PROPS = {
  mapboxApiUrl: 'https://api.mapbox.com',
  appName: 'kepler.gl',
  sidePanelWidth: 0,
};

const CustomWidgetContainer = styled.div`
  .bottom-widget--inner {
    margin-top: 0;
  }

  .map-popover {
    z-index: 50;
  }

  .kepler-gl .bottom-widget--container .animation-control-container,
  .bottom-widget--container .animation-control-container {
    margin-top: 0 !important;
  }
`;

type InternalKeplerMapProps = {
  mapId: string;
  customLayers?: unknown[];
  onDeckClick?: (info: unknown, event: unknown) => void;
  onDeckLayersResolved?: (layerIds: string[]) => void;
};

function InternalKeplerMap({
  mapId,
  customLayers,
  onDeckClick,
  onDeckLayersResolved,
}: InternalKeplerMapProps) {
  const bottomWidgetRef = useRef<HTMLDivElement | null>(null);
  const [containerRef, size] = useDimensions() as [
    MutableRefObject<HTMLDivElement | null>,
    {width: number; height: number} | null,
  ];
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const theme = useTheme();
  const basicKeplerProps = useStoreWithKepler((state) => state.kepler.basicKeplerProps as any);
  const {keplerActions, keplerState} = useKeplerStateActions({mapId});
  const interactionConfig = (keplerState as any)?.visState?.interactionConfig;

  useEffect(() => {
    setContainerNode(containerRef.current);
  }, [containerRef]);

  useEffect(() => {
    if (size?.width && size?.height) {
      keplerActions.uiStateActions.setExportImageSetting({
        mapW: size.width,
        mapH: size.height,
      });
    }
  }, [keplerActions.uiStateActions, size?.height, size?.width]);

  const mergedKeplerProps = useMemo(
    () => ({
      ...KEPLER_PROPS,
      ...(keplerState as object),
      ...keplerActions,
      id: mapId,
    }),
    [keplerActions, keplerState, mapId],
  );

  const generateDeckGLLayers = useMemo(
    () =>
      function customDeckLayerGenerator(
        state: any,
        options: any,
        layerCallbacks: any,
      ) {
        const baseLayers = computeDeckLayers(state, options, layerCallbacks);
        return customLayers?.length ? [...baseLayers, ...customLayers] : baseLayers;
      },
    [customLayers],
  );

  const deckRenderCallbacks = useMemo(
    () => ({
      onDeckRender: (deckProps: Record<string, unknown>) => {
        const upstreamOnClick =
          typeof deckProps.onClick === 'function'
            ? (deckProps.onClick as (info: unknown, event: unknown) => void)
            : null;
        const layerIds = Array.isArray(deckProps.layers)
          ? deckProps.layers
              .map((layer) =>
                layer && typeof layer === 'object' && 'id' in layer
                  ? String((layer as {id?: unknown}).id ?? '')
                  : '',
              )
              .filter(Boolean)
          : [];
        onDeckLayersResolved?.(layerIds);
        return {
          ...deckProps,
          onClick: (info: unknown, event: unknown) => {
            upstreamOnClick?.(info, event);
            onDeckClick?.(info, event);
          },
        };
      },
    }),
    [onDeckClick, onDeckLayersResolved],
  );

  const geoCoderPanelFields = (keplerState as any)?.visState
    ? geoCoderPanelSelector(mergedKeplerProps as any, size || DEFAULT_DIMENSIONS)
    : null;

  const mapFields = useMemo(
    () =>
      (keplerState as any)?.visState ? mapFieldsSelector(mergedKeplerProps as any) : null,
    [keplerState, mergedKeplerProps],
  ) as any;

  const hasFilters = Boolean((keplerState as any)?.visState?.filters?.length);
  const hasAnimatableLayers = useMemo(() => {
    const layers = (keplerState as any)?.visState?.layers || [];
    return getAnimatableVisibleLayers(layers).length > 0;
  }, [(keplerState as any)?.visState?.layers]);

  const bottomWidgetFields =
    hasFilters || hasAnimatableLayers
      ? bottomWidgetSelector(mergedKeplerProps as any, theme)
      : null;

  const modalContainerFields = (keplerState as any)?.visState
    ? modalContainerSelector(mergedKeplerProps as any, containerNode)
    : null;

  const mapboxApiAccessToken =
    mapFields?.mapStyle?.mapboxApiAccessToken || basicKeplerProps?.mapboxApiAccessToken;

  return (
    <RootContext.Provider value={containerRef as any}>
      <CustomWidgetContainer
        ref={containerRef as any}
        className="kepler-gl relative flex h-full w-full flex-col justify-between"
      >
        {mapFields?.mapState ? (
          <MapViewStateContextProvider mapState={mapFields.mapState}>
            <MapContainer
              primary
              containerId={0}
              index={0}
              deckRenderCallbacks={deckRenderCallbacks}
              generateDeckGLLayers={generateDeckGLLayers}
              {...mapFields}
              mapboxApiAccessToken={mapboxApiAccessToken || ''}
            />
          </MapViewStateContextProvider>
        ) : null}

        {geoCoderPanelFields && interactionConfig?.geocoder?.enabled ? (
          <GeoCoderPanel
            {...geoCoderPanelFields}
            index={0}
            unsyncedViewports={false}
            mapboxApiAccessToken={mapboxApiAccessToken || ''}
          />
        ) : null}

        {size && bottomWidgetFields ? (
          <BottomWidget
            rootRef={bottomWidgetRef}
            {...bottomWidgetFields}
            theme={theme}
            containerW={size.width}
          />
        ) : null}

        {size && size.width && size.height && modalContainerFields ? (
          <ModalContainer
            {...modalContainerFields}
            containerW={size.width}
            containerH={size.height}
          />
        ) : null}
      </CustomWidgetContainer>
    </RootContext.Provider>
  );
}

type KeplerMapContainerProps = {
  mapId: string;
  customLayers?: unknown[];
  onDeckClick?: (info: unknown, event: unknown) => void;
  onDeckLayersResolved?: (layerIds: string[]) => void;
};

export function KeplerMapContainer({
  mapId,
  customLayers,
  onDeckClick,
  onDeckLayersResolved,
}: KeplerMapContainerProps) {
  return (
    <KeplerProvider mapId={mapId}>
      <InternalKeplerMap
        mapId={mapId}
        customLayers={customLayers}
        onDeckClick={onDeckClick}
        onDeckLayersResolved={onDeckLayersResolved}
      />
    </KeplerProvider>
  );
}
