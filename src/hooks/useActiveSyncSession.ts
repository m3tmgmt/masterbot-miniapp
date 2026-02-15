// Находит активную session_sync: URL params FIRST, DB fallback SECOND
// Flow: URL ?syncId=X&aId=Y → direct use || telegramId → practitioners UUID → session_sync

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { useTelegramAuth } from './useTelegramAuth.ts';

// ═══════════════════════════════════════════════════════════════
// Типы
// ═══════════════════════════════════════════════════════════════

interface ActiveSyncState {
  /** ID сессии синхронизации для Realtime */
  syncId: string | null;
  /** ID assessment (для обновления intake data) */
  assessmentId: string | null;
  /** Загрузка */
  loading: boolean;
  /** Ошибка */
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Хук
// ═══════════════════════════════════════════════════════════════

/**
 * Находит активную session_sync по telegramId мастера.
 * Решает проблему iOS stripping URL query params.
 *
 * Порядок:
 * 1. Получить telegramId из useTelegramAuth()
 * 2. Запросить session_sync WHERE practitioner_id = telegramId AND status not completed/cancelled
 * 3. Вернуть syncId + assessmentId
 * 4. Dev fallback: URL params если Telegram недоступен
 */
export function useActiveSyncSession(): ActiveSyncState {
  const { userId, isReady } = useTelegramAuth();
  const [state, setState] = useState<ActiveSyncState>({
    syncId: null,
    assessmentId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!isReady) return;

    async function findActiveSession() {
      try {
        // 1. СНАЧАЛА проверить URL params (бот передаёт syncId и aId явно)
        const params = new URLSearchParams(window.location.search);
        const urlSyncId = params.get('syncId');
        const urlAssessmentId = params.get('aId');

        if (urlSyncId) {
          console.log('[useActiveSyncSession] Найден syncId из URL:', urlSyncId);
          setState({
            syncId: urlSyncId,
            assessmentId: urlAssessmentId,
            loading: false,
            error: null,
          });
          return;
        }

        // 2. Fallback: DB lookup (если iOS обрезал URL params)
        const telegramId = userId;

        if (!telegramId) {
          setState({ syncId: null, assessmentId: null, loading: false, error: null });
          return;
        }

        // 2a. Найти practitioner UUID по telegramId
        const { data: practitioner } = await supabase
          .from('practitioners')
          .select('id')
          .eq('telegram_id', telegramId)
          .maybeSingle();

        if (!practitioner) {
          console.warn('[useActiveSyncSession] Мастер не найден:', telegramId);
          setState({ syncId: null, assessmentId: null, loading: false, error: null });
          return;
        }

        // 2b. Найти активную сессию по UUID мастера
        const { data, error: dbError } = await supabase
          .from('session_sync')
          .select('id, assessment_id')
          .eq('practitioner_id', practitioner.id)
          .not('status', 'in', '("completed","cancelled")')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbError) {
          console.error('[useActiveSyncSession] DB error:', dbError);
          setState({ syncId: null, assessmentId: null, loading: false, error: null });
          return;
        }

        if (!data) {
          // Нет активной сессии — нормальная ситуация (Mini App открыта без сессии)
          setState({ syncId: null, assessmentId: null, loading: false, error: null });
          return;
        }

        setState({
          syncId: data.id as string,
          assessmentId: data.assessment_id as string,
          loading: false,
          error: null,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Ошибка загрузки сессии';
        console.error('[useActiveSyncSession] Exception:', msg);
        setState({ syncId: null, assessmentId: null, loading: false, error: msg });
      }
    }

    findActiveSession();
  }, [userId, isReady]);

  return state;
}
