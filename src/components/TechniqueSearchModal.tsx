// Модальное окно поиска техник из Knowledge Base
// Использует keyword_search RPC (Level 2 — без Ollama, работает в браузере)

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';

interface TechniqueSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (technique: { id: string; name: string }) => void;
  excludeIds?: string[];
}

interface SearchResult {
  entityType: string;
  entityId: string;
  content: string;
  score: number;
}

/** Задержка дебаунса для поиска (мс) */
const DEBOUNCE_MS = 300;

export function TechniqueSearchModal({
  isOpen,
  onClose,
  onSelect,
  excludeIds = [],
}: TechniqueSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Фокус на инпут при открытии
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSearchError(null);
    }
  }, [isOpen]);

  // Debounced поиск
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void searchTechniques(query.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function searchTechniques(searchQuery: string) {
    setIsSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase.rpc('keyword_search', {
        query_text: searchQuery,
        match_count: 15,
        filter_type: 'techniques',
      });

      if (error) {
        console.error('[TechniqueSearch] keyword_search error:', error);
        setSearchError('Ошибка поиска');
        setResults([]);
        return;
      }

      const mapped: SearchResult[] = (data || []).map((row: Record<string, unknown>) => ({
        entityType: row.entity_type as string,
        entityId: row.entity_id as string,
        content: row.content as string,
        score: (row.rank_score as number) ?? 0,
      }));

      // Исключаем уже добавленные
      const excludeSet = new Set(excludeIds);
      setResults(mapped.filter((r) => !excludeSet.has(r.entityId)));
    } catch (err) {
      console.error('[TechniqueSearch] Unexpected error:', err);
      setSearchError('Ошибка соединения');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Бэкдроп */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        onKeyDown={() => {}}
        role="button"
        tabIndex={-1}
        aria-label="Закрыть"
      />

      {/* Модальное окно */}
      <div className="relative w-full max-w-lg bg-gray-900 rounded-t-2xl border-t border-gray-700 max-h-[80vh] flex flex-col">
        {/* Ручка */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* Заголовок + поиск */}
        <div className="px-4 pb-3 border-b border-gray-800">
          <h3 className="text-base font-semibold mb-2">Поиск техник</h3>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите название техники..."
              className="w-full px-3 py-2.5 pl-9 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Результаты */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {searchError && (
            <p className="text-sm text-red-400 text-center py-4">{searchError}</p>
          )}

          {!query.trim() && !searchError && (
            <p className="text-sm text-gray-500 text-center py-8">
              Введите запрос для поиска из 566 техник
            </p>
          )}

          {query.trim().length >= 2 && !isSearching && results.length === 0 && !searchError && (
            <p className="text-sm text-gray-500 text-center py-8">
              Ничего не найдено
            </p>
          )}

          {results.map((result) => (
            <button
              key={result.entityId}
              type="button"
              onClick={() => {
                onSelect({ id: result.entityId, name: result.content });
                onClose();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-800 active:bg-gray-700 transition-colors mb-1"
            >
              <p className="text-sm text-gray-200 line-clamp-2">{result.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{result.entityType}</span>
                {result.score > 0 && (
                  <span className="text-xs text-gray-600">
                    релевантность: {result.score.toFixed(2)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Кнопка закрыть */}
        <div className="px-4 py-3 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
