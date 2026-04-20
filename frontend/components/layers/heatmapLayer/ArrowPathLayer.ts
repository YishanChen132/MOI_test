// 這個檔案把 trip 的 Arrow binary path 直接轉成 deck.gl PathLayer，讓 heatmap 能像原專案一樣在 layer 內做時間與模式過濾。
import {
  CompositeLayer,
  type Layer,
} from '@deck.gl/core';
import {DataFilterExtension} from '@deck.gl/extensions';
import {PathLayer, type PathLayerProps} from '@deck.gl/layers';
import * as arrow from 'apache-arrow';

export type ArrowPathLayerProps = Omit<
  PathLayerProps<arrow.Table>,
  'data' | 'getPath' | 'getFilterValue' | 'getFilterCategory'
> &
  {
    data: arrow.Table;
    getPathColumn?: string;
    getTimestampColumn?: string;
    getModeColumn?: string;
    getRouteIdColumn?: string;
    _validate?: boolean;
    coordinateQuantizationDigits?: number | null;
    colorAttributesByBatch?: Array<ArrayLike<number> | null>;
    widthAttributesByBatch?: Array<ArrayLike<number> | null>;
    timeRange: [number, number];
    filterCategories: number[];
    selectedRouteId?: string | number | null;
  };

const {
  data: _data,
  getPath: _getPath,
  getWidth: _getWidth,
  ...upstreamDefaultProps
} = PathLayer.defaultProps as Record<string, unknown>;

export class ArrowPathLayer extends CompositeLayer<ArrowPathLayerProps> {
  static defaultProps = {
    ...upstreamDefaultProps,
    _validate: true,
    _pathType: 'open',
    getPathColumn: 'paths',
    getTimestampColumn: 'timestamps',
    getModeColumn: 'modes',
    getRouteIdColumn: 'agent_id',
    coordinateQuantizationDigits: null,
    timeRange: [0, 0],
    filterCategories: [],
    selectedRouteId: null,
  };
  static layerName = 'ArrowPathLayer';

  renderLayers(): Layer<any> | Layer<any>[] | null {
    const {data: table} = this.props as ArrowPathLayerProps;
    if (!table || !table.batches || table.batches.length === 0) {
      return null;
    }

    return this.renderBinaryPathLayers(table);
  }

  private renderBinaryPathLayers(table: arrow.Table): Layer<any>[] | null {
    const {
      id,
      getPathColumn = 'paths',
      getTimestampColumn = 'timestamps',
      getModeColumn = 'modes',
      coordinateQuantizationDigits = null,
      colorAttributesByBatch,
      widthAttributesByBatch,
      timeRange,
      filterCategories,
      ...pathProps
    } = this.props as ArrowPathLayerProps;

    const layers: Layer<any>[] = [];

    for (let batchIndex = 0; batchIndex < table.batches.length; batchIndex++) {
      const batch = table.batches[batchIndex];
      const pathVector = batch.getChild(getPathColumn);
      const timestampVector = batch.getChild(getTimestampColumn);
      const modeVector = batch.getChild(getModeColumn);

      if (!pathVector || !pathVector.data?.[0]?.children?.[0]?.values) {
        continue;
      }

      const srcOffsets = pathVector.data[0].valueOffsets;
      const srcCoords = pathVector.data[0].children[0].values as Float32Array;
      const pathCount = pathVector.length;

      if (!srcOffsets || pathCount === 0) {
        continue;
      }

      const baseOffset = Number(srcOffsets[0]);
      const endOffset = Number(srcOffsets[pathCount]);
      const cleanStartIndices = new Uint32Array(pathCount + 1);
      for (let offsetIndex = 0; offsetIndex <= pathCount; offsetIndex++) {
        cleanStartIndices[offsetIndex] = (Number(srcOffsets[offsetIndex]) - baseOffset) / 2;
      }

      const rawPathView = srcCoords.subarray(baseOffset, endOffset);
      const pathView =
        coordinateQuantizationDigits === null
          ? rawPathView
          : quantizePathView(rawPathView, coordinateQuantizationDigits);
      const attrBase = baseOffset / 2;
      const attrEnd = endOffset / 2;

      const attributes: Record<string, {value: ArrayLike<number>; size: number}> = {
        getPath: {value: pathView, size: 2},
      };

      const colorAttributes = colorAttributesByBatch?.[batchIndex];
      if (colorAttributes) {
        attributes.getColor = {
          value: colorAttributes,
          size: 4,
        };
      }

      const widthAttributes = widthAttributesByBatch?.[batchIndex];
      if (widthAttributes) {
        attributes.getWidth = {
          value: widthAttributes,
          size: 1,
        };
      }

      if (timestampVector?.data?.[0]?.children?.[0]?.values) {
        const timestampValues = timestampVector.data[0].children[0].values as Float32Array;
        attributes.getFilterValue = {
          value: timestampValues.subarray(attrBase, attrEnd),
          size: 1,
        };
      }

      if (modeVector?.data?.[0]?.children?.[0]?.values) {
        const modeValues = modeVector.data[0].children[0].values as Uint8Array;
        attributes.getFilterCategory = {
          value: modeValues.subarray(attrBase, attrEnd),
          size: 1,
        };
      }

      layers.push(
        new PathLayer({
          ...pathProps,
          id: `${id}-batch-${batchIndex}`,
          data: {
            length: pathCount,
            startIndices: cleanStartIndices,
            attributes,
          },
          extensions: [new DataFilterExtension({filterSize: 1})],
          filterEnabled: true,
          filterRange: timeRange,
          filterCategories,
          widthMinPixels: 1,
          widthUnits: 'pixels',
          _pathType: 'open',
        } as any),
      );
    }

    return layers;
  }
}

function quantizePathView(pathView: Float32Array, digits: number): Float32Array {
  const factor = 10 ** digits;
  const quantized = new Float32Array(pathView.length);

  for (let index = 0; index < pathView.length; index += 2) {
    quantized[index] = Math.round(pathView[index] * factor) / factor;
    quantized[index + 1] = Math.round(pathView[index + 1] * factor) / factor;
  }

  return quantized;
}
