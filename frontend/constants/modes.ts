// 這個檔案專門集中管理載具模式的代碼、名稱和顏色。
export const MODE_DEFINITIONS = [
  {code: 1, label: 'Walk', color: '#1CC5F8', tripColor: '#5EDBFF'},
  {code: 2, label: 'Car', color: '#FFB11B', tripColor: '#FFD15C'},
  {code: 8, label: 'Bus', color: '#6F3381', tripColor: '#A06BC1'},
  {code: 16, label: 'Rail', color: '#CB1B45', tripColor: '#F45C80'},
] as const;

export type ModeCode = (typeof MODE_DEFINITIONS)[number]['code'];

export const ALL_MODE_CODES = MODE_DEFINITIONS.map((mode) => mode.code) as ModeCode[];
export const ALL_MODE_LABELS = MODE_DEFINITIONS.map((mode) => mode.label);

export const MODE_LABEL_BY_CODE = new Map<ModeCode, string>(
  MODE_DEFINITIONS.map((mode) => [mode.code, mode.label]),
);

export const MODE_COLOR_BY_CODE = new Map<ModeCode, string>(
  MODE_DEFINITIONS.map((mode) => [mode.code, mode.color]),
);

export function isModeCode(value: number): value is ModeCode {
  return ALL_MODE_CODES.includes(value as ModeCode);
}

export function toModeLabel(mode: number): string {
  return MODE_LABEL_BY_CODE.get(mode as ModeCode) ?? `Mode ${mode}`;
}

export function formatModeList(modes: readonly number[]): string {
  if (modes.length === ALL_MODE_CODES.length) {
    return 'All modes';
  }

  if (modes.length === 0) {
    return 'No modes';
  }

  return modes.map((mode) => toModeLabel(mode)).join(', ');
}

export function buildModeColorRange() {
  return {
    name: 'MOI Mobility',
    type: 'custom',
    category: 'Custom',
    colors: MODE_DEFINITIONS.map((mode) => mode.color),
  };
}

export function buildTripModeColorRange() {
  return {
    name: 'MOI Mobility Trips',
    type: 'custom',
    category: 'Custom',
    colors: MODE_DEFINITIONS.map((mode) => mode.tripColor),
  };
}
