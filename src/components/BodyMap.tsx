// SVG интерактивная карта тела (front + back view)
// Touch/click → выбор зоны боли с цветовым градиентом по интенсивности
// Inline SVG для обработки touch/click событий

import type { IBodyMapZone } from '../types/index.ts';
import {
  BODY_ZONES_FRONT,
  BODY_ZONES_BACK,
  BODY_SILHOUETTE_FRONT,
  BODY_SILHOUETTE_BACK,
  getIntensityColor,
  getIntensityOpacity,
} from '../data/body-zones.ts';

interface BodyMapProps {
  /** Вид (спереди / сзади) */
  view: 'front' | 'back';
  /** Отмеченные зоны с интенсивностью */
  zones: IBodyMapZone[];
  /** Обработчик клика по зоне */
  onZoneClick: (zoneId: string) => void;
  /** ID выбранной зоны (пульсирующая анимация) */
  selectedZoneId?: string;
}

export function BodyMap({ view, zones, onZoneClick, selectedZoneId }: BodyMapProps) {
  const definitions = view === 'front' ? BODY_ZONES_FRONT : BODY_ZONES_BACK;
  const silhouette = view === 'front' ? BODY_SILHOUETTE_FRONT : BODY_SILHOUETTE_BACK;

  // Быстрый lookup интенсивности по zoneId
  const zoneIntensityMap = new Map(zones.map(z => [z.zoneId, z.intensity]));

  return (
    <svg
      viewBox="0 0 200 400"
      className="w-full max-w-xs mx-auto select-none"
      role="img"
      aria-label={view === 'front' ? 'Карта тела спереди' : 'Карта тела сзади'}
    >
      {/* Фоновый силуэт тела */}
      <path
        d={silhouette}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.2"
      />

      {/* Интерактивные зоны */}
      {definitions.map((zone) => {
        const intensity = zoneIntensityMap.get(zone.id) ?? 0;
        const isSelected = zone.id === selectedZoneId;
        const isMarked = intensity > 0;

        return (
          <path
            key={zone.id}
            d={zone.pathData}
            data-zone-id={zone.id}
            fill={isMarked ? getIntensityColor(intensity) : 'transparent'}
            fillOpacity={isMarked ? getIntensityOpacity(intensity) : 0}
            stroke={
              isSelected
                ? '#3b82f6'
                : isMarked
                  ? getIntensityColor(intensity)
                  : 'rgba(255,255,255,0.12)'
            }
            strokeWidth={isSelected ? 2 : 1}
            className={[
              'cursor-pointer transition-all duration-200',
              isSelected ? 'animate-pulse' : '',
            ].join(' ')}
            onClick={() => onZoneClick(zone.id)}
            onTouchEnd={(e) => {
              e.preventDefault(); // Предотвратить ghost click на мобильных
              onZoneClick(zone.id);
            }}
            role="button"
            aria-label={zone.nameRu}
          />
        );
      })}

      {/* Метка вида */}
      <text
        x="100"
        y="396"
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        opacity="0.4"
      >
        {view === 'front' ? 'Спереди' : 'Сзади'}
      </text>
    </svg>
  );
}
