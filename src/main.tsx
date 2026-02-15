import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

// Мок окружения ДОЛЖЕН быть импортирован ДО init()
// mockTelegramEnv заполняет storage, из которого init() читает launch params
import './mockEnv.ts';

import { init } from '@tma.js/sdk';
import App from './App.tsx';
import './index.css';

// Инициализация @tma.js/sdk — настраивает обработку событий от Telegram клиента
// init() синхронный, должен быть вызван ПОСЛЕ mockTelegramEnv и ДО рендера React
try {
  init();
} catch (err) {
  console.error('[TMA SDK] Ошибка инициализации:', err);
  // Не блокируем рендер — useTelegramAuth обработает ошибку
}

// FIX-LAUNCH-05: Telegram Web K помещает launch params в hash (#tgWebAppData=...),
// что конфликтует с HashRouter (ожидает #/ для роутинга).
// После того как init() прочитал params из hash, сбрасываем hash на root route.
// Также сохраняем startapp/syncId если они есть в hash params.
if (window.location.hash && window.location.hash.includes('tgWebAppData') && !window.location.hash.startsWith('#/')) {
  console.log('[main] Telegram hash detected, resetting to #/ for HashRouter');
  window.location.hash = '#/';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
