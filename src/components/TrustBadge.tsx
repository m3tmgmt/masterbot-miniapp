// Бейдж доверия — отображает веса AI / Тесты / Мастер
// Цветовая кодировка: >70 зелёный, 40-70 жёлтый, <40 красный
// Анимация при Realtime обновлении + tooltip + TrustBreakdown

import { useState, useRef, useEffect } from 'react';
import { TrustBreakdown } from './TrustBreakdown.tsx';

// ═══════════════════════════════════════════════════════════════
// Типы
// ═══════════════════════════════════════════════════════════════

interface TrustBadgeProps {
  /** Веса источников (0-1 каждый, сумма = 1.0) */
  weights: { ai: number; tests: number; master: number };
  /** Общий confidence (0-100) */
  overallConfidence: number;
  /** ID применённых модификаторов */
  appliedModifiers?: string[];
  /** Данные обновляются в Realtime */
  isLive?: boolean;
  /** Время последнего обновления */
  lastUpdated?: number | null;
}

// ═══════════════════════════════════════════════════════════════
// Вспомогательные функции
// ═══════════════════════════════════════════════════════════════

/** Tooltips для весов (русский) */
const WEIGHT_TOOLTIPS: Record<string, string> = {
  AI: 'Данные из MediaPipe и Groq: позы, углы, AI-анализ',
  'Тесты': 'ROM замеры, опросники, лабораторные данные',
  'Мастер': 'Наблюдения и экспертиза практикующего мастера',
};

/** Цвет текста confidence по порогам */
function getConfidenceTextColor(confidence: number): string {
  if (confidence > 70) return 'text-green-400';
  if (confidence >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

/** Цвет бара confidence */
function getConfidenceBarColor(confidence: number): string {
  if (confidence > 70) return 'bg-green-500';
  if (confidence >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

/** Цвет фона весовой ячейки */
function getWeightBg(value: number): string {
  if (value >= 0.5) return 'bg-green-400/15';
  if (value >= 0.3) return 'bg-yellow-400/15';
  return 'bg-gray-700/30';
}

/** Цвет текста весовой ячейки */
function getWeightTextColor(value: number): string {
  if (value >= 0.5) return 'text-green-400';
  if (value >= 0.3) return 'text-yellow-400';
  return 'text-gray-400';
}

// ═══════════════════════════════════════════════════════════════
// Компонент
// ═══════════════════════════════════════════════════════════════

export function TrustBadge({
  weights,
  overallConfidence,
  appliedModifiers,
  isLive,
  lastUpdated,
}: TrustBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Отслеживание изменений confidence для анимации
  const prevConfidenceRef = useRef(overallConfidence);

  useEffect(() => {
    if (prevConfidenceRef.current !== overallConfidence && prevConfidenceRef.current !== 0) {
      // Значение изменилось — показать пульс
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 1000);
      return () => clearTimeout(timer);
    }
    prevConfidenceRef.current = overallConfidence;
  }, [overallConfidence]);

  // Отображение confidence как X.X/10
  const confidenceOn10 = (overallConfidence / 10).toFixed(1);

  const sources = [
    { key: 'AI', label: 'AI', value: weights.ai },
    { key: 'Тесты', label: 'Тесты', value: weights.tests },
    { key: 'Мастер', label: 'Мастер', value: weights.master },
  ];

  // Время последнего обновления (относительное)
  const lastUpdatedText = lastUpdated
    ? `${Math.round((Date.now() - lastUpdated) / 1000)}с назад`
    : null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      {/* Заголовок с confidence */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Уверенность</span>
          {/* Индикатор Realtime */}
          {isLive && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence число */}
          <span
            className={`text-sm font-bold transition-all duration-300 ${getConfidenceTextColor(overallConfidence)} ${showPulse ? 'animate-pulse scale-110' : ''}`}
          >
            {confidenceOn10}/10
          </span>
          {/* Стрелка раскрытия */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Прогресс бар confidence */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getConfidenceBarColor(overallConfidence)}`}
          style={{ width: `${Math.min(overallConfidence, 100)}%` }}
        />
      </div>

      {/* Три весовые полоски */}
      <div className="flex gap-2">
        {sources.map(({ key, label, value }) => (
          <div
            key={key}
            className={`flex-1 rounded-md px-2 py-1.5 text-center relative cursor-default transition-all duration-500 ${getWeightBg(value)}`}
            onMouseEnter={() => setActiveTooltip(key)}
            onMouseLeave={() => setActiveTooltip(null)}
            onTouchStart={() => setActiveTooltip(activeTooltip === key ? null : key)}
          >
            <div className="text-xs text-gray-400">{label}</div>
            <div className={`text-sm font-semibold transition-all duration-500 ${getWeightTextColor(value)}`}>
              {Math.round(value * 100)}%
            </div>

            {/* Tooltip */}
            {activeTooltip === key && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 border border-gray-600 rounded-md text-[11px] text-gray-300 whitespace-nowrap z-10 shadow-lg">
                {WEIGHT_TOOLTIPS[key]}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-r border-b border-gray-600 rotate-45 -mt-1" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Время обновления */}
      {lastUpdatedText && (
        <p className="text-[10px] text-gray-600 mt-2 text-right">
          Обновлено {lastUpdatedText}
        </p>
      )}

      {/* TrustBreakdown — раскрывается по клику */}
      <TrustBreakdown
        appliedModifiers={appliedModifiers ?? []}
        isExpanded={expanded}
      />
    </div>
  );
}
