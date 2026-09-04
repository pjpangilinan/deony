export interface GoalProgress {
  target: number;
  completed: number;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
}

export const DEFAULT_ANNUAL_GOAL = 25;
export const CURRENT_CALENDAR_YEAR = new Date().getFullYear();

/**
 * Calculates progress metrics toward an annual experience goal.
 */
export function calculateGoalProgress(completedCount: number, target: number): GoalProgress {
  const safeTarget = Math.max(1, Math.floor(target || DEFAULT_ANNUAL_GOAL));
  const safeCompleted = Math.max(0, Math.floor(completedCount || 0));
  const percentage = Math.min(100, Math.round((safeCompleted / safeTarget) * 100));
  const remaining = Math.max(0, safeTarget - safeCompleted);
  const isCompleted = safeCompleted >= safeTarget;

  return {
    target: safeTarget,
    completed: safeCompleted,
    percentage,
    remaining,
    isCompleted,
  };
}

export interface MinimalExperienceForGoal {
  status: string;
  sort_date?: string;
  completed_date?: string;
  created_at?: string;
  category_id?: string;
}

/**
 * Filters and counts experiences completed within a specified calendar year.
 */
export function countCompletedExperiencesForYear(
  experiences: MinimalExperienceForGoal[],
  year: number = CURRENT_CALENDAR_YEAR,
  categoryId?: string
): number {
  const yearStr = year.toString();

  return experiences.filter((exp) => {
    // Only count completed experiences
    if (exp.status !== 'Completed') {
      return false;
    }

    // Optional category filter
    if (categoryId && categoryId !== 'all' && exp.category_id !== categoryId) {
      return false;
    }

    // Determine completion date (completed_date, sort_date, or created_at fallback)
    const dateStr = exp.completed_date || exp.sort_date || exp.created_at;
    if (!dateStr) return false;

    // Check if ISO string or YYYY-MM-DD starts with or includes year
    try {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.getFullYear() === year;
      }
    } catch {
      // Fallback string matching
    }
    return dateStr.startsWith(yearStr);
  }).length;
}

/**
 * Storage helpers for annual goal targets
 */
export function getSavedAnnualGoal(year: number = CURRENT_CALENDAR_YEAR): number {
  if (typeof window === 'undefined') return DEFAULT_ANNUAL_GOAL;
  try {
    const raw = localStorage.getItem(`deony-goal-target-${year}`);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // Storage access fallback
  }
  return DEFAULT_ANNUAL_GOAL;
}

export function saveAnnualGoal(target: number, year: number = CURRENT_CALENDAR_YEAR): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`deony-goal-target-${year}`, target.toString());
  } catch {
    // Storage access fallback
  }
}
