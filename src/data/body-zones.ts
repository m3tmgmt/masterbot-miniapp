// Определения зон тела для SVG Body Map (front + back)
// Каждая зона = IBodyZoneDefinition с SVG path data
// ViewBox: 0 0 200 400

import type { IBodyZoneDefinition } from '../types/index.ts';

// ═══════════════════════════════════════════════════════════════
// УТИЛИТЫ — цвет и прозрачность по интенсивности боли
// ═══════════════════════════════════════════════════════════════

/** Цвет по интенсивности боли (NRS 0-10) */
export function getIntensityColor(intensity: number): string {
  if (intensity <= 0) return 'transparent';
  if (intensity <= 3) return '#22c55e'; // зелёный
  if (intensity <= 6) return '#eab308'; // жёлтый
  if (intensity <= 9) return '#f97316'; // оранжевый
  return '#ef4444'; // красный (10)
}

/** Прозрачность заливки по интенсивности */
export function getIntensityOpacity(intensity: number): number {
  if (intensity <= 0) return 0;
  return 0.25 + (intensity / 10) * 0.55; // 0.25 → 0.8
}

// ═══════════════════════════════════════════════════════════════
// СИЛУЭТ — контурный путь тела (не интерактивный, фон)
// ═══════════════════════════════════════════════════════════════

/** Контур тела спереди (фоновый силуэт) */
export const BODY_SILHOUETTE_FRONT =
  // Голова
  'M100,8 C114,8 122,18 122,32 C122,44 116,52 110,56 ' +
  // Шея → плечо правое
  'L108,62 L108,68 L140,76 L156,82 L160,90 ' +
  // Рука правая
  'L162,130 L160,160 L156,178 L148,178 L150,160 L152,130 L148,92 ' +
  // Торс правый → бедро
  'L136,94 L134,140 L136,180 L138,200 L136,210 ' +
  // Нога правая
  'L130,240 L128,280 L130,310 L132,340 L134,370 L138,385 L120,385 L122,370 ' +
  'L118,340 L116,310 L112,280 L108,250 L106,220 ' +
  // Центр → нога левая
  'L100,210 L94,220 L92,250 L88,280 L84,310 L82,340 L78,370 L80,385 L62,385 ' +
  'L66,370 L68,340 L70,310 L72,280 L70,240 L64,210 ' +
  // Бедро → торс левый
  'L62,200 L64,180 L66,140 L64,94 L52,92 ' +
  // Рука левая
  'L48,130 L50,160 L52,178 L44,178 L40,160 L38,130 L40,90 ' +
  // Плечо левое → шея → голова
  'L44,82 L60,76 L92,68 L92,62 L90,56 C84,52 78,44 78,32 C78,18 86,8 100,8 Z';

/** Контур тела сзади (фоновый силуэт) */
export const BODY_SILHOUETTE_BACK = BODY_SILHOUETTE_FRONT; // Симметричный контур

// ═══════════════════════════════════════════════════════════════
// ЗОНЫ — ФРОНТАЛЬНЫЙ ВИД (16 зон)
// ═══════════════════════════════════════════════════════════════

