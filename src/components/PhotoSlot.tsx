// Слот для загрузки одного фото (capture + preview + status)
// Используется на PhotoPage — 3 слота для 3 ракурсов

import { useRef } from 'react';
import type { IPhotoUpload } from '../types/index.ts';

type ViewAngle = IPhotoUpload['viewAngle'];

interface PhotoSlotProps {
  /** Данные фото слота */
  photo: IPhotoUpload;
  /** Подпись ракурса */
  label: string;
  /** Инструкция для фотографирования */
  instruction: string;
  /** Callback при выборе файла */
  onCapture: (angle: ViewAngle, file: File) => void;
  /** Callback при повторном снимке */
  onRetake: (angle: ViewAngle) => void;
}

/** Иконка камеры (SVG inline) */
function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-500"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/** Спиннер загрузки */
function Spinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-blue-500" />
  );
}

export function PhotoSlot({ photo, label, instruction, onCapture, onRetake }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (photo.uploadStatus === 'uploading') return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onCapture(photo.viewAngle, file);
    // Сбросить input чтобы повторный выбор того же файла работал
    e.target.value = '';
  };

  const handleRetake = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRetake(photo.viewAngle);
    // Открыть камеру после сброса
    setTimeout(() => inputRef.current?.click(), 100);
  };

  const hasPreview = photo.preview.length > 0;
  const isUploading = photo.uploadStatus === 'uploading';
  const isCompleted = photo.uploadStatus === 'completed';
  const isError = photo.uploadStatus === 'error';

  return (
    <section className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/50">
      {/* Скрытый file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="font-semibold text-sm">{label}</h3>
        {isCompleted && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Загружено
          </span>
        )}
        {isError && (
          <span className="text-xs text-red-400">Ошибка</span>
        )}
      </div>

      {/* Область фото */}
      {hasPreview ? (
        // Превью загруженного фото
        <div className="relative mx-4 mb-3">
          <img
            src={photo.preview}
            alt={label}
            className="w-full aspect-[3/4] object-cover rounded-lg"
          />

          {/* Overlay при загрузке */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center gap-2">
              <Spinner />
              <span className="text-sm text-gray-300">Загрузка...</span>
            </div>
          )}

          {/* Кнопки под превью */}
          <div className="mt-2 flex gap-2">
            {isError && (
              <button
                type="button"
                onClick={handleClick}
                className="flex-1 py-2 text-sm rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 active:bg-red-500/30 transition-colors"
              >
                Повторить
              </button>
            )}
            {!isUploading && (
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2 text-sm rounded-lg bg-gray-700/50 text-gray-300 border border-gray-600 active:bg-gray-600/50 transition-colors"
              >
                Переснять
              </button>
            )}
          </div>
        </div>
      ) : (
        // Пустой слот — placeholder для захвата
        <button
          type="button"
          onClick={handleClick}
          className="w-full px-4 pb-4"
        >
          <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center gap-3 active:bg-gray-700/30 transition-colors cursor-pointer">
            <CameraIcon />
            <span className="text-sm text-gray-400 text-center px-4">
              {instruction}
            </span>
            <span className="text-xs text-blue-400">
              Нажмите для съёмки
            </span>
          </div>
        </button>
      )}
    </section>
  );
}
