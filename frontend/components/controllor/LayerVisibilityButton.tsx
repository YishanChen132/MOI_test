// 這個檔案負責顯示單一圖層可見狀態的眼睛切換按鈕。
import {Eye, EyeOff} from 'lucide-react';

export function LayerVisibilityButton({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const Icon = checked ? Eye : EyeOff;

  return (
    <button
      type="button"
      className={`moi-layer-visibility-button${checked ? ' is-visible' : ''}`}
      aria-pressed={checked}
      title={label}
      onClick={onToggle}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}
