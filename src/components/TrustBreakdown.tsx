// Детализация Trust Weights — раскрывается по клику на TrustBadge
// Показывает применённые модификаторы с иконками и описаниями

// ═══════════════════════════════════════════════════════════════
// Иконки и описания модификаторов
// ═══════════════════════════════════════════════════════════════

interface ModifierInfo {
  icon: string;
  label: string;
  description: string;
  /** Направление влияния: какой вес растёт/падает */
  effect: { ai: 'up' | 'down' | 'none'; tests: 'up' | 'down' | 'none'; master: 'up' | 'down' | 'none' };
}

const MODIFIER_INFO: Record<string, ModifierInfo> = {
  video_good_quality: {
    icon: '📹',
    label: 'Качественное видео',
    description: 'FPS ≥ 25, качество ≥ 0.8',
    effect: { ai: 'up', tests: 'none', master: 'down' },
  },
  no_video: {
    icon: '📹',
    label: 'Без видео',
    description: 'Video AI не использовался',
    effect: { ai: 'down', tests: 'up', master: 'up' },
  },
  rom_stable_3plus: {
    icon: '🧪',
    label: '3+ ROM замера',
    description: 'Стабильные замеры (σ < 5°)',
    effect: { ai: 'none', tests: 'up', master: 'none' },
  },
  master_senior: {
    icon: '👨‍⚕️',
    label: 'Опытный мастер',
    description: '5+ лет практики',
    effect: { ai: 'none', tests: 'none', master: 'up' },
  },
  ai_confidence_high: {
    icon: '🤖',
    label: 'Высокая уверенность AI',
    description: 'AI confidence ≥ 85%',
    effect: { ai: 'up', tests: 'none', master: 'none' },
  },
  ai_confidence_low: {
    icon: '🤖',
    label: 'Низкая уверенность AI',
    description: 'AI confidence < 50%',
    effect: { ai: 'down', tests: 'up', master: 'up' },
  },
  returning_client: {
    icon: '🔄',
    label: 'Повторный клиент',
    description: '3+ сеансов ранее',
    effect: { ai: 'up', tests: 'up', master: 'none' },
  },
  first_visit: {
    icon: '⏱️',
    label: 'Первый визит',
    description: 'Нет истории сеансов',
    effect: { ai: 'none', tests: 'up', master: 'down' },
  },
};

// ═══════════════════════════════════════════════════════════════
// Компоненты
// ═══════════════════════════════════════════════════════════════

/** Стрелка эффекта */
function EffectArrow({ direction }: { direction: 'up' | 'down' | 'none' }) {
  if (direction === 'none') return <span className="text-gray-600 text-[10px]">—</span>;
  if (direction === 'up') return <span className="text-green-400 text-[10px]">▲</span>;
  return <span className="text-red-400 text-[10px]">▼</span>;
}

interface TrustBreakdownProps {
  /** ID применённых модификаторов */
  appliedModifiers: string[];
  /** Показывать ли компонент */
  isExpanded: boolean;
}

export function TrustBreakdown({ appliedModifiers, isExpanded }: TrustBreakdownProps) {
  if (!isExpanded) return null;

  const hasModifiers = appliedModifiers.length > 0;

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 animate-[fadeIn_300ms_ease-in]">
      {hasModifiers ? (
        <>
          <p className="text-xs text-gray-500 mb-2">Модификаторы уверенности</p>
          <div className="space-y-1.5">
            {appliedModifiers.map((modId) => {
              const info = MODIFIER_INFO[modId];
              if (!info) {
                return (
                  <div key={modId} className="text-xs text-gray-500 flex items-center gap-2 px-2 py-1.5 bg-gray-800/30 rounded">
                    <span>📎</span>
                    <span>{modId}</span>
                  </div>
                );
              }

              return (
                <div key={modId} className="bg-gray-800/30 rounded px-2.5 py-2">
                  {/* Строка модификатора */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{info.icon}</span>
                    <span className="text-xs font-medium text-gray-300 flex-1">{info.label}</span>
                  </div>

                  {/* Описание */}
                  <p className="text-[11px] text-gray-500 mb-1.5 ml-6">{info.description}</p>

                  {/* Эффект на веса */}
                  <div className="flex gap-3 ml-6">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600">AI</span>
                      <EffectArrow direction={info.effect.ai} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600">Тесты</span>
                      <EffectArrow direction={info.effect.tests} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600">Мастер</span>
                      <EffectArrow direction={info.effect.master} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-500">Модификаторы не применены (базовые веса)</p>
      )}
    </div>
  );
}
