// Страница SOAP результатов (Assessment v2)
// Загружает данные из pre_session_assessments, отображает S/O/A/P секции
// Realtime обновления через useSessionSync

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { useSessionSync } from '../hooks/useSessionSync.ts';
import { useTrustRealtime } from '../hooks/useTrustRealtime.ts';
import { useSessionSyncContext } from '../contexts/SessionSyncContext.tsx';
import { SOAPSection } from '../components/SOAPSection.tsx';
import { TrustBadge } from '../components/TrustBadge.tsx';
import { BodyMap } from '../components/BodyMap.tsx';
import { getIntensityColor } from '../data/body-zones.ts';
import type {
  ISubjectiveData,
  IObjectiveData,
  IAssessmentResult,
  IPlanData,
  IRomMeasurement,
  IBodyMapZone,
} from '../types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Типы для данных из БД
// ═══════════════════════════════════════════════════════════════

interface AssessmentDbRow {
  id: string;
  status: string;
  chief_complaint: string | null;
  subjective_data: ISubjectiveData | null;
  objective_data: IObjectiveData | null;
  structured_assessment: IAssessmentResult | null;
  plan_data: IPlanData | null;
  trust_weights: { ai: number; tests: number; master: number } | null;
  overall_confidence: number | null;
  channels_used: string[] | null;
  sources: unknown[] | null;
}

/** Названия типов боли на русском */
const PAIN_TYPE_LABELS: Record<string, string> = {
  sharp: 'Острая',
  dull: 'Тупая',
  burning: 'Жгучая',
  aching: 'Ноющая',
  throbbing: 'Пульсирующая',
  other: 'Другая',
};

/** Названия длительности */
const DURATION_LABELS: Record<string, string> = {
  today: 'Сегодня',
  week: 'Неделя',
  month: 'Месяц',
  '3months+': '3+ месяцев',
};

