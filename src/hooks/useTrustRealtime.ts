// Хук подписки на обновления Trust Weights через Realtime
// Слушает session-sync канал (assessment_generated, session_updated)
// Throttle: max 1 обновление в секунду
// Fallback: polling каждые 5 сек если Realtime не получен за 10 сек

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ISessionSyncEvent } from '../types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Типы
// ═══════════════════════════════════════════════════════════════

export interface TrustRealtimeData {
  /** Веса источников (сумма = 1.0) */
  weights: { ai: number; tests: number; master: number };
  /** Общий confidence (0-100) */
  overallConfidence: number;
  /** ID применённых модификаторов */
  appliedModifiers: string[];
  /** Подключён ли Realtime */
  isLive: boolean;
  /** Время последнего обновления */
  lastUpdated: number | null;
}

/** Начальное состояние (до получения данных) */
const INITIAL_STATE: TrustRealtimeData = {
  weights: { ai: 0.4, tests: 0.35, master: 0.25 },
  overallConfidence: 0,
  appliedModifiers: [],
  isLive: false,
  lastUpdated: null,
};

/** Интервал throttle (мс) */
const THROTTLE_MS = 1000;

/** Таймаут для переключения на polling (мс) */
const REALTIME_TIMEOUT_MS = 10000;

/** Интервал polling fallback (мс) */
const POLL_INTERVAL_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// Хук
// ═══════════════════════════════════════════════════════════════

/**
 * Подписка на обновления Trust Weights через Supabase Realtime.
 * Throttle 1/сек + polling fallback 5 сек.
 *
 * @param sessionSyncId — UUID сессии (null = не подключаться)
 * @param assessmentId — UUID assessment (для polling fallback)
 */
export function useTrustRealtime(
  sessionSyncId: string | null,
  assessmentId: string | null,
): TrustRealtimeData {
  const [data, setData] = useState<TrustRealtimeData>(INITIAL_STATE);

  // Refs для throttle и lifecycle
  const lastUpdateRef = useRef(0);
  const lastRealtimeRef = useRef(0);
  const isMountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const usingPollingRef = useRef(false);

  // Throttled state update
  const throttledUpdate = useCallback((update: Partial<TrustRealtimeData>) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < THROTTLE_MS) return;
    lastUpdateRef.current = now;

    if (isMountedRef.current) {
      setData((prev) => ({ ...prev, ...update, lastUpdated: now }));
    }
  }, []);

  // Polling fallback — загрузка из БД
  const pollFromDb = useCallback(async () => {
    if (!assessmentId || !isMountedRef.current) return;

    try {
      const { data: row, error } = await supabase
        .from('pre_session_assessments')
        .select('trust_weights, overall_confidence, sources')
        .eq('id', assessmentId)
        .maybeSingle();

      if (error || !row) return;

      const weights = (row.trust_weights as { ai: number; tests: number; master: number } | null)
        ?? INITIAL_STATE.weights;
      const overallConfidence = (row.overall_confidence as number | null) ?? 0;
      const appliedModifiers = (row.sources as Array<{ id?: string }> | null)
        ?.map((s) => s.id)
        .filter((id): id is string => !!id) ?? [];

      throttledUpdate({ weights, overallConfidence, appliedModifiers });
    } catch {
      // Polling ошибка — молча пропускаем
    }
  }, [assessmentId, throttledUpdate]);

  // Основной эффект: Realtime подписка + polling fallback
  useEffect(() => {
    isMountedRef.current = true;
    lastRealtimeRef.current = 0;
    usingPollingRef.current = false;

    if (!sessionSyncId) {
      // Нет sessionSyncId — только polling если есть assessmentId
      if (assessmentId) {
        void pollFromDb();
      }
      return;
    }

    // Подписка на Realtime канал
    const channel = supabase
      .channel(`trust-sync:${sessionSyncId}`)
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (!isMountedRef.current) return;

        const event = payload.payload as ISessionSyncEvent;

        // Обрабатываем события с trust данными
        if (
          event.type === 'assessment_generated' ||
          event.type === 'session_updated'
        ) {
          lastRealtimeRef.current = Date.now();
          usingPollingRef.current = false;

          const p = event.payload as {
            trustWeights?: { ai: number; tests: number; master: number };
            overallConfidence?: number;
            appliedModifiers?: string[];
          };

          if (p.trustWeights) {
            throttledUpdate({
              weights: p.trustWeights,
              overallConfidence: p.overallConfidence ?? data.overallConfidence,
              appliedModifiers: p.appliedModifiers ?? data.appliedModifiers,
              isLive: true,
            });
          }
        }
      })
      .subscribe((status) => {
        if (!isMountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          setData((prev) => ({ ...prev, isLive: true }));
          lastRealtimeRef.current = Date.now();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setData((prev) => ({ ...prev, isLive: false }));
        }
      });

    channelRef.current = channel;

    // Polling fallback: проверяем каждые 5 сек нужен ли polling
    const pollInterval = setInterval(() => {
      if (!isMountedRef.current) return;

      const sinceLastRealtime = Date.now() - lastRealtimeRef.current;

      // Если Realtime молчит больше 10 сек — переключаемся на polling
      if (sinceLastRealtime > REALTIME_TIMEOUT_MS && assessmentId) {
        if (!usingPollingRef.current) {
          usingPollingRef.current = true;
          setData((prev) => ({ ...prev, isLive: false }));
        }
        void pollFromDb();
      }
    }, POLL_INTERVAL_MS);

    // Начальная загрузка из БД
    if (assessmentId) {
      void pollFromDb();
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [sessionSyncId, assessmentId, pollFromDb, throttledUpdate, data.overallConfidence, data.appliedModifiers]);

  return data;
}
