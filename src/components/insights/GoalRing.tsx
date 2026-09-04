import { useState } from 'react';
import {
  calculateGoalProgress,
  countCompletedExperiencesForYear,
  getSavedAnnualGoal,
  saveAnnualGoal,
  CURRENT_CALENDAR_YEAR,
} from '../../utils/goal';

interface CategoryItem {
  id: string;
  name: string;
}

interface GoalRingProps {
  experiences: Array<{
    status: string;
    sort_date?: string;
    completed_date?: string;
    created_at?: string;
    category_id?: string;
  }>;
  categories?: CategoryItem[];
}

export function GoalRing({ experiences, categories = [] }: GoalRingProps) {
  const year = CURRENT_CALENDAR_YEAR;
  const [target, setTarget] = useState<number>(() => getSavedAnnualGoal(year));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>(target.toString());

  const completedCount = countCompletedExperiencesForYear(experiences, year, selectedCategory);
  const progress = calculateGoalProgress(completedCount, target);

  // SVG dimensions
  const radius = 68;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  const handleSaveTarget = (newTarget: number) => {
    if (newTarget > 0) {
      setTarget(newTarget);
      saveAnnualGoal(newTarget, year);
      setIsEditingGoal(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customInput, 10);
    if (!isNaN(val) && val > 0) {
      handleSaveTarget(val);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg md:p-xl shadow-xs">
      <div className="flex flex-col md:flex-row items-center gap-xl">
        {/* SVG Circular Progress Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
            aria-label={`Annual Goal: ${progress.completed} of ${progress.target} completed (${progress.percentage}%)`}
          >
            {/* Background Track */}
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="text-tertiary/25"
            />
            {/* Animated Progress Arc */}
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="text-primary transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Metric */}
          <div className="absolute flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span className="font-display text-3xl font-bold text-primary leading-none">
              {progress.completed}
            </span>
            <span className="font-caption text-xs text-secondary mt-1 font-medium">
              of {progress.target}
            </span>
            <span className="font-label-md text-[10px] uppercase tracking-wider text-primary/80 font-bold mt-0.5">
              {progress.percentage}%
            </span>
          </div>
        </div>

        {/* Informative Content & Target Controls */}
        <div className="flex-1 space-y-md text-center md:text-left w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="material-symbols-outlined text-primary text-xl">track_changes</span>
                <h3 className="font-headline-md text-headline-md text-primary m-0">
                  {year} Annual Challenge
                </h3>
              </div>
              <p className="font-body-md text-body-md text-secondary mt-1 mb-0">
                A calm, non-gamified milestone for intentional experiences logged this year.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomInput(target.toString());
                setIsEditingGoal(!isEditingGoal);
              }}
              className="px-md py-1.5 rounded-lg border border-tertiary/40 text-xs font-label-md text-primary hover:bg-surface-variant transition-colors cursor-pointer self-center md:self-auto shrink-0 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>{isEditingGoal ? 'Close' : 'Adjust Goal'}</span>
            </button>
          </div>

          {/* Edit Target Form Drawer */}
          {isEditingGoal && (
            <div className="bg-surface-variant/40 border border-tertiary/30 rounded-lg p-md space-y-sm animate-fade-in">
              <div className="text-xs font-medium text-on-surface">Set your target for {year}:</div>
              <div className="flex flex-wrap items-center gap-xs">
                {[10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSaveTarget(preset)}
                    className={`px-sm py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                      target === preset
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface border border-tertiary/40 text-secondary hover:text-primary hover:bg-surface'
                    }`}
                  >
                    {preset} Experiences
                  </button>
                ))}
              </div>

              <form onSubmit={handleCustomSubmit} className="flex items-center gap-xs pt-xs">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="w-24 px-sm py-1 rounded text-xs border border-tertiary bg-surface text-on-surface focus:border-primary focus:outline-none"
                  placeholder="Custom"
                />
                <button
                  type="submit"
                  className="px-md py-1 rounded text-xs font-medium bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors cursor-pointer"
                >
                  Save Target
                </button>
              </form>
            </div>
          )}

          {/* Sanctuary Reflection Message */}
          <div className="text-sm text-on-surface-variant bg-surface-variant/30 rounded-lg px-md py-sm border border-tertiary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                {progress.isCompleted ? 'verified' : 'spa'}
              </span>
              <span className="font-body-sm text-xs">
                {progress.isCompleted
                  ? `Goal achieved! You've logged ${progress.completed} experiences in ${year}.`
                  : progress.completed > 0
                  ? `${progress.remaining} more experience${progress.remaining === 1 ? '' : 's'} to reach your ${target} goal.`
                  : `Begin your ${year} journey by logging your completed media reflections.`}
              </span>
            </div>

            {/* Optional category filter dropdown */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-surface border border-tertiary/30 rounded px-2 py-1 text-secondary cursor-pointer focus:outline-none"
                aria-label="Filter goal by category"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
