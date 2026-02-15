// Переключатель вида Body Map: [Спереди] / [Сзади]
// + свайп жестом для мобильных

import { useRef, useCallback, type ReactNode } from 'react';

interface ViewSwitcherProps {
  /** Текущий вид */
  view: 'front' | 'back';
  /** Обработчик смены вида */
  onViewChange: (view: 'front' | 'back') => void;
  /** BodyMap компонент */
  children: ReactNode;
}

export function BodyMapViewSwitcher({ view, onViewChange, children }: ViewSwitcherProps) {
  const touchStartX = useRef<number | null>(null);

  // Начало свайпа
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  // Конец свайпа — определяем направление
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 50;

    if (deltaX > SWIPE_THRESHOLD && view === 'back') {
      onViewChange('front');
    } else if (deltaX < -SWIPE_THRESHOLD && view === 'front') {
      onViewChange('back');
    }
    touchStartX.current = null;
  }, [view, onViewChange]);

  return (
    <div>
      {/* Переключатель вида */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-3">
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            view === 'front'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-400'
          }`}
          onClick={() => onViewChange('front')}
        >
          Спереди
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            view === 'back'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-400'
          }`}
          onClick={() => onViewChange('back')}
        >
          Сзади
        </button>
      </div>

      {/* Область свайпа (обёртка BodyMap) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
