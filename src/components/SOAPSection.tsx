// Секция SOAP — сворачиваемая карточка с буквой-бейджем
// S=синий, O=зелёный, A=фиолетовый, P=оранжевый

import { useState } from 'react';

interface SOAPSectionProps {
  letter: 'S' | 'O' | 'A' | 'P';
  title: string;
  hasData: boolean;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

/** Цвета бейджей по букве SOAP */
const LETTER_COLORS: Record<string, { bg: string; text: string }> = {
  S: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  O: { bg: 'bg-green-500/20', text: 'text-green-400' },
  A: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  P: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
};

/** Названия SOAP секций */
const LETTER_LABELS: Record<string, string> = {
  S: 'Subjective',
  O: 'Objective',
  A: 'Assessment',
  P: 'Plan',
};

export function SOAPSection({
  letter,
  title,
  hasData,
  children,
  defaultExpanded,
}: SOAPSectionProps) {
  const [expanded, setExpanded] = useState(
    defaultExpanded ?? hasData,
  );

  const colors = LETTER_COLORS[letter] ?? LETTER_COLORS.S;

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* Заголовок */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors"
      >
        {/* Бейдж буквы */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${colors.bg} ${colors.text}`}>
          {letter}
        </div>

        {/* Название */}
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-gray-200">{title}</span>
          <span className="text-xs text-gray-500 ml-2">{LETTER_LABELS[letter]}</span>
        </div>

        {/* Индикатор данных */}
        {!hasData && (
          <span className="text-xs text-gray-600 px-2 py-0.5 rounded bg-gray-800">
            нет данных
          </span>
        )}

        {/* Шеврон */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Контент */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-700/50">
          {hasData ? (
            <div className="pt-3">{children}</div>
          ) : (
            <div className="pt-3 text-center py-6">
              <p className="text-sm text-gray-500">Ожидание данных...</p>
              <p className="text-xs text-gray-600 mt-1">
                Данные появятся после обработки
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
