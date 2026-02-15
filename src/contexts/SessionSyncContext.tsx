// SessionSyncContext — React Context для синхронизации Bot ↔ Mini App
// Предоставляет syncId, assessmentId, sendEvent, isConnected всем страницам
// Использует useActiveSyncSession (lookup по telegramId) + useSessionSync (Realtime)

import { createContext, useContext } from 'react';
import type { SessionSyncEventType } from '../types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Типы контекста
// ═══════════════════════════════════════════════════════════════

export interface ISessionSyncContext {
  /** ID сессии синхронизации (null если нет активной) */
  syncId: string | null;
  /** ID assessment из session_sync (null если нет) */
  assessmentId: string | null;
  /** Отправить событие через Realtime broadcast */
  sendEvent: (type: SessionSyncEventType, payload: unknown) => Promise<void>;
  /** Подключён ли Realtime канал */
  isConnected: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════

export const SessionSyncContext = createContext<ISessionSyncContext>({
  syncId: null,
  assessmentId: null,
  sendEvent: async () => {},
  isConnected: false,
});

/** Удобный хук для использования в компонентах */
export function useSessionSyncContext(): ISessionSyncContext {
  return useContext(SessionSyncContext);
}
