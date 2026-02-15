// Мок Telegram окружения для локальной разработки
// Использует mockTelegramEnv из @tma.js/sdk для корректной работы retrieveLaunchParams()
import { mockTelegramEnv } from '@tma.js/sdk';

if (import.meta.env.DEV) {
  // tgWebAppData в raw формате (query string), как Telegram присылает
  const initDataRaw = new URLSearchParams({
    user: JSON.stringify({
      id: 12345678,
      first_name: 'Test',
      last_name: 'Master',
      username: 'testmaster',
    }),
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: 'mock_hash_for_dev',
    signature: 'mock_signature_for_dev',
  }).toString();

  mockTelegramEnv({
    launchParams: {
      tgWebAppVersion: '7.0',
      tgWebAppPlatform: 'tdesktop',
      tgWebAppThemeParams: JSON.stringify({
        bg_color: '#1c1c1e',
        text_color: '#ffffff',
        hint_color: '#8e8e93',
        link_color: '#007aff',
        button_color: '#007aff',
        button_text_color: '#ffffff',
      }),
      tgWebAppData: initDataRaw,
    },
  });
}

export {};
