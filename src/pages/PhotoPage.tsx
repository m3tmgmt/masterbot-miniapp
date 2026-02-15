// Страница загрузки фото клиента (3 ракурса: спереди, сбоку, сзади)
// Сжатие через Canvas API < 1MB, загрузка в Supabase Storage bucket masterbot-media

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTelegramAuth } from '../hooks/useTelegramAuth.ts';
import { useSessionSync } from '../hooks/useSessionSync.ts';
import { PhotoSlot } from '../components/PhotoSlot.tsx';
import { compressImage } from '../utils/compress-image.ts';
import { uploadPhotoToStorage, savePhotoRecord } from '../utils/upload-photo.ts';
import { supabase } from '../lib/supabase.ts';
import type { IPhotoUpload } from '../types/index.ts';

type ViewAngle = IPhotoUpload['viewAngle'];

/** Конфигурация 3 слотов */
const PHOTO_SLOTS: Array<{
  angle: ViewAngle;
  label: string;
  instruction: string;
}> = [
  {
    angle: 'front',
    label: 'Спереди',
    instruction: 'Клиент стоит прямо, руки вдоль тела',
  },
  {
    angle: 'side_right',
    label: 'Сбоку (правый)',
    instruction: 'Клиент стоит боком, правая сторона к камере',
  },
  {
    angle: 'back',
    label: 'Сзади',
    instruction: 'Клиент стоит спиной к камере',
  },
];

/** Создание пустого слота */
function createEmptySlot(viewAngle: ViewAngle): IPhotoUpload {
  return {
    tempId: crypto.randomUUID(),
    viewAngle,
    preview: '',
    file: null,
    storageUrl: null,
    uploadStatus: 'pending',
    aiAnalysis: null,
  };
}

/** Ключ localStorage для draft */
const STORAGE_KEY = 'plemya_photos_draft';

export function PhotoPage() {
  const { userId, startParam } = useTelegramAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // assessmentId из URL params или null
  const assessmentId = searchParams.get('assessmentId');
  // clientId из Telegram startParam
  const clientId = startParam ?? null;
  // sessionSyncId из URL params (для Realtime)
  const sessionSyncId = searchParams.get('sessionSyncId');

  // Session Sync hook — для broadcast событий
  const { sendEvent } = useSessionSync(sessionSyncId);

  // Состояние фото слотов
  const [photos, setPhotos] = useState<Map<ViewAngle, IPhotoUpload>>(() =>
    new Map(PHOTO_SLOTS.map((s) => [s.angle, createEmptySlot(s.angle)])),
  );

  // ID мастера (резолвим из Telegram ID)
  const [practitionerId, setPractitionerId] = useState<string | null>(null);

  // Резолв practitioner_id при монтировании
  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('telegram_id', String(userId))
        .maybeSingle();
      setPractitionerId(practitioner?.id ?? null);
    })();
  }, [userId]);

  /** Обновление одного слота (иммутабельно) */
  function updateSlot(angle: ViewAngle, patch: Partial<IPhotoUpload>) {
    setPhotos((prev) => {
      const next = new Map(prev);
      const current = next.get(angle);
      if (!current) return prev;
      next.set(angle, { ...current, ...patch });
      return next;
    });
  }

  /** Обработка захвата фото */
  async function handleCapture(angle: ViewAngle, file: File) {
    updateSlot(angle, { uploadStatus: 'uploading' });

    try {
      // Сжатие изображения
      const { blob, preview, compressedSize } = await compressImage(file);
      console.log(`[PhotoPage] ${angle}: ${file.size} → ${compressedSize} bytes`);

      // Показать превью сразу
      updateSlot(angle, { preview, file: blob });

      // Загрузка в Supabase Storage (если есть IDs)
      if (clientId && assessmentId) {
        const { signedUrl, storagePath } = await uploadPhotoToStorage(
          blob,
          clientId,
          assessmentId,
          angle,
        );

        updateSlot(angle, {
          storageUrl: signedUrl,
          uploadStatus: 'completed',
        });

        // Сохранить запись в session_media
        if (practitionerId) {
          await savePhotoRecord(
            assessmentId,
            practitionerId,
            clientId,
            angle,
            storagePath,
            signedUrl,
          );
        }

        // Broadcast событие через Session Sync
        await sendEvent('photo_uploaded', {
          viewAngle: angle,
          storageUrl: signedUrl,
        });
      } else {
        // Нет IDs — сохраняем локально
        updateSlot(angle, { uploadStatus: 'completed' });
        saveToLocalStorage();
      }
    } catch (err) {
      console.error(`[PhotoPage] Ошибка обработки ${angle}:`, err);
      updateSlot(angle, { uploadStatus: 'error' });
    }
  }

  /** Сброс слота для повторного снимка */
  function handleRetake(angle: ViewAngle) {
    updateSlot(angle, {
      tempId: crypto.randomUUID(),
      preview: '',
      file: null,
      storageUrl: null,
      uploadStatus: 'pending',
      aiAnalysis: null,
    });
  }

  /** Сохранение в localStorage (fallback) */
  function saveToLocalStorage() {
    const drafts: Record<string, string> = {};
    photos.forEach((photo, angle) => {
      if (photo.preview) {
        drafts[angle] = photo.preview;
      }
    });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ drafts, savedAt: new Date().toISOString() }),
    );
  }

  // Подсчёт прогресса
  const photosArray = Array.from(photos.values());
  const completedCount = photosArray.filter((p) => p.uploadStatus === 'completed').length;
  const isUploading = photosArray.some((p) => p.uploadStatus === 'uploading');
  const allCompleted = completedCount === PHOTO_SLOTS.length;

  return (
    <div className="p-4 pb-28 min-h-screen">
      {/* Заголовок */}
      <h1 className="text-xl font-bold mb-1">Фото клиента</h1>
      <p className="text-sm text-gray-400 mb-4">
        Сделайте 3 фото для визуального анализа осанки
      </p>

      {/* Предупреждение если нет IDs */}
      {(!clientId || !assessmentId) && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-sm text-yellow-400">
            Фото будут сохранены локально. Для загрузки на сервер откройте через бот.
          </p>
        </div>
      )}

      {/* Прогресс */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / PHOTO_SLOTS.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-400 whitespace-nowrap">
          {completedCount} из {PHOTO_SLOTS.length}
        </span>
      </div>

      {/* Слоты фото */}
      <div className="space-y-4">
        {PHOTO_SLOTS.map((slot) => {
          const photo = photos.get(slot.angle);
          if (!photo) return null;
          return (
            <PhotoSlot
              key={slot.angle}
              photo={photo}
              label={slot.label}
              instruction={slot.instruction}
              onCapture={handleCapture}
              onRetake={handleRetake}
            />
          );
        })}
      </div>

      {/* Нижняя навигация */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-3 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={() => {
              if (!allCompleted) return;
              const params = new URLSearchParams();
              if (assessmentId) params.set('assessmentId', assessmentId);
              if (sessionSyncId) params.set('sessionSyncId', sessionSyncId);
              navigate(`/assessment?${params.toString()}`);
            }}
            disabled={!allCompleted || isUploading}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
              allCompleted && !isUploading
                ? 'bg-blue-600 text-white active:bg-blue-700'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isUploading ? 'Загрузка...' : allCompleted ? 'Далее' : `Загрузите все ${PHOTO_SLOTS.length} фото`}
          </button>
        </div>
      </div>
    </div>
  );
}
