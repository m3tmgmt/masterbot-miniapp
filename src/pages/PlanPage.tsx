// Страница Treatment Plan Builder
// Визуальный редактор плана лечения: фазы с техниками из KB
// Reorder через кнопки (не drag-and-drop — плохо работает на мобильных)

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { useSessionSync } from '../hooks/useSessionSync.ts';
import { useTrustRealtime } from '../hooks/useTrustRealtime.ts';
import { useSessionSyncContext } from '../contexts/SessionSyncContext.tsx';
import { TrustBadge } from '../components/TrustBadge.tsx';
import { TechniqueSearchModal } from '../components/TechniqueSearchModal.tsx';
import type { ITreatmentPlanV2, ITreatmentBlock, IPlanData } from '../types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Типы состояния билдера
// ═══════════════════════════════════════════════════════════════

interface PhaseState {
  order: number;
  name: string;
  duration: number;
  techniques: Array<{ id: string; name: string; fromKnowledgeBase: boolean }>;
  bodyArea: string;
  notes: string;
}

/** Дефолтная пустая фаза */
function createEmptyPhase(order: number): PhaseState {
  return {
    order,
    name: order === 1 ? 'Разогрев' : order === 2 ? 'Основная работа' : `Фаза ${order}`,
    duration: 15,
    techniques: [],
    bodyArea: '',
    notes: '',
  };
}

/** Конвертация блоков из БД в состояние билдера */
function blocksToPhases(blocks: ITreatmentBlock[]): PhaseState[] {
  return blocks.map((b) => ({
    order: b.phase,
    name: b.name,
    duration: b.duration,
    techniques: b.techniques.map((t) => ({
      id: t,
      name: t,
      fromKnowledgeBase: true,
    })),
    bodyArea: b.bodyArea ?? '',
    notes: b.instructions ?? '',
  }));
}

/** Конвертация состояния билдера в ITreatmentPlanV2 */
function phasesToPlan(phases: PhaseState[]): ITreatmentPlanV2 {
  return {
    blocks: phases.map((p, i) => ({
      phase: i + 1,
      name: p.name,
      duration: p.duration,
      techniques: p.techniques.map((t) => t.name),
      instructions: p.notes || undefined,
      bodyArea: p.bodyArea || undefined,
    })),
    totalDuration: phases.reduce((sum, p) => sum + p.duration, 0),
  };
}

