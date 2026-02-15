// Хук подписки на Supabase Realtime (Session Sync)
// Канал: session-sync:{sessionSyncId} (формат из shared/services/session-sync.ts)
// Событие: 'sync' (broadcast mode)
// Получает обновления из Video AI и Bot, отправляет события из Mini App
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  IVideoAiSyncResult,
  ISessionSyncEvent,
  SessionSyncEventType,
} from '../types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Типы возвращаемого значения хука
// ═══════════════════════════════════════════════════════════════

export interface UseSessionSyncReturn {
  /** Накопленные результаты Video AI */
  videoAiResults: IVideoAiSyncResult | null;
  /** Подключён ли Realtime канал */
  isConnected: boolean;
  /** Последнее полученное событие */
  lastEvent: SessionSyncEventType | null;
  /** Количество попыток переподключения */
  connectionAttempts: number;
  /** Отправить событие из Mini App */
  sendEvent: (type: SessionSyncEventType, payload: unknown) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// Аккумулятор результатов Video AI
// ═══════════════════════════════════════════════════════════════

/** Типы событий от Video AI */
const VIDEO_AI_EVENT_TYPES: ReadonlySet<SessionSyncEventType> = new Set([
  'video_started',
  'pose_detected',
  'rom_measured',
  'video_completed',
  'photo_analyzed',
]);

/** Высокочастотные события (обновляют только ref, не state) */
const HIGH_FREQUENCY_EVENTS: ReadonlySet<SessionSyncEventType> = new Set([
  'pose_detected',
]);

/** Интервал flush ref → state для высокочастотных событий (мс) */
const FLUSH_INTERVAL_MS = 500;

function createEmptyVideoAiResult(): IVideoAiSyncResult {
  return {
    romMeasurements: [],
    asymmetries: [],
    snapshots: [],
    quality: 0,
    status: 'recording',
  };
}

/**
 * Чистая функция аккумуляции результатов Video AI.
 * Принимает текущее состояние + новое событие → возвращает обновлённое состояние.
 */
function accumulateVideoAiResult(
  current: IVideoAiSyncResult,
  event: ISessionSyncEvent,
): IVideoAiSyncResult {
  switch (event.type) {
    case 'video_started':
      return { ...createEmptyVideoAiResult(), status: 'recording' };

    case 'rom_measured': {
      const p = event.payload as {
        joint: string;
        movement: string;
        degrees: number;
        confidence: number;
      };
      return {
        ...current,
        romMeasurements: [...current.romMeasurements, p],
      };
    }

    case 'pose_detected': {
      // Высокочастотное — извлекаем асимметрии и качество если есть
      const p = event.payload as {
        asymmetries?: IVideoAiSyncResult['asymmetries'];
        quality?: number;
      };
      return {
        ...current,
        asymmetries: p.asymmetries ?? current.asymmetries,
        quality: p.quality ?? current.quality,
      };
    }

    case 'video_completed': {
      // Финальный результат — мержим всё
      const p = event.payload as Partial<IVideoAiSyncResult>;
      return {
        romMeasurements: p.romMeasurements ?? current.romMeasurements,
        asymmetries: p.asymmetries ?? current.asymmetries,
        snapshots: p.snapshots ?? current.snapshots,
        quality: p.quality ?? current.quality,
        status: 'completed',
      };
    }

    case 'photo_analyzed': {
      const p = event.payload as {
        timestamp: number;
        imageUrl: string;
        annotation: string;
      };
      return {
        ...current,
        snapshots: [...current.snapshots, p],
      };
    }

    default:
      return current;
  }
}

// ═══════════════════════════════════════════════════════════════
// Хук
// ═══════════════════════════════════════════════════════════════

/**
 * Подписка на Supabase Realtime канал сессии.
 * Получает события от Video AI и Bot, отправляет события из Mini App.
 *
 * @param sessionSyncId — UUID синхронизации (null = не подключаться)
 */
export function useSessionSync(sessionSyncId: string | null): UseSessionSyncReturn {
  const [videoAiResults, setVideoAiResults] = useState<IVideoAiSyncResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SessionSyncEventType | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Refs для избежания stale closures в broadcast callback
  const channelRef = useRef<RealtimeChannel | null>(null);
  const videoAiRef = useRef<IVideoAiSyncResult>(createEmptyVideoAiResult());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!sessionSyncId) {
      setIsConnected(false);
      return;
    }

    // Сброс при новой сессии
    videoAiRef.current = createEmptyVideoAiResult();
    setVideoAiResults(null);
    setConnectionAttempts(0);
    setLastEvent(null);

    // Канал: session-sync:{syncId} (совпадает с shared/services/session-sync.ts:109)
    // Событие: 'sync' (совпадает с shared/services/session-sync.ts:110)
    const channel = supabase
      .channel(`session-sync:${sessionSyncId}`)
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (!isMountedRef.current) return;

        const event = payload.payload as ISessionSyncEvent;
        setLastEvent(event.type);

        // Аккумуляция событий Video AI
        if (VIDEO_AI_EVENT_TYPES.has(event.type)) {
          videoAiRef.current = accumulateVideoAiResult(videoAiRef.current, event);

          // Высокочастотные события — только ref (flush через interval)
          if (!HIGH_FREQUENCY_EVENTS.has(event.type)) {
            setVideoAiResults({ ...videoAiRef.current });
          }
        }
      })
      .subscribe((status, err) => {
        if (!isMountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionAttempts(0);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionAttempts((prev) => prev + 1);
          console.warn(`[useSessionSync] ${status}:`, err?.message);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Flush высокочастотных событий из ref в state каждые 500мс
    const flushInterval = setInterval(() => {
      if (isMountedRef.current && videoAiRef.current.status === 'recording') {
        setVideoAiResults({ ...videoAiRef.current });
      }
    }, FLUSH_INTERVAL_MS);

    // Visibility change: логирование при возвращении из background
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && channelRef.current) {
        // Supabase Realtime автоматически переподключает socket
        // Логируем для отладки
        console.log('[useSessionSync] Tab visible, reconnecting if needed');
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      clearInterval(flushInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [sessionSyncId]);

  // Отправка события из Mini App (stable callback)
  const sendEvent = useCallback(
    async (type: SessionSyncEventType, payload: unknown): Promise<void> => {
      const ch = channelRef.current;
      if (!ch || !sessionSyncId) {
        console.warn('[useSessionSync] sendEvent: нет канала или sessionSyncId');
        return;
      }

      const event: ISessionSyncEvent = {
        sessionSyncId,
        source: 'mini_app',
        type,
        payload,
        timestamp: Date.now(),
      };

      await ch.send({
        type: 'broadcast',
        event: 'sync',
        payload: event,
      });
    },
    [sessionSyncId],
  );

  return { videoAiResults, isConnected, lastEvent, connectionAttempts, sendEvent };
}
