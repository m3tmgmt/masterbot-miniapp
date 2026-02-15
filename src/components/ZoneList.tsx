// Список выбранных зон боли с цветовыми индикаторами и кнопками удаления

import type { IBodyMapZone } from '../types/index.ts';
import { BODY_ZONE_MAP, getIntensityColor } from '../data/body-zones.ts';

interface ZoneListProps {
  /** Отмеченные зоны */
  zones: IBodyMapZone[];
  /** Удаление зоны */
  onRemove: (zoneId: string) => void;
  /** Выбор зоны для редактирования */
  onSelect: (zoneId: string) => void;
  /** Текущая выбранная зона */
  selectedZoneId?: string;
}

export function ZoneList({ zones, onRemove, onSelect, selectedZoneId }: ZoneListProps) {
  if (zones.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-2">
        Нажмите на область тела, чтобы отметить боль
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {zones.map((zone) => {
        const def = BODY_ZONE_MAP.get(zone.zoneId);
        const isSelected = zone.zoneId === selectedZoneId;

        return (
          <div
            key={zone.zoneId}
            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${
              isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700'
            }`}
            onClick={() => onSelect(zone.zoneId)}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: getIntensityColor(zone.intensity) }}
              />
              <span className="text-sm">{def?.nameRu ?? zone.zoneId}</span>
              <span className="text-xs text-gray-500">{zone.intensity}/10</span>
            </div>
            <button
              type="button"
              className="text-gray-500 hover:text-red-400 p-1 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(zone.zoneId);
              }}
              aria-label={`Удалить ${def?.nameRu ?? zone.zoneId}`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