export const BODY_ZONES_FRONT: IBodyZoneDefinition[] = [
  {
    id: 'head',
    nameRu: 'Голова',
    anatomicalName: 'Cranium',
    pathData: 'M100,10 C113,10 120,19 120,32 C120,43 114,51 108,55 L92,55 C86,51 80,43 80,32 C80,19 87,10 100,10 Z',
    center: { x: 100, y: 33 },
    views: ['front'],
    relatedAnatomy: ['temporal', 'frontal', 'parietal'],
  },
  {
    id: 'neck_front',
    nameRu: 'Шея',
    anatomicalName: 'Anterior cervical',
    pathData: 'M92,55 L108,55 L109,68 L91,68 Z',
    center: { x: 100, y: 62 },
    views: ['front'],
    relatedAnatomy: ['sternocleidomastoid', 'scalenes'],
  },
  {
    id: 'shoulder_left',
    nameRu: 'Плечо левое',
    anatomicalName: 'Left shoulder (deltoid)',
    pathData: 'M91,68 L66,76 L56,84 L52,92 L64,92 L68,80 L91,74 Z',
    center: { x: 72, y: 80 },
    views: ['front'],
    relatedAnatomy: ['deltoid', 'rotator_cuff', 'acromioclavicular'],
  },
  {
    id: 'shoulder_right',
    nameRu: 'Плечо правое',
    anatomicalName: 'Right shoulder (deltoid)',
    pathData: 'M109,68 L134,76 L144,84 L148,92 L136,92 L132,80 L109,74 Z',
    center: { x: 128, y: 80 },
    views: ['front'],
    relatedAnatomy: ['deltoid', 'rotator_cuff', 'acromioclavicular'],
  },
  {
    id: 'chest_left',
    nameRu: 'Грудь левая',
    anatomicalName: 'Left pectoralis',
    pathData: 'M68,80 L91,74 L100,74 L100,130 L66,130 L64,92 L68,80 Z',
    center: { x: 82, y: 102 },
    views: ['front'],
    relatedAnatomy: ['pectoralis_major', 'intercostals'],
  },
  {
    id: 'chest_right',
    nameRu: 'Грудь правая',
    anatomicalName: 'Right pectoralis',
    pathData: 'M132,80 L109,74 L100,74 L100,130 L134,130 L136,92 L132,80 Z',
    center: { x: 118, y: 102 },
    views: ['front'],
    relatedAnatomy: ['pectoralis_major', 'intercostals'],
  },
  {
    id: 'abdomen_upper',
    nameRu: 'Живот верхний',
    anatomicalName: 'Upper abdomen (epigastric)',
    pathData: 'M66,130 L134,130 L134,165 L66,165 Z',
    center: { x: 100, y: 148 },
    views: ['front'],
    relatedAnatomy: ['rectus_abdominis', 'obliques'],
  },
  {
    id: 'abdomen_lower',
    nameRu: 'Живот нижний',
    anatomicalName: 'Lower abdomen (hypogastric)',
    pathData: 'M66,165 L134,165 L136,200 L64,200 Z',
    center: { x: 100, y: 182 },
    views: ['front'],
    relatedAnatomy: ['rectus_abdominis', 'iliopsoas'],
  },
  {
    id: 'upper_arm_left',
    nameRu: 'Рука левая (плечо)',
    anatomicalName: 'Left upper arm (biceps/triceps)',
    pathData: 'M52,92 L64,92 L60,130 L56,150 L44,150 L42,130 L48,92 Z',
    center: { x: 53, y: 120 },
    views: ['front'],
    relatedAnatomy: ['biceps', 'triceps', 'brachialis'],
  },
  {
    id: 'upper_arm_right',
    nameRu: 'Рука правая (плечо)',
    anatomicalName: 'Right upper arm (biceps/triceps)',
    pathData: 'M148,92 L136,92 L140,130 L144,150 L156,150 L158,130 L152,92 Z',
    center: { x: 147, y: 120 },
    views: ['front'],
    relatedAnatomy: ['biceps', 'triceps', 'brachialis'],
  },
  {
    id: 'forearm_left',
    nameRu: 'Предплечье левое',
    anatomicalName: 'Left forearm',
    pathData: 'M44,150 L56,150 L54,175 L50,178 L40,178 L38,175 Z',
    center: { x: 48, y: 165 },
    views: ['front'],
    relatedAnatomy: ['flexors', 'extensors', 'brachioradialis'],
  },
  {
    id: 'forearm_right',
    nameRu: 'Предплечье правое',
    anatomicalName: 'Right forearm',
    pathData: 'M156,150 L144,150 L146,175 L150,178 L160,178 L162,175 Z',
    center: { x: 152, y: 165 },
    views: ['front'],
    relatedAnatomy: ['flexors', 'extensors', 'brachioradialis'],
  },
  {
    id: 'thigh_left',
    nameRu: 'Бедро левое',
    anatomicalName: 'Left thigh (quadriceps)',
    pathData: 'M64,200 L100,208 L100,296 L88,296 L80,280 L72,250 L64,220 Z',
    center: { x: 82, y: 248 },
    views: ['front'],
    relatedAnatomy: ['quadriceps', 'adductors', 'IT_band'],
  },
  {
    id: 'thigh_right',
    nameRu: 'Бедро правое',
    anatomicalName: 'Right thigh (quadriceps)',
    pathData: 'M136,200 L100,208 L100,296 L112,296 L120,280 L128,250 L136,220 Z',
    center: { x: 118, y: 248 },
    views: ['front'],
    relatedAnatomy: ['quadriceps', 'adductors', 'IT_band'],
  },
  {
    id: 'knee_left',
    nameRu: 'Колено левое',
    anatomicalName: 'Left knee',
    pathData: 'M80,296 L100,296 L100,318 L78,318 Z',
    center: { x: 90, y: 307 },
    views: ['front'],
    relatedAnatomy: ['patella', 'meniscus', 'collateral_ligaments'],
  },
  {
    id: 'knee_right',
    nameRu: 'Колено правое',
    anatomicalName: 'Right knee',
    pathData: 'M100,296 L120,296 L122,318 L100,318 Z',
    center: { x: 110, y: 307 },
    views: ['front'],
    relatedAnatomy: ['patella', 'meniscus', 'collateral_ligaments'],
  },
  {
    id: 'shin_left',
    nameRu: 'Голень левая',
    anatomicalName: 'Left shin (tibialis anterior)',
    pathData: 'M78,318 L100,318 L98,370 L96,385 L78,385 L76,370 L74,340 Z',
    center: { x: 88, y: 352 },
    views: ['front'],
    relatedAnatomy: ['tibialis_anterior', 'peroneus'],
  },
  {
    id: 'shin_right',
    nameRu: 'Голень правая',
    anatomicalName: 'Right shin (tibialis anterior)',
    pathData: 'M100,318 L122,318 L126,340 L124,370 L122,385 L104,385 L102,370 Z',
    center: { x: 112, y: 352 },
    views: ['front'],
    relatedAnatomy: ['tibialis_anterior', 'peroneus'],
  },
];