/** Бейдж тяжести */
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    mild: 'bg-green-500/20 text-green-400',
    moderate: 'bg-yellow-500/20 text-yellow-400',
    severe: 'bg-red-500/20 text-red-400',
  };
  const labels: Record<string, string> = {
    mild: 'Лёгкая',
    moderate: 'Средняя',
    severe: 'Тяжёлая',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[severity] ?? 'bg-gray-700 text-gray-400'}`}>
      {labels[severity] ?? severity}
    </span>
  );
}

export function AssessmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ctx = useSessionSyncContext();
  const assessmentId = searchParams.get('assessmentId') || ctx.assessmentId;
  const sessionSyncId = searchParams.get('sessionSyncId') || ctx.syncId;

  // Realtime подписки
  const { videoAiResults, lastEvent } = useSessionSync(sessionSyncId);
  const trustRealtime = useTrustRealtime(sessionSyncId, assessmentId);

  // Данные assessment
  const [assessment, setAssessment] = useState<AssessmentDbRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка assessment из Supabase
  const loadAssessment = useCallback(async () => {
    if (!assessmentId) {
      setError('Нет assessmentId');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('pre_session_assessments')
        .select('id, status, chief_complaint, subjective_data, objective_data, structured_assessment, plan_data, trust_weights, overall_confidence, channels_used, sources')
        .eq('id', assessmentId)
        .maybeSingle();

      if (dbError) {
        console.error('[AssessmentPage] DB error:', dbError);
        setError('Ошибка загрузки данных');
        return;
      }

      if (!data) {
        setError('Assessment не найден');
        return;
      }

      setAssessment(data as AssessmentDbRow);
    } catch (err) {
      console.error('[AssessmentPage] Unexpected error:', err);
      setError('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  // Загрузка при монтировании
  useEffect(() => {
    void loadAssessment();
  }, [loadAssessment]);

  // Перезагрузка при событии assessment_updated
  useEffect(() => {
    if (lastEvent === 'assessment_updated' || lastEvent === 'plan_approved') {
      void loadAssessment();
    }
  }, [lastEvent, loadAssessment]);

  // Извлечение данных SOAP
  const subjective = assessment?.subjective_data ?? null;
  const objective = assessment?.objective_data ?? null;
  const assessmentResult = assessment?.structured_assessment ?? null;
  const planData = assessment?.plan_data ?? null;
  // Realtime trust имеет приоритет над статичными данными из БД
  const trustWeights = trustRealtime.lastUpdated
    ? trustRealtime.weights
    : (assessment?.trust_weights ?? { ai: 0.4, tests: 0.35, master: 0.25 });
  const overallConfidence = trustRealtime.lastUpdated
    ? trustRealtime.overallConfidence
    : (assessment?.overall_confidence ?? 0);
  const trustModifiers = trustRealtime.lastUpdated
    ? trustRealtime.appliedModifiers
    : ((assessment?.sources as Array<{ id?: string }> | null)
        ?.map((s) => s.id)
        .filter((id): id is string => !!id) ?? []);

  // Мержим ROM из Video AI realtime
  const mergedRomMeasurements: IRomMeasurement[] = [
    ...(objective?.romMeasurements ?? []),
    ...(videoAiResults?.romMeasurements?.map((m) => ({
      joint: m.joint,
      movement: m.movement,
      degrees: m.degrees,
      normalRange: { min: 0, max: 180 },
      source: 'video_ai' as const,
      confidence: m.confidence,
    })) ?? []),
  ];

  // Зоны для mini body map
  const painZonesForMap: IBodyMapZone[] = (subjective?.painZones ?? []).map((zone) => ({
    zoneId: zone.bodyArea,
    nameRu: zone.bodyArea,
    anatomicalName: zone.bodyArea,
    touchPoint: zone.coordinates ?? { x: 0, y: 0 },
    intensity: zone.intensity,
    painType: zone.painType,
  }));

  // ─── Рендер ───

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
    <div className="p-4 pb-24 min-h-screen">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">SOAP Результаты</h1>
        {assessment?.status && (
          <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">
            {assessment.status}
          </span>
        )}
      </div>

      {/* Каналы */}
      {assessment?.channels_used && assessment.channels_used.length > 0 && (
        <div className="flex gap-1.5 mb-4">
          {assessment.channels_used.map((ch) => (
            <span key={ch} className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
              {ch}
            </span>
          ))}
        </div>
      )}

      {/* Предупреждение о низкой уверенности */}
      {overallConfidence > 0 && overallConfidence < 40 && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <span className="text-red-400 text-lg leading-none mt-0.5">!</span>
          <div>
            <p className="text-sm font-medium text-red-400">Низкая уверенность AI</p>
            <p className="text-xs text-red-400/70 mt-0.5">Рекомендуется ручная проверка рекомендаций</p>
          </div>
        </div>
      )}

      {/* SOAP секции */}
      <div className="space-y-3">
        {/* ─── S: Subjective ─── */}
        <SOAPSection
          letter="S"
          title="Жалобы клиента"
          hasData={!!subjective?.chiefComplaint || (subjective?.painZones?.length ?? 0) > 0}
          defaultExpanded
        >
          {/* Жалоба */}
          {subjective?.chiefComplaint && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Основная жалоба</p>
              <p className="text-sm text-gray-200">{subjective.chiefComplaint}</p>
            </div>
          )}

          {/* Mini body map */}
          {painZonesForMap.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Карта боли</p>
              <div className="h-48 flex justify-center">
                <BodyMap
                  view="front"
                  zones={painZonesForMap}
                  onZoneClick={() => {}}
                />
              </div>
            </div>
          )}

          {/* Зоны боли список */}
          {(subjective?.painZones?.length ?? 0) > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Зоны боли</p>
              <div className="space-y-1.5">
                {subjective!.painZones.map((zone, i) => (
                  <div key={`${zone.bodyArea}-${i}`} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getIntensityColor(zone.intensity) }}
                    />
                    <span className="text-gray-300">{zone.bodyArea}</span>
                    <span className="text-gray-500">NRS {zone.intensity}/10</span>
                    {zone.painType && (
                      <span className="text-xs text-gray-600">
                        {PAIN_TYPE_LABELS[zone.painType] ?? zone.painType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Длительность и интенсивность */}
          <div className="flex gap-4 text-sm">
            {subjective?.painSeverity != null && (
              <div>
                <span className="text-gray-500">Интенсивность: </span>
                <span className="text-gray-300">{subjective.painSeverity}/10</span>
              </div>
            )}
            {subjective?.painDuration && (
              <div>
                <span className="text-gray-500">Длительность: </span>
                <span className="text-gray-300">
                  {DURATION_LABELS[subjective.painDuration] ?? subjective.painDuration}
                </span>
              </div>
            )}
          </div>

          {/* Анамнез */}
          {subjective?.medicalHistory && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Анамнез</p>
              <p className="text-sm text-gray-400">{subjective.medicalHistory}</p>
            </div>
          )}
        </SOAPSection>

        {/* ─── O: Objective ─── */}
        <SOAPSection
          letter="O"
          title="Объективные данные"
          hasData={mergedRomMeasurements.length > 0 || (objective?.photos?.length ?? 0) > 0}
          defaultExpanded
        >
          {/* ROM замеры */}
          {mergedRomMeasurements.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">ROM замеры</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left py-1 pr-2">Сустав</th>
                      <th className="text-left py-1 pr-2">Движение</th>
                      <th className="text-right py-1 pr-2">Градусы</th>
                      <th className="text-right py-1">Норма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedRomMeasurements.map((rom, i) => {
                      const inRange = rom.degrees >= rom.normalRange.min && rom.degrees <= rom.normalRange.max;
                      return (
                        <tr key={`${rom.joint}-${rom.movement}-${i}`} className="border-b border-gray-800">
                          <td className="py-1.5 pr-2 text-gray-300">{rom.joint}</td>
                          <td className="py-1.5 pr-2 text-gray-400">{rom.movement}</td>
                          <td className={`py-1.5 pr-2 text-right font-medium ${inRange ? 'text-green-400' : 'text-red-400'}`}>
                            {rom.degrees}°
                          </td>
                          <td className="py-1.5 text-right text-gray-500">
                            {rom.normalRange.min}°-{rom.normalRange.max}°
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Асимметрии (из Video AI realtime) */}
          {(videoAiResults?.asymmetries?.length ?? 0) > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Асимметрии</p>
              <div className="space-y-1">
                {videoAiResults!.asymmetries.map((asym, i) => (
                  <div key={`${asym.joint}-${i}`} className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1.5">
                    <span className="text-gray-300">{asym.joint}</span>
                    <div className="flex gap-3 text-gray-400">
                      <span>L: {asym.leftDegrees}°</span>
                      <span>R: {asym.rightDegrees}°</span>
                      <span className={Math.abs(asym.leftDegrees - asym.rightDegrees) > 10 ? 'text-yellow-400' : 'text-green-400'}>
                        Δ{Math.abs(asym.leftDegrees - asym.rightDegrees)}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Фото */}
          {(objective?.photos?.length ?? 0) > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Фото</p>
              <div className="grid grid-cols-3 gap-2">
                {objective!.photos.map((photo) => (
                  <div key={photo.viewAngle} className="aspect-[3/4] rounded-lg bg-gray-800 overflow-hidden">
                    {photo.fileUrl ? (
                      <img
                        src={photo.fileUrl}
                        alt={photo.viewAngle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                        {photo.viewAngle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Заметки мастера */}
          {objective?.practitionerNotes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Заметки мастера</p>
              <p className="text-sm text-gray-400">{objective.practitionerNotes}</p>
            </div>
          )}
        </SOAPSection>

        {/* ─── A: Assessment ─── */}
        <SOAPSection
          letter="A"
          title="AI анализ"
          hasData={!!assessmentResult?.text || !!assessmentResult?.structured}
        >
          {/* Trust Badge */}
          <div className="mb-3">
            <TrustBadge
              weights={trustWeights}
              overallConfidence={overallConfidence}
              appliedModifiers={trustModifiers}
              isLive={trustRealtime.isLive}
              lastUpdated={trustRealtime.lastUpdated}
            />
          </div>

          {/* Текст оценки */}
          {assessmentResult?.text && (
            <div className="mb-3">
              <p className="text-sm text-gray-300">{assessmentResult.text}</p>
            </div>
          )}

          {/* Структурированная оценка */}
          {assessmentResult?.structured && (
            <>
              {/* Основной диагноз */}
              {assessmentResult.structured.primaryDiagnosis && (
                <div className="mb-3 p-2 rounded bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-0.5">Предварительный диагноз</p>
                  <p className="text-sm text-gray-200">{assessmentResult.structured.primaryDiagnosis}</p>
                </div>
              )}

              {/* Проблемы */}
              {assessmentResult.structured.problems?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1.5">Проблемы</p>
                  <div className="space-y-1.5">
                    {assessmentResult.structured.problems.map((problem, i) => (
                      <div key={`problem-${i}`} className="text-sm bg-gray-800/50 rounded px-2 py-1.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-gray-200">{problem.name}</span>
                          <SeverityBadge severity={problem.severity} />
                        </div>
                        <p className="text-xs text-gray-500">{problem.bodyArea} — {problem.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Рекомендации */}
              {assessmentResult.structured.recommendations?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Рекомендации</p>
                  <ul className="space-y-0.5">
                    {assessmentResult.structured.recommendations.map((rec, i) => (
                      <li key={`rec-${i}`} className="text-sm text-gray-400 flex gap-1.5">
                        <span className="text-green-400">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Противопоказания */}
              {assessmentResult.structured.contraindications?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Противопоказания</p>
                  <ul className="space-y-0.5">
                    {assessmentResult.structured.contraindications.map((c, i) => (
                      <li key={`contra-${i}`} className="text-sm text-red-400 flex gap-1.5">
                        <span>!</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Красные флаги */}
          {(assessmentResult?.riskFlags?.length ?? 0) > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Красные флаги</p>
              {assessmentResult!.riskFlags.map((flag, i) => (
                <div key={`flag-${i}`} className="mb-1 p-2 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                  {flag}
                </div>
              ))}
            </div>
          )}

          {/* AI модель */}
          {assessmentResult?.llmModel && (
            <p className="text-xs text-gray-600">
              Модель: {assessmentResult.llmModel} | Confidence: {assessmentResult.aiConfidence}%
            </p>
          )}
        </SOAPSection>

        {/* ─── P: Plan ─── */}
        <SOAPSection
          letter="P"
          title="План лечения"
          hasData={!!planData?.treatmentPlan}
        >
          {planData?.treatmentPlan && (
            <>
              {/* Общая длительность */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">
                  Общая длительность: {planData.treatmentPlan.totalDuration} мин
                </span>
                {planData.approvedByPractitioner && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                    Одобрен
                  </span>
                )}
              </div>

              {/* Блоки плана */}
              <div className="space-y-2 mb-3">
                {planData.treatmentPlan.blocks.map((block) => (
                  <div key={`block-${block.phase}`} className="bg-gray-800/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-200">
                        Фаза {block.phase}: {block.name}
                      </span>
                      <span className="text-xs text-gray-500">{block.duration} мин</span>
                    </div>
                    {block.bodyArea && (
                      <span className="text-xs text-gray-500 block mb-1">Зона: {block.bodyArea}</span>
                    )}
                    {block.techniques.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {block.techniques.map((tech, i) => (
                          <span key={`tech-${i}`} className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              {planData.treatmentPlan.clientSummary && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Описание</p>
                  <p className="text-sm text-gray-400">{planData.treatmentPlan.clientSummary}</p>
                </div>
              )}
            </>
          )}

          {/* Противопоказания */}
          {(planData?.contraindications?.length ?? 0) > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Противопоказания</p>
              <div className="flex flex-wrap gap-1">
                {planData!.contraindications.map((c, i) => (
                  <span key={`pc-${i}`} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка редактирования плана */}
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (assessmentId) params.set('assessmentId', assessmentId);
              if (sessionSyncId) params.set('sessionSyncId', sessionSyncId);
              navigate(`/plan?${params.toString()}`);
            }}
            className="w-full py-2.5 rounded-lg bg-orange-600 text-white text-sm font-semibold active:bg-orange-700 transition-colors"
          >
            {planData?.treatmentPlan ? 'Редактировать план' : 'Создать план'}
          </button>
        </SOAPSection>
      </div>

      {/* Нижняя навигация */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full py-3 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium border border-gray-700"
        >
          Назад
        </button>
      </div>
    </div>
  );
}
