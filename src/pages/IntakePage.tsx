// Страница приёма клиента — 4-step wizard
// Step 1: Body Map + PainZoneDetail
// Step 2: Жалоба клиента (textarea + quick chips)
// Step 3: Противопоказания (checkboxes)
// Step 4: Дополнительная информация + Submit → Supabase

import { useState, useCallback } from 'react';
import { useTelegramAuth } from '../hooks/useTelegramAuth.ts';
import { BodyMap } from '../components/BodyMap.tsx';
import { BodyMapViewSwitcher } from '../components/BodyMapViewSwitcher.tsx';
import { PainZoneDetail } from '../components/PainZoneDetail.tsx';
import { ZoneList } from '../components/ZoneList.tsx';
import { IntakeStepper } from '../components/IntakeStepper.tsx';
import type { IBodyMapZone, IIntakeFormData, IPainZone } from '../types/index.ts';
import { BODY_ZONE_MAP } from '../data/body-zones.ts';
import { supabase } from '../lib/supabase.ts';

// ═══════════════════════════════════════════════════════════════
// Константы
// ═══════════════════════════════════════════════════════════════

const STEP_LABELS = ['Карта боли', 'Жалоба', 'Противопоказания', 'Доп. инфо'];

/** Quick chips для жалобы клиента */
const COMPLAINT_CHIPS = [
  'Боль в спине',
  'Головная боль',
  'Боль в шее',
  'Боль в плечах',
  'Скованность',
  'Онемение',
];

/** Чеклист противопоказаний */
const CONTRAINDICATION_OPTIONS = [
  'Онкологические заболевания',
  'Острые воспалительные процессы',
  'Тромбозы / тромбофлебит',
  'Кожные заболевания в зоне массажа',
  'Повышенная температура тела',
  'Беременность',
  'Послеоперационный период',
  'Гипертонический криз',
  'Грыжи (межпозвонковые)',
  'Аллергия на масла / кремы',
];

/** Порядок длительности для выбора максимальной */
const DURATION_ORDER = ['today', 'week', 'month', '3months+'];
const DURATION_LABELS: Record<string, string> = {
  'today': 'Сегодня',
  'week': 'Неделя',
  'month': 'Месяц',
  '3months+': 'Более 3 месяцев',
};

const STORAGE_KEY = 'plemya_intake_draft';

// ═══════════════════════════════════════════════════════════════
// Типы
// ═══════════════════════════════════════════════════════════════

/** Данные детализации зоны (тип боли, длительность, описание) */
interface ZoneDetailData {
  painType?: 'sharp' | 'dull' | 'burning' | 'aching' | 'throbbing' | 'other';
  duration: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════
// Утилиты localStorage
// ═══════════════════════════════════════════════════════════════

function saveToLocalStorage(data: IIntakeFormData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    data,
    savedAt: new Date().toISOString(),
  }));
}

function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Определить самую длительную боль из всех зон */
function deriveLongestDuration(details: Map<string, ZoneDetailData>): string {
  let maxIdx = 0;
  for (const d of details.values()) {
    const idx = DURATION_ORDER.indexOf(d.duration);
    if (idx > maxIdx) maxIdx = idx;
  }
  return DURATION_LABELS[DURATION_ORDER[maxIdx]] ?? 'Сегодня';
}

// ═══════════════════════════════════════════════════════════════
// Компонент
// ═══════════════════════════════════════════════════════════════

