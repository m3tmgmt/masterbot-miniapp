// Детализация зоны боли — modal/bottom-sheet
// Открывается при нажатии на зону в BodyMap
// Поля: интенсивность (PainSlider), тип боли (chips), длительность, описание

import { useState } from 'react';
import { PainSlider } from './PainSlider.tsx';
import type { IBodyMapZone } from '../types/index.ts';

/** Тип боли с русским названием */
const PAIN_TYPES = [
  { value: 'sharp', label: 'Острая' },
  { value: 'dull', label: 'Тупая' },
  { value: 'aching', label: 'Ноющая' },
  { value: 'throbbing', label: 'Пульсирующая' },
  { value: 'burning', label: 'Жгучая' },
] as const;

type PainTypeValue = typeof PAIN_TYPES[number]['value'];

/** Длительность боли */
const DURATION_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: '3months+', label: '>3 мес' },
] as const;

interface PainZoneDetailProps {
  /** Зона для редактирования */
  zone: IBodyMapZone;
  /** Текущий тип боли */
  painType?: PainTypeValue;
  /** Текущая длительность */
  duration: string;
  /** Текущее описание */
  description: string;
  /** Сохранить изменения */
  onSave: (data: {
    painType?: PainTypeValue;
    duration: string;
    description: string;
    intensity: number;
  }) => void;
  /** Удалить зону */
  onDelete: () => void;
  /** Закрыть без сохранения */
  onClose: () => void;
}

export function PainZoneDetail({
  zone,
  painType: initialPainType,
  duration: initialDuration,
  description: initialDescription,
  onSave,
  onDelete,
  onClose,
}: PainZoneDetailProps) {
  const [intensity, setIntensity] = useState(zone.intensity);
  const [painType, setPainType] = useState<PainTypeValue | undefined>(initialPainType);
  const [duration, setDuration] = useState(initialDuration || 'today');
  const [description, setDescription] = useState(initialDescription);

  const handleSave = () => {
    onSave({ painType, duration, description, intensity });
  };

  return (
    // Фоновый оверлей
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        // Закрыть при клике по backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Bottom sheet */}
      <div className="relative w-full max-w-lg bg-gray-900 rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
        {/* Ручка для свайпа (визуальная) */}
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

        {/* Заголовок */}
        <h3 className="text-lg font-bold mb-4">{zone.nameRu}</h3>

        {/* Интенсивность — PainSlider */}
        <div className="mb-5">
          <PainSlider
            value={intensity}
            onChange={setIntensity}
            label="Интенсивность боли"
          />
        </div>

        {/* Тип боли — chips */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-2 block">Тип боли</label>
          <div className="flex flex-wrap gap-2">
            {PAIN_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  painType === pt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 border border-gray-700'
                }`}
                onClick={() => setPainType(painType === pt.value ? undefined : pt.value)}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Длительность — radio-style buttons */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-2 block">Длительность</label>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`py-2 rounded-lg text-sm transition-colors ${
                  duration === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 border border-gray-700'
                }`}
                onClick={() => setDuration(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Описание — textarea */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">
            Описание <span className="text-gray-500 font-normal">(необязательно)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите характер боли..."
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-900/40 text-red-400 border border-red-800/50"
            onClick={onDelete}
          >
            Удалить зону
          </button>
          <button
            type="button"
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white"
            onClick={handleSave}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
