// Типы MasterBot Mini App
// Source of truth: @plemya/shared/types/mini-app.ts, assessment-v2.ts
// Локальные копии (compile-time only) — sync вручную

// ═══════════════════════════════════════════════════════════════
// AssessmentChannel — из assessment-v2.ts
// ═══════════════════════════════════════════════════════════════

export type AssessmentChannel = 'mini_app' | 'video_ai' | 'bot' | 'manual';

// ═══════════════════════════════════════════════════════════════
// IPainZone — из assessment-v2.ts
// ═══════════════════════════════════════════════════════════════

/** Зона боли (body map или текст) */
export interface IPainZone {
  /** Область тела (анатомическое название) */
  bodyArea: string;
  /** Координаты на body map SVG (если из Mini App) */
  coordinates?: { x: number; y: number };
  /** Интенсивность зоны (0-10) */
  intensity: number;
  /** Тип боли */
  painType?: 'sharp' | 'dull' | 'burning' | 'aching' | 'throbbing' | 'other';
  /** Источник данных */
  source: AssessmentChannel;
}

// ═══════════════════════════════════════════════════════════════
// Mini App Types — из mini-app.ts
// ═══════════════════════════════════════════════════════════════

/** Страницы Mini App */
export type MiniAppPage =
  | 'intake'
  | 'photo'
  | 'video_launch'
  | 'assessment'
  | 'treatment_plan'
  | 'checklist'
  | 'post_session'
  | 'history'
  | 'clients'
  | 'settings';

/** Данные формы приёма */
export interface IIntakeFormData {
  chiefComplaint: string;
  painZones: IPainZone[];
  painSeverity: number;
  painDuration: string;
  contraindications: string[];
  medicalHistory: string;
  additionalNotes: string;
}

/** Данные Body Map */
export interface IBodyMapData {
  zones: IBodyMapZone[];
  view: 'front' | 'back' | 'side_left' | 'side_right';
  viewportSize: { width: number; height: number };
}

/** Зона на body map */
export interface IBodyMapZone {
  zoneId: string;
  nameRu: string;
  anatomicalName: string;
  touchPoint: { x: number; y: number };
  intensity: number;
  painType?: 'sharp' | 'dull' | 'burning' | 'aching' | 'throbbing' | 'other';
}

/** Определение зоны тела для SVG (каталог) */
export interface IBodyZoneDefinition {
  id: string;
  nameRu: string;
  anatomicalName: string;
  pathData: string;
  center: { x: number; y: number };
  views: Array<'front' | 'back' | 'side_left' | 'side_right'>;
  relatedAnatomy: string[];
}

/** Фото загруженное через Mini App */
export interface IPhotoUpload {
  tempId: string;
  viewAngle: 'front' | 'side_right' | 'side_left' | 'back';
  preview: string;
  file: Blob | null;
  storageUrl: string | null;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  aiAnalysis: string | null;
}

/** Результаты Video AI полученные через Realtime sync */
export interface IVideoAiSyncResult {
  romMeasurements: Array<{
    joint: string;
    movement: string;
    degrees: number;
    confidence: number;
  }>;
  asymmetries: Array<{
    joint: string;
    leftDegrees: number;
    rightDegrees: number;
  }>;
  snapshots: Array<{
    timestamp: number;
    imageUrl: string;
    annotation: string;
  }>;
  quality: number;
  status: 'recording' | 'processing' | 'completed' | 'error';
}

/** Состояние Mini App */
export interface IMiniAppState {
  currentPage: MiniAppPage;
  sessionSyncId: string | null;
  assessmentId: string | null;
  practitionerId: string | null;
  clientId: string | null;
  intakeData: IIntakeFormData | null;
  bodyMapData: IBodyMapData | null;
  photos: IPhotoUpload[];
  videoAiConnected: boolean;
  videoAiResults: IVideoAiSyncResult | null;
  isLoading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Session Sync — из session-sync.ts
// ═══════════════════════════════════════════════════════════════

/** Типы событий синхронизации сеанса */
export type SessionSyncEventType =
  // Lifecycle
  | 'session_created'
  | 'session_updated'
  | 'session_completed'
  | 'channel_connected'
  | 'channel_disconnected'
  // Data flow
  | 'intake_completed'
  | 'body_map_updated'
  | 'photo_uploaded'
  | 'photo_analyzed'
  | 'video_started'
  | 'pose_detected'
  | 'rom_measured'
  | 'video_completed'
  | 'test_result_added'
  | 'assessment_generated'
  | 'plan_generated'
  | 'plan_approved'
  // Bot-specific
  | 'bot_copilot_query'
  | 'bot_notification_sent'
  | 'bot_dialog_update';

/** Событие синхронизации (Supabase Realtime broadcast) */
export interface ISessionSyncEvent {
  /** ID синхронизации */
  sessionSyncId: string;
  /** Откуда пришло событие */
  source: AssessmentChannel;
  /** Тип события */
  type: SessionSyncEventType;
  /** Payload (зависит от type) */
  payload: unknown;
  /** Timestamp */
  timestamp: number;
}

/** Состояние Treatment Plan Builder */
export interface ITreatmentPlanBuilderState {
  phases: Array<{
    order: number;
    name: string;
    duration: number;
    techniques: Array<{
      id: string;
      name: string;
      fromKnowledgeBase: boolean;
    }>;
    bodyArea: string;
    notes: string;
  }>;
  totalDuration: number;
  isApproved: boolean;
  lastSearchQuery: string | null;
}
