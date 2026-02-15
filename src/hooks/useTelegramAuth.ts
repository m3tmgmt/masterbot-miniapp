// Хук авторизации через @tma.js/sdk v3
// Получает userId, startParam, initDataRaw из Telegram Launch Params
import { useState, useEffect } from 'react';
import { retrieveLaunchParams, retrieveRawInitData } from '@tma.js/sdk';

/** Состояние авторизации Telegram */
interface TelegramAuthState {
  /** Telegram user ID мастера */
  userId: number | null;
  /** Start parameter (может содержать clientId) */
  startParam: string | null;
  /** Имя пользователя */
  userName: string;
  /** Сырая строка initData для backend-верификации (HMAC) */
  initDataRaw: string | null;
  /** SDK инициализирован и данные получены */
  isReady: boolean;
  /** Ошибка (если не в Telegram или SDK не смог получить launch params) */
  error: string | null;
}

export function useTelegramAuth(): TelegramAuthState {
  const [state, setState] = useState<TelegramAuthState>({
    userId: null,
    startParam: null,
    userName: 'Master',
    initDataRaw: null,
    isReady: false,
    error: null,
  });

  useEffect(() => {
    try {
      // retrieveLaunchParams() — синхронный, бросает исключение если нет launch params
      const lp = retrieveLaunchParams();
      const initData = lp.tgWebAppData;
      const user = initData?.user ?? null;

      // retrieveRawInitData() — сырая строка для backend-верификации
      const rawInitData = retrieveRawInitData() ?? null;

      // startParam может быть в двух местах:
      // 1. tgWebAppStartParam (из URL прямой ссылки)
      // 2. tgWebAppData.start_param (внутри initData)
      const startParam = lp.tgWebAppStartParam ?? initData?.start_param ?? null;

      setState({
        userId: user?.id ?? null,
        startParam,
        userName: user?.first_name ?? 'Master',
        initDataRaw: rawInitData,
        isReady: true,
        error: null,
      });
    } catch (err: unknown) {
      // SDK не смог получить launch params — вероятно, не в Telegram
      const message = err instanceof Error ? err.message : 'Не удалось получить данные Telegram';

      if (import.meta.env.DEV) {
        // В dev-режиме не блокируем, но логируем
        console.warn('[useTelegramAuth] SDK error в dev-режиме:', message);
        setState({
          userId: null,
          startParam: null,
          userName: 'Dev Master',
          initDataRaw: null,
          isReady: true,
          error: null,
        });
      } else {
        setState({
          userId: null,
          startParam: null,
          userName: 'Master',
          initDataRaw: null,
          isReady: true,
          error: 'Приложение доступно только в Telegram',
        });
      }
    }
  }, []);

  return state;
}
