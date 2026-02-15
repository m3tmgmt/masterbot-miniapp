// NRS шкала боли 0-10 (Numeric Rating Scale)
// Цветовой градиент: зелёный (0) → жёлтый (5) → оранжевый (8) → красный (10)

interface PainSliderProps {
  /** Текущее значение (0-10) */
  value: number;
  /** Обработчик изменения */
  onChange: (value: number) => void;
  /** Название зоны (отображается как заголовок) */
  label?: string;
}

export function PainSlider({ value, onChange, label }: PainSliderProps) {
  // Цвет от зелёного к красному (4 уровня)
  const getColor = (v: number): string => {
    if (v <= 3) return '#22c55e';
    if (v <= 6) return '#eab308';
    if (v <= 9) return '#f97316';
    return '#ef4444';
  };

  // Эмоджи по уровню боли
  const getEmoji = (v: number): string => {
    if (v === 0) return '😊';
    if (v <= 3) return '🙂';
    if (v <= 6) return '😐';
    if (v <= 9) return '😣';
    return '😫';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">
          {label ?? 'Интенсивность боли'}
        </label>
        <span
          className="text-lg font-bold"
          style={{ color: getColor(value) }}
        >
          {getEmoji(value)} {value}/10
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Нет боли</span>
        <span>Невыносимая</span>
      </div>
    </div>
  );
}
