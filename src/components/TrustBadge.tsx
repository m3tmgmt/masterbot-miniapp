// Бейдж доверия — отображает веса AI / Тесты / Мастер
// Цветовая кодировка: ≥80% зелёный, ≥50% жёлтый, <50% красный
// Расширяемый: по клику показывает применённые модификаторы

import { useState } from 'react';

// Описания модификаторов (из trust-model.ts, без runtime импорта)
const MODIFIER_DESCRIPTIONS: Record<string, string> = {
  video_good_quality: 'Video AI: высокое качество (FPS ≥ 25)',
  no_video: 'Video AI не использовался',
  rom_stable_3plus: '3+ стабильных ROM замера',
  master_senior: 'Мастер: 5+ лет опыта',
  ai_confidence_high: 'AI confidence ≥ 85%',
  ai_confidence_low: 'AI confidence < 50%',
  returning_client: 'Повторный клиент (3+ сеансов)',
  first_visit: 'Первый визит клиента',
};

interface TrustBadgeProps {
  /** Веса источников (0-1 каждый, сумма = 1.0) */
  weights: { ai: number; tests: number; master: number };
  /** Общий confidence (0-100) */
  overallConfidence: number;
  /** ID применённых модификаторов */
  appliedModifiers?: string[];
}

/** Цвет текста по значению веса (0-1) */
function getWeightColor(value: number): string {
  if (value >= 0.8) return 'text-green-400';
  if (value >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

/** Цвет фона по значению веса */
function getWeightBg(value: number): string {
  if (value >= 0.8) return 'bg-green-400/20';
  if (value >= 0.5) return 'bg-yellow-400/20';
  return 'bg-red-400/20';
}

/** Цвет бара по confidence (0-100) */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-green-500';
  if (confidence >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function TrustBadge({ weights, overallConfidence, appliedModifiers }: TrustBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const sources = [
    { label: 'AI', value: weights.ai },
    { label: 'Тесты', value: weights.tests },
    { label: 'Мастер', value: weights.master },
  ];

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      {/* Общий confidence */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <span className="text-sm font-medium text-gray-300">Уверенность</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${
            overallConfidence >= 80 ? 'text-green-400' :
            overallConfidence >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {overallConfidence}%
          </span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Прогресс бар */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${getConfidenceColor(overallConfidence)}`}
          style={{ width: `${Math.min(overallConfidence, 100)}%` }}
        />
      </div>

      {/* Веса источников */}
      <div className="flex gap-2">
        {sources.map(({ label, value }) => (
          <div
            key={label}
            className={`flex-1 rounded-md px-2 py-1.5 text-center ${getWeightBg(value)}`}
          >
            <div className="text-xs text-gray-400">{label}</div>
            <div className={`text-sm font-semibold ${getWeightColor(value)}`}>
              {Math.round(value * 100)}%
            </div>
          </div>
        ))}
      </div>

      {/* Развёрнутые модификаторы */}
      {expanded && appliedModifiers && appliedModifiers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-1.5">Применённые модификаторы:</p>
          <ul className="space-y-1">
            {appliedModifiers.map((modId) => (
              <li key={modId} className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>{MODIFIER_DESCRIPTIONS[modId] ?? modId}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && (!appliedModifiers || appliedModifiers.length === 0) && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500">Модификаторы не применены (базовые веса)</p>
        </div>
      )}
    </div>
  );
}