// ═══════════════════════════════════════════════════════════════
// ЗОНЫ — ВИД СЗАДИ (15 зон)
// ═══════════════════════════════════════════════════════════════

export const BODY_ZONES_BACK: IBodyZoneDefinition[] = [
  {
    id: 'neck_back',
    nameRu: 'Шея (задняя)',
    anatomicalName: 'Posterior cervical',
    pathData: 'M92,55 L108,55 L110,72 L90,72 Z',
    center: { x: 100, y: 63 },
    views: ['back'],
    relatedAnatomy: ['trapezius_upper', 'levator_scapulae', 'suboccipital'],
  },
  {
    id: 'trapezius_left',
    nameRu: 'Трапеция левая',
    anatomicalName: 'Left trapezius',
    pathData: 'M90,72 L100,72 L100,94 L76,94 L64,84 L74,76 Z',
    center: { x: 84, y: 83 },
    views: ['back'],
    relatedAnatomy: ['trapezius', 'rhomboids'],
  },
  {
    id: 'trapezius_right',
    nameRu: 'Трапеция правая',
    anatomicalName: 'Right trapezius',
    pathData: 'M110,72 L100,72 L100,94 L124,94 L136,84 L126,76 Z',
    center: { x: 116, y: 83 },
    views: ['back'],
    relatedAnatomy: ['trapezius', 'rhomboids'],
  },
  {
    id: 'scapula_left',
    nameRu: 'Лопатка левая',
    anatomicalName: 'Left scapula',
    pathData: 'M76,94 L100,94 L100,140 L66,140 L64,110 Z',
    center: { x: 82, y: 117 },
    views: ['back'],
    relatedAnatomy: ['infraspinatus', 'teres_major', 'rhomboids'],
  },
  {
    id: 'scapula_right',
    nameRu: 'Лопатка правая',
    anatomicalName: 'Right scapula',
    pathData: 'M124,94 L100,94 L100,140 L134,140 L136,110 Z',
    center: { x: 118, y: 117 },
    views: ['back'],
    relatedAnatomy: ['infraspinatus', 'teres_major', 'rhomboids'],
  },
  {
    id: 'spine_upper',
    nameRu: 'Позвоночник верхний',
    anatomicalName: 'Thoracic spine (upper)',
    pathData: 'M95,72 L105,72 L105,110 L95,110 Z',
    center: { x: 100, y: 91 },
    views: ['back'],
    relatedAnatomy: ['thoracic_vertebrae_T1_T4', 'spinous_processes'],
  },
  {
    id: 'spine_mid',
    nameRu: 'Позвоночник средний',
    anatomicalName: 'Thoracic spine (mid)',
    pathData: 'M95,110 L105,110 L105,150 L95,150 Z',
    center: { x: 100, y: 130 },
    views: ['back'],
    relatedAnatomy: ['thoracic_vertebrae_T5_T8', 'erector_spinae'],
  },
  {
    id: 'spine_lower',
    nameRu: 'Позвоночник нижний',
    anatomicalName: 'Thoracic spine (lower)',
    pathData: 'M95,150 L105,150 L105,180 L95,180 Z',
    center: { x: 100, y: 165 },
    views: ['back'],
    relatedAnatomy: ['thoracic_vertebrae_T9_T12', 'erector_spinae'],
  },
  {
    id: 'lower_back',
    nameRu: 'Поясница',
    anatomicalName: 'Lumbar spine',
    pathData: 'M70,140 L95,140 L95,200 L64,200 Z',
    center: { x: 80, y: 170 },
    views: ['back'],
    relatedAnatomy: ['lumbar_vertebrae', 'quadratus_lumborum', 'erector_spinae'],
  },
  {
    id: 'lower_back_right',
    nameRu: 'Поясница правая',
    anatomicalName: 'Right lumbar',
    pathData: 'M105,140 L130,140 L136,200 L105,200 Z',
    center: { x: 120, y: 170 },
    views: ['back'],
    relatedAnatomy: ['lumbar_vertebrae', 'quadratus_lumborum', 'erector_spinae'],
  },
  {
    id: 'glute_left',
    nameRu: 'Ягодица левая',
    anatomicalName: 'Left gluteus',
    pathData: 'M64,200 L100,200 L100,230 L70,240 L62,220 Z',
    center: { x: 80, y: 218 },
    views: ['back'],
    relatedAnatomy: ['gluteus_maximus', 'gluteus_medius', 'piriformis'],
  },
  {
    id: 'glute_right',
    nameRu: 'Ягодица правая',
    anatomicalName: 'Right gluteus',
    pathData: 'M136,200 L100,200 L100,230 L130,240 L138,220 Z',
    center: { x: 120, y: 218 },
    views: ['back'],
    relatedAnatomy: ['gluteus_maximus', 'gluteus_medius', 'piriformis'],
  },
  {
    id: 'hamstring_left',
    nameRu: 'Бедро заднее левое',
    anatomicalName: 'Left hamstring',
    pathData: 'M70,240 L100,230 L100,300 L82,300 L76,270 Z',
    center: { x: 86, y: 265 },
    views: ['back'],
    relatedAnatomy: ['biceps_femoris', 'semitendinosus', 'semimembranosus'],
  },
  {
    id: 'hamstring_right',
    nameRu: 'Бедро заднее правое',
    anatomicalName: 'Right hamstring',
    pathData: 'M130,240 L100,230 L100,300 L118,300 L124,270 Z',
    center: { x: 114, y: 265 },
    views: ['back'],
    relatedAnatomy: ['biceps_femoris', 'semitendinosus', 'semimembranosus'],
  },
  {
    id: 'calf_left',
    nameRu: 'Икра левая',
    anatomicalName: 'Left calf (gastrocnemius)',
    pathData: 'M82,300 L100,300 L98,370 L96,385 L78,385 L76,370 L78,330 Z',
    center: { x: 88, y: 342 },
    views: ['back'],
    relatedAnatomy: ['gastrocnemius', 'soleus', 'achilles_tendon'],
  },
  {
    id: 'calf_right',
    nameRu: 'Икра правая',
    anatomicalName: 'Right calf (gastrocnemius)',
    pathData: 'M100,300 L118,300 L122,330 L124,370 L122,385 L104,385 L102,370 Z',
    center: { x: 112, y: 342 },
    views: ['back'],
    relatedAnatomy: ['gastrocnemius', 'soleus', 'achilles_tendon'],
  },
];

// ═══════════════════════════════════════════════════════════════
// LOOKUP MAP — быстрый поиск зоны по ID
// ═══════════════════════════════════════════════════════════════

/** Все зоны (front + back) для O(1) lookup */
export const BODY_ZONE_MAP: ReadonlyMap<string, IBodyZoneDefinition> = new Map(
  [...BODY_ZONES_FRONT, ...BODY_ZONES_BACK].map(z => [z.id, z])
);
