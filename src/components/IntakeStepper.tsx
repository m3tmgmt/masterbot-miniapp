// Stepper прогресс-бар для Intake формы (1/4 → 4/4)
// Показывает текущий шаг + названия шагов

interface IntakeStepperProps {
  /** Текущий шаг (1-based) */
  currentStep: number;
  /** Общее количество шагов */
  totalSteps: number;
  /** Названия шагов */
  labels: string[];
}

export function IntakeStepper({ currentStep, totalSteps, labels }: IntakeStepperProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-5">
      {/* Прогресс-бар */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Шаги */}
      <div className="flex justify-between">
        {labels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div
              key={label}
              className={`flex items-center gap-1 text-xs ${
                isActive
                  ? 'text-blue-400 font-medium'
                  : isCompleted
                    ? 'text-green-500'
                    : 'text-gray-600'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isCompleted
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-500'
              }`}>
                {isCompleted ? '\u2713' : stepNum}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
