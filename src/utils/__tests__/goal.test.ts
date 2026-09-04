import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateGoalProgress,
  countCompletedExperiencesForYear,
  getSavedAnnualGoal,
  saveAnnualGoal,
  DEFAULT_ANNUAL_GOAL,
  CURRENT_CALENDAR_YEAR,
} from '../goal';

describe('Goal Calculations & Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('calculateGoalProgress', () => {
    it('calculates progress accurately for normal values', () => {
      const result = calculateGoalProgress(10, 25);
      expect(result.target).toBe(25);
      expect(result.completed).toBe(10);
      expect(result.percentage).toBe(40);
      expect(result.remaining).toBe(15);
      expect(result.isCompleted).toBe(false);
    });

    it('handles 0 completed items', () => {
      const result = calculateGoalProgress(0, 50);
      expect(result.percentage).toBe(0);
      expect(result.remaining).toBe(50);
      expect(result.isCompleted).toBe(false);
    });

    it('caps percentage at 100 and marks isCompleted when target reached', () => {
      const result = calculateGoalProgress(25, 25);
      expect(result.percentage).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.isCompleted).toBe(true);
    });

    it('caps percentage at 100 when target is exceeded', () => {
      const result = calculateGoalProgress(35, 25);
      expect(result.percentage).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.isCompleted).toBe(true);
    });

    it('handles negative or invalid target safely by falling back to minimum or default', () => {
      const result = calculateGoalProgress(5, 0);
      expect(result.target).toBe(DEFAULT_ANNUAL_GOAL);
      expect(result.percentage).toBe(20);
    });
  });

  describe('countCompletedExperiencesForYear', () => {
    const mockExperiences = [
      {
        status: 'Completed',
        sort_date: `${CURRENT_CALENDAR_YEAR}-02-15`,
        category_id: 'cat-books',
      },
      {
        status: 'Completed',
        sort_date: `${CURRENT_CALENDAR_YEAR}-05-20`,
        category_id: 'cat-movies',
      },
      {
        status: 'Currently Experiencing', // Should not be counted
        sort_date: `${CURRENT_CALENDAR_YEAR}-06-01`,
        category_id: 'cat-games',
      },
      {
        status: 'Want to Experience', // Should not be counted
        created_at: `${CURRENT_CALENDAR_YEAR}-01-10`,
        category_id: 'cat-books',
      },
      {
        status: 'Completed', // From previous year, should not be counted
        sort_date: `${CURRENT_CALENDAR_YEAR - 1}-11-05`,
        category_id: 'cat-books',
      },
      {
        status: 'Completed',
        completed_date: `${CURRENT_CALENDAR_YEAR}-08-12T14:30:00.000Z`,
        category_id: 'cat-movies',
      },
    ];

    it('counts completed experiences in the target year', () => {
      const count = countCompletedExperiencesForYear(mockExperiences, CURRENT_CALENDAR_YEAR);
      expect(count).toBe(3); // 2 with sort_date, 1 with completed_date
    });

    it('filters by category when specified', () => {
      const bookCount = countCompletedExperiencesForYear(mockExperiences, CURRENT_CALENDAR_YEAR, 'cat-books');
      expect(bookCount).toBe(1);

      const movieCount = countCompletedExperiencesForYear(mockExperiences, CURRENT_CALENDAR_YEAR, 'cat-movies');
      expect(movieCount).toBe(2);
    });

    it('returns 0 when no experiences match the year', () => {
      const futureCount = countCompletedExperiencesForYear(mockExperiences, CURRENT_CALENDAR_YEAR + 5);
      expect(futureCount).toBe(0);
    });
  });

  describe('Goal Target Persistence', () => {
    it('returns DEFAULT_ANNUAL_GOAL when nothing stored', () => {
      expect(getSavedAnnualGoal(2026)).toBe(DEFAULT_ANNUAL_GOAL);
    });

    it('saves and retrieves customized target', () => {
      saveAnnualGoal(50, 2026);
      expect(getSavedAnnualGoal(2026)).toBe(50);
      expect(localStorage.getItem('deony-goal-target-2026')).toBe('50');
    });
  });
});