export function PlanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ctx = useSessionSyncContext();
  const assessmentId = searchParams.get('assessmentId') || ctx.assessmentId;
  const sessionSyncId = searchParams.get('sessionSyncId') || ctx.syncId;

  // Realtime
  const { sendEvent } = useSessionSync(sessionSyncId);
  const trustRealtime = useTrustRealtime(sessionSyncId, assessmentId);

  // Состояние
  const [phases, setPhases] = useState<PhaseState[]>([createEmptyPhase(1)]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Модальное окно поиска техник
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  // Существующие plan_data для обновления
  const [existingPlanData, setExistingPlanData] = useState<IPlanData | null>(null);

  // Загрузка плана из БД
  const loadPlan = useCallback(async () => {
    if (!assessmentId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('pre_session_assessments')
        .select('plan_data')
        .eq('id', assessmentId)
        .maybeSingle();

      if (dbError) {
        console.error('[PlanPage] DB error:', dbError);
        setError('Ошибка загрузки плана');
        return;
      }

      const planData = data?.plan_data as IPlanData | null;
      setExistingPlanData(planData);

      if (planData?.treatmentPlan?.blocks?.length) {
        setPhases(blocksToPhases(planData.treatmentPlan.blocks));
      }
    } catch (err) {
      console.error('[PlanPage] Unexpected error:', err);
      setError('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  // ─── Операции над фазами ───

  /** Обновление фазы по индексу */
  function updatePhase(index: number, patch: Partial<PhaseState>) {
    setPhases((prev) => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
  }

  /** Добавить фазу */
  function addPhase() {
    setPhases((prev) => [...prev, createEmptyPhase(prev.length + 1)]);
  }

  /** Удалить фазу */
  function removePhase(index: number) {
    if (phases.length <= 1) return;
    setPhases((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i + 1 })));
  }

  /** Сдвинуть фазу вверх */
  function movePhaseUp(index: number) {
    if (index === 0) return;
    setPhases((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((p, i) => ({ ...p, order: i + 1 }));
    });
  }

  /** Сдвинуть фазу вниз */
  function movePhaseDown(index: number) {
    if (index >= phases.length - 1) return;
    setPhases((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((p, i) => ({ ...p, order: i + 1 }));
    });
  }

  /** Добавить технику в фазу */
  function addTechnique(phaseIndex: number, technique: { id: string; name: string }) {
    setPhases((prev) => prev.map((p, i) => {
      if (i !== phaseIndex) return p;
      // Проверка дубликатов
      if (p.techniques.some((t) => t.id === technique.id)) return p;
      return {
        ...p,
        techniques: [...p.techniques, { ...technique, fromKnowledgeBase: true }],
      };
    }));
  }

  /** Удалить технику из фазы */
  function removeTechnique(phaseIndex: number, techIndex: number) {
    setPhases((prev) => prev.map((p, i) => {
      if (i !== phaseIndex) return p;
      return {
        ...p,
        techniques: p.techniques.filter((_, ti) => ti !== techIndex),
      };
    }));
  }

  /** Изменить длительность фазы */
  function adjustDuration(index: number, delta: number) {
    setPhases((prev) => prev.map((p, i) => {
      if (i !== index) return p;
      const newDuration = Math.max(5, Math.min(60, p.duration + delta));
      return { ...p, duration: newDuration };
    }));
  }

  // Общая длительность
  const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);

  // Все ID техник (для exclude в поиске)
  const allTechniqueIds = phases.flatMap((p) => p.techniques.map((t) => t.id));

  // ─── Сохранение ───

  async function handleConfirm() {
    if (!assessmentId) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const treatmentPlan = phasesToPlan(phases);

      const updatedPlanData: IPlanData = {
        treatmentPlan,
        contraindications: existingPlanData?.contraindications ?? [],
        recommendedTechniques: existingPlanData?.recommendedTechniques ?? [],
        estimatedDuration: totalDuration,
        approvedByPractitioner: true,
        practitionerOverrides: existingPlanData?.practitionerOverrides ?? null,
      };

      const { error: updateError } = await supabase
        .from('pre_session_assessments')
        .update({ plan_data: updatedPlanData })
        .eq('id', assessmentId);

      if (updateError) {
        console.error('[PlanPage] Update error:', updateError);
        setError('Ошибка сохранения');
        return;
      }

      // Broadcast событие
      await sendEvent('plan_approved', {
        assessmentId,
        totalDuration,
        phaseCount: phases.length,
        techniqueCount: allTechniqueIds.length,
      });

      setSaveSuccess(true);

      // Навигация назад через 1.5с
      setTimeout(() => {
        const params = new URLSearchParams();
        if (assessmentId) params.set('assessmentId', assessmentId);
        if (sessionSyncId) params.set('sessionSyncId', sessionSyncId);
        navigate(`/assessment?${params.toString()}`);
      }, 1500);
    } catch (err) {
      console.error('[PlanPage] Confirm error:', err);
      setError('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Рендер ───

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Загрузка плана...</p>
        </div>
      </div>
    );
  }

  if (error && !phases.length) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-blue-400 underline"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-40 min-h-screen">
      {/* Заголовок */}
      <h1 className="text-xl font-bold mb-1">План лечения</h1>
      <p className="text-sm text-gray-400 mb-3">
        {totalDuration} мин | {phases.length} {phases.length === 1 ? 'фаза' : 'фазы'}
      </p>

      {/* Компактный Trust Badge */}
      {trustRealtime.overallConfidence > 0 && (
        <div className="mb-3">
          <TrustBadge
            weights={trustRealtime.weights}
            overallConfidence={trustRealtime.overallConfidence}
            appliedModifiers={trustRealtime.appliedModifiers}
            isLive={trustRealtime.isLive}
            lastUpdated={trustRealtime.lastUpdated}
          />
        </div>
      )}

      {/* Предупреждение о низкой уверенности */}
      {trustRealtime.overallConfidence > 0 && trustRealtime.overallConfidence < 40 && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <span className="text-red-400 text-lg leading-none">!</span>
          <div>
            <p className="text-sm font-medium text-red-400">Низкая уверенность AI</p>
            <p className="text-xs text-red-400/70 mt-0.5">Проверьте план вручную перед подтверждением</p>
          </div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Успех */}
      {saveSuccess && (
        <div className="mb-3 p-2 rounded bg-green-500/10 border border-green-500/20 text-sm text-green-400">
          План подтверждён!
        </div>
      )}

      {/* Фазы */}
      <div className="space-y-3">
        {phases.map((phase, index) => (
          <div key={`phase-${index}`} className="border border-gray-700 rounded-lg bg-gray-800/30">
            {/* Заголовок фазы */}
            <div className="p-3 border-b border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                {/* Номер фазы */}
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>

                {/* Название (редактируемое) */}
                <input
                  type="text"
                  value={phase.name}
                  onChange={(e) => updatePhase(index, { name: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-medium text-gray-200 border-b border-transparent focus:border-gray-600 focus:outline-none px-1 py-0.5"
                />

                {/* Кнопки перемещения */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => movePhaseUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded text-gray-500 hover:text-gray-300 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => movePhaseDown(index)}
                    disabled={index >= phases.length - 1}
                    className="p-1 rounded text-gray-500 hover:text-gray-300 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Удалить фазу */}
                  {phases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhase(index)}
                      className="p-1 rounded text-red-500/50 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Зона тела */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={phase.bodyArea}
                  onChange={(e) => updatePhase(index, { bodyArea: e.target.value })}
                  placeholder="Зона тела..."
                  className="flex-1 bg-gray-800 text-xs text-gray-400 px-2 py-1 rounded border border-gray-700 focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
                />

                {/* Длительность */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustDuration(index, -5)}
                    disabled={phase.duration <= 5}
                    className="w-6 h-6 rounded bg-gray-700 text-gray-400 text-xs font-bold disabled:opacity-30 active:bg-gray-600"
                  >
                    -
                  </button>
                  <span className="text-sm text-gray-300 w-12 text-center">
                    {phase.duration} мин
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustDuration(index, 5)}
                    disabled={phase.duration >= 60}
                    className="w-6 h-6 rounded bg-gray-700 text-gray-400 text-xs font-bold disabled:opacity-30 active:bg-gray-600"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Техники */}
            <div className="p-3">
              {phase.techniques.length === 0 ? (
                <p className="text-xs text-gray-600 mb-2">Нет техник. Добавьте из каталога.</p>
              ) : (
                <div className="space-y-1 mb-2">
                  {phase.techniques.map((tech, techIndex) => (
                    <div key={`${tech.id}-${techIndex}`} className="flex items-center gap-2 bg-gray-800/50 rounded px-2 py-1.5">
                      <span className="flex-1 text-xs text-gray-300 line-clamp-1">{tech.name}</span>
                      {tech.fromKnowledgeBase && (
                        <span className="text-[10px] text-blue-400/60 flex-shrink-0">KB</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTechnique(index, techIndex)}
                        className="p-0.5 text-gray-600 hover:text-red-400 flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Кнопка добавить технику */}
              <button
                type="button"
                onClick={() => {
                  setActivePhaseIndex(index);
                  setSearchModalOpen(true);
                }}
                className="w-full py-1.5 rounded border border-dashed border-gray-700 text-xs text-gray-500 hover:text-blue-400 hover:border-blue-500/30 transition-colors"
              >
                + Добавить технику
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Добавить фазу */}
      <button
        type="button"
        onClick={addPhase}
        className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-gray-700 text-sm text-gray-500 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
      >
        + Добавить фазу
      </button>

      {/* Подсказка при пустом плане */}
      {allTechniqueIds.length === 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">Добавьте техники из каталога (566 техник)</p>
        </div>
      )}

      {/* Модалка поиска техник */}
      <TechniqueSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelect={(technique) => addTechnique(activePhaseIndex, technique)}
        excludeIds={allTechniqueIds}
      />

      {/* Нижняя панель */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Общая длительность</span>
          <span className="text-sm font-bold text-gray-200">{totalDuration} мин</span>
        </div>
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
            onClick={() => void handleConfirm()}
            disabled={isSaving || saveSuccess}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
              isSaving || saveSuccess
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white active:bg-orange-700'
            }`}
          >
            {isSaving ? 'Сохранение...' : saveSuccess ? 'Сохранено!' : 'Подтвердить план'}
          </button>
        </div>
      </div>
    </div>
  );
}