export function IntakePage() {
  const { userName, userId, startParam, isReady } = useTelegramAuth();

  // ─── Wizard step ───
  const [currentStep, setCurrentStep] = useState(1);

  // ─── Step 1: Body Map ───
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [selectedZones, setSelectedZones] = useState<IBodyMapZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneDetails, setZoneDetails] = useState<Map<string, ZoneDetailData>>(new Map());

  // ─── Step 2: Chief Complaint ───
  const [chiefComplaint, setChiefComplaint] = useState('');

  // ─── Step 3: Contraindications ───
  const [contraindications, setContraindications] = useState<string[]>([]);

  // ─── Step 4: Additional Info ───
  const [medicalHistory, setMedicalHistory] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // ─── Submit ───
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // Body Map handlers
  // ═══════════════════════════════════════════════════════════════

  // Клик по зоне: добавить новую или выбрать для редактирования
  const handleZoneClick = useCallback((zoneId: string) => {
    const existing = selectedZones.find(z => z.zoneId === zoneId);
    if (existing) {
      setSelectedZoneId(zoneId);
    } else {
      const def = BODY_ZONE_MAP.get(zoneId);
      if (!def) return;
      const newZone: IBodyMapZone = {
        zoneId: def.id,
        nameRu: def.nameRu,
        anatomicalName: def.anatomicalName,
        touchPoint: def.center,
        intensity: 5,
      };
      setSelectedZones(prev => [...prev, newZone]);
      setSelectedZoneId(zoneId);
    }
  }, [selectedZones]);

  // Сохранение данных PainZoneDetail
  const handleZoneDetailSave = useCallback((data: {
    painType?: ZoneDetailData['painType'];
    duration: string;
    description: string;
    intensity: number;
  }) => {
    if (!selectedZoneId) return;

    // Обновить интенсивность и painType в selectedZones
    setSelectedZones(prev =>
      prev.map(z => z.zoneId === selectedZoneId
        ? { ...z, intensity: data.intensity, painType: data.painType }
        : z
      )
    );

    // Обновить детали зоны
    setZoneDetails(prev => {
      const next = new Map(prev);
      next.set(selectedZoneId, {
        painType: data.painType,
        duration: data.duration,
        description: data.description,
      });
      return next;
    });

    setSelectedZoneId(null);
  }, [selectedZoneId]);

  // Удаление зоны
  const handleZoneDelete = useCallback(() => {
    if (!selectedZoneId) return;
    setSelectedZones(prev => prev.filter(z => z.zoneId !== selectedZoneId));
    setZoneDetails(prev => {
      const next = new Map(prev);
      next.delete(selectedZoneId);
      return next;
    });
    setSelectedZoneId(null);
  }, [selectedZoneId]);

  // Удаление зоны из ZoneList
  const handleRemoveZone = useCallback((zoneId: string) => {
    setSelectedZones(prev => prev.filter(z => z.zoneId !== zoneId));
    setZoneDetails(prev => {
      const next = new Map(prev);
      next.delete(zoneId);
      return next;
    });
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
  }, [selectedZoneId]);

  // ═══════════════════════════════════════════════════════════════
  // Contraindications handler
  // ═══════════════════════════════════════════════════════════════

  const toggleContraindication = useCallback((item: string) => {
    setContraindications(prev =>
      prev.includes(item)
        ? prev.filter(c => c !== item)
        : [...prev, item]
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Validation
  // ═══════════════════════════════════════════════════════════════

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: return selectedZones.length > 0;
      case 2: return chiefComplaint.trim().length >= 3;
      case 3: return true; // Нет противопоказаний — это нормально
      case 4: return true; // Дополнительные поля — опциональны
      default: return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Submit
  // ═══════════════════════════════════════════════════════════════

  const buildIntakeData = (): IIntakeFormData => {
    const painZones: IPainZone[] = selectedZones.map(z => {
      const detail = zoneDetails.get(z.zoneId);
      return {
        bodyArea: z.anatomicalName,
        coordinates: z.touchPoint,
        intensity: z.intensity,
        painType: detail?.painType ?? z.painType,
        source: 'mini_app' as const,
      };
    });

    return {
      chiefComplaint,
      painZones,
      painSeverity: selectedZones.length > 0
        ? Math.max(...selectedZones.map(z => z.intensity))
        : 0,
      painDuration: deriveLongestDuration(zoneDetails),
      contraindications,
      medicalHistory,
      additionalNotes,
    };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const data = buildIntakeData();

    // Всегда сохраняем локально как backup
    saveToLocalStorage(data);

    try {
      // Резолвим practitioner_id из Telegram ID
      let practitionerId: string | null = null;
      if (userId) {
        const { data: practitioner } = await supabase
          .from('practitioners')
          .select('id')
          .eq('telegram_id', String(userId))
          .maybeSingle();
        practitionerId = practitioner?.id ?? null;
      }

      // Резолвим client_id из startParam (бот передаёт clientId при открытии Mini App)
      const clientId = startParam ?? null;

      if (!practitionerId || !clientId) {
        // Нет practitioner или client в БД — сохраняем только локально
        console.warn('[IntakePage] Missing IDs — practitioner:', practitionerId, 'client:', clientId);
        setSubmitError('Данные сохранены локально. Идентификаторы не найдены.');
        setSubmitSuccess(true);
        return;
      }

      // INSERT в pre_session_assessments
      const { error } = await supabase
        .from('pre_session_assessments')
        .insert({
          practitioner_id: practitionerId,
          client_id: clientId,
          chief_complaint: data.chiefComplaint,
          pain_locations: data.painZones.map(z => z.bodyArea),
          pain_severity: data.painSeverity,
          pain_duration: data.painDuration,
          additional_info: data.additionalNotes || null,
          contraindications: data.contraindications,
          status: 'in_progress',
          // v2 поля
          channels_used: ['mini_app'],
          engine_version: '2.0',
          subjective_data: {
            chiefComplaint: data.chiefComplaint,
            painZones: data.painZones,
            painSeverity: data.painSeverity,
            painDuration: data.painDuration,
            medicalHistory: data.medicalHistory || null,
            additionalInfo: data.additionalNotes || null,
          },
        });

      if (error) {
        console.error('[IntakePage] Supabase insert error:', error);
        setSubmitError('Данные сохранены локально. Синхронизация будет выполнена позже.');
      } else {
        clearLocalStorage();
      }

      setSubmitSuccess(true);
    } catch (err) {
      console.error('[IntakePage] Submit exception:', err);
      setSubmitError('Данные сохранены локально. Синхронизация будет выполнена позже.');
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════════════════════════

  const goNext = () => {
    if (currentStep < 4 && isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  if (!isReady) {
    return <div className="p-4 text-center">Загрузка...</div>;
  }

  // Успешная отправка
  if (submitSuccess) {
    return (
      <div className="p-4 text-center">
        <div className="text-4xl mb-4">
          {submitError ? '\u26A0\uFE0F' : '\u2705'}
        </div>
        <h2 className="text-xl font-bold mb-2">
          {submitError ? 'Данные сохранены' : 'Данные отправлены'}
        </h2>
        {submitError && (
          <p className="text-sm text-yellow-400 mb-4">{submitError}</p>
        )}
        <p className="text-gray-400 text-sm">
          {submitError
            ? 'Данные будут синхронизированы при следующем подключении.'
            : 'Переходите к следующему этапу.'}
        </p>
      </div>
    );
  }

  // Текущая зона для PainZoneDetail
  const activeZone = selectedZones.find(z => z.zoneId === selectedZoneId);
  const activeZoneDetail = selectedZoneId ? zoneDetails.get(selectedZoneId) : undefined;

  return (
    <div className="p-4 pb-24">
      {/* Заголовок */}
      <h1 className="text-xl font-bold mb-1">Приём клиента</h1>
      <p className="text-gray-400 text-sm mb-4">Мастер: {userName}</p>

      {/* Stepper */}
      <IntakeStepper
        currentStep={currentStep}
        totalSteps={4}
        labels={STEP_LABELS}
      />

      {/* ═══ Step 1: Body Map ═══ */}
      {currentStep === 1 && (
        <section className="border border-gray-700 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Карта боли</h2>

          <BodyMapViewSwitcher view={bodyView} onViewChange={setBodyView}>
            <BodyMap
              view={bodyView}
              zones={selectedZones}
              onZoneClick={handleZoneClick}
              selectedZoneId={selectedZoneId ?? undefined}
            />
          </BodyMapViewSwitcher>

          {/* Список выбранных зон */}
          <div className="mt-4">
            <ZoneList
              zones={selectedZones}
              onRemove={handleRemoveZone}
              onSelect={setSelectedZoneId}
              selectedZoneId={selectedZoneId ?? undefined}
            />
          </div>

          {/* PainZoneDetail modal */}
          {activeZone && selectedZoneId && (
            <PainZoneDetail
              zone={activeZone}
              painType={activeZoneDetail?.painType}
              duration={activeZoneDetail?.duration ?? 'today'}
              description={activeZoneDetail?.description ?? ''}
              onSave={handleZoneDetailSave}
              onDelete={handleZoneDelete}
              onClose={() => setSelectedZoneId(null)}
            />
          )}
        </section>
      )}

      {/* ═══ Step 2: Chief Complaint ═══ */}
      {currentStep === 2 && (
        <section className="border border-gray-700 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Жалоба клиента</h2>

          <textarea
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Опишите основную жалобу клиента..."
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500 mb-3"
          />

          {/* Quick chips */}
          <div className="flex flex-wrap gap-2">
            {COMPLAINT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className="px-3 py-1.5 rounded-full text-xs bg-gray-800 text-gray-300 border border-gray-700 active:bg-gray-700"
                onClick={() => {
                  setChiefComplaint(prev =>
                    prev.trim() ? `${prev.trim()}, ${chip.toLowerCase()}` : chip
                  );
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {chiefComplaint.trim().length > 0 && chiefComplaint.trim().length < 3 && (
            <p className="text-xs text-red-400 mt-2">Минимум 3 символа</p>
          )}
        </section>
      )}

      {/* ═══ Step 3: Contraindications ═══ */}
      {currentStep === 3 && (
        <section className="border border-gray-700 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Противопоказания</h2>
          <p className="text-xs text-gray-500 mb-4">
            Отметьте, если у клиента есть противопоказания
          </p>

          <div className="space-y-2">
            {CONTRAINDICATION_OPTIONS.map((item) => {
              const isChecked = contraindications.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-red-500/50 bg-red-500/10'
                      : 'border-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleContraindication(item)}
                    className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-800"
                  />
                  <span className="text-sm">{item}</span>
                </label>
              );
            })}
          </div>

          {contraindications.length > 0 && (
            <p className="text-xs text-red-400 mt-3">
              Выбрано противопоказаний: {contraindications.length}
            </p>
          )}
        </section>
      )}

      {/* ═══ Step 4: Additional Info ═══ */}
      {currentStep === 4 && (
        <section className="border border-gray-700 rounded-lg p-4 space-y-4">
          <h2 className="font-semibold mb-1">Дополнительная информация</h2>

          {/* Медицинский анамнез */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Медицинский анамнез
              <span className="text-gray-500 font-normal ml-1">(необязательно)</span>
            </label>
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="Хронические заболевания, операции, травмы..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Дополнительные заметки */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Дополнительные заметки
              <span className="text-gray-500 font-normal ml-1">(необязательно)</span>
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Аллергии, давление, ранее применённые методы..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
            />
          </div>
        </section>
      )}

      {/* ═══ Navigation ═══ */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 p-4">
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStep > 1 && (
            <button
              type="button"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700"
              onClick={goBack}
            >
              \u2190 Назад
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isStepValid(currentStep)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!isStepValid(currentStep)}
              onClick={goNext}
            >
              Далее \u2192
            </button>
          ) : (
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isSubmitting
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white'
              }`}
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить данные'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
