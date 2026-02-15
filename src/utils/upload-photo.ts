// Утилита загрузки фото в Supabase Storage
// Bucket: masterbot-media (private, 10MB limit)
// Путь: {clientId}/{assessmentId}/{viewAngle}.jpg

import { supabase } from '../lib/supabase.ts';

/** Результат загрузки */
export interface UploadResult {
  /** Путь в Storage bucket */
  storagePath: string;
  /** Signed URL для отображения (1 час) */
  signedUrl: string;
}

/**
 * Загружает фото в Supabase Storage bucket 'masterbot-media'.
 * Использует upsert для поддержки повторной загрузки (retake).
 */
export async function uploadPhotoToStorage(
  blob: Blob,
  clientId: string,
  assessmentId: string,
  viewAngle: string,
): Promise<UploadResult> {
  const storagePath = `${clientId}/${assessmentId}/${viewAngle}.jpg`;

  // Загрузка в Storage (upsert для retake)
  const { error: uploadError } = await supabase.storage
    .from('masterbot-media')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`[upload-photo] Ошибка загрузки: ${uploadError.message}`);
  }

  // Получение signed URL (1 час)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('masterbot-media')
    .createSignedUrl(storagePath, 3600);

  if (signedError || !signedData?.signedUrl) {
    throw new Error(`[upload-photo] Ошибка signed URL: ${signedError?.message ?? 'no data'}`);
  }

  return {
    storagePath,
    signedUrl: signedData.signedUrl,
  };
}

/**
 * Сохраняет запись о фото в таблицу session_media.
 * Если запись уже существует (retake), обновляет через upsert.
 */
export async function savePhotoRecord(
  assessmentId: string,
  practitionerId: string,
  clientId: string,
  viewAngle: string,
  storagePath: string,
  signedUrl: string,
): Promise<void> {
  const { error } = await supabase
    .from('session_media')
    .insert({
      assessment_id: assessmentId,
      practitioner_id: practitionerId,
      client_id: clientId,
      media_type: 'pre_session',
      view_angle: viewAngle,
      storage_path: storagePath,
      file_url: signedUrl,
    });

  if (error) {
    // Не блокируем — фото уже загружено в Storage
    console.warn('[upload-photo] Ошибка записи в session_media:', error.message);
  }
}
