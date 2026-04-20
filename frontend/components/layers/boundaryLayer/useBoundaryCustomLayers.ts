import {useMemo} from 'react';
import {GeoJsonLayer} from '@deck.gl/layers';
import {useRoomStore} from '../../../app/store';

const baseUrl = (import.meta.env.VITE_DATA_BASE_URL || 'http://localhost:7780/data').replace(/\/$/, '');
const BOUNDARY_URL = `${baseUrl}/boundary_town_select.geojson`;
const BOUNDARY_LINE_COLOR: [number, number, number, number] = [133, 23, 68, 255];

export function useBoundaryCustomLayers() {
  const visible = useRoomStore((state) => state.moi.applied.layers.boundary);
  const opacity = useRoomStore((state) => state.moi.layerOpacity.boundary);

  return useMemo(() => {
    if (!visible) {
      return {layers: [] as unknown[]};
    }

    return {
      layers: [
        new GeoJsonLayer({
          id: 'boundary',
          data: BOUNDARY_URL,
          visible: true,
          opacity,
          stroked: true,
          filled: false,
          pickable: false,
          getFillColor: [0, 0, 0, 0],
          getLineColor: BOUNDARY_LINE_COLOR,
          getLineWidth: 0.8,
          lineWidthUnits: 'pixels',
        }),
      ],
    };
  }, [opacity, visible]);
}
