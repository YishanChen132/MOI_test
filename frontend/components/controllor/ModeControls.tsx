// 這個檔案負責顯示並控制 Control menu 裡的載具模式切換。
import {Badge} from '@sqlrooms/ui';
import {
  MODE_DEFINITIONS,
  type ModeCode,
} from '../../constants/modes';
import {getModeIcon} from './controlMenuUtils';

export function ModeControls({
  selectedModes,
  setModeEnabled,
}: {
  selectedModes: ModeCode[];
  setModeEnabled: (mode: ModeCode, enabled: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="moi-section-header flex items-center justify-between text-sm font-medium">
        <span className="moi-section-title">Mobility modes</span>
        <Badge className="moi-section-badge" variant="outline">{selectedModes.length} selected</Badge>
      </div>
      <div className="moi-mode-strip">
        {MODE_DEFINITIONS.map((mode) => {
          const Icon = getModeIcon(mode.code);
          const selected = selectedModes.includes(mode.code);

          return (
            <button
              key={mode.code}
              type="button"
              className={`moi-mode-icon-button${selected ? ' is-selected' : ''}`}
              title={mode.label}
              aria-pressed={selected}
              onClick={() => setModeEnabled(mode.code, !selected)}
            >
              <Icon className="h-6 w-6" style={{color: selected ? mode.color : '#6b7280'}} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
