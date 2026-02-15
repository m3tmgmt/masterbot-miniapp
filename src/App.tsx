// MasterBot Mini App — Router с авторизацией Telegram
// HashRouter для совместимости с GitHub Pages и Telegram WebView
import { Routes, Route } from 'react-router-dom';
import { useTelegramAuth } from './hooks/useTelegramAuth.ts';
import { IntakePage } from './pages/IntakePage.tsx';
import { PhotoPage } from './pages/PhotoPage.tsx';
import { AssessmentPage } from './pages/AssessmentPage.tsx';
import { PlanPage } from './pages/PlanPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';

export default function App() {
  const auth = useTelegramAuth();

  // Ожидание инициализации SDK
  if (!auth.isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    );
  }

  // Ошибка — не в Telegram
  if (auth.error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Только в Telegram</h1>
          <p className="text-gray-400 mb-4">{auth.error}</p>
          <p className="text-sm text-gray-500">
            Откройте приложение через бот @MASTER_plemya_BOT
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<IntakePage />} />
      <Route path="/photo" element={<PhotoPage />} />
      <Route path="/assessment" element={<AssessmentPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  );
}
