/**
 * Rating Utility
 * Normalizes and formats ratings to a consistent 5-star scale.
 * Supports both 10-point scale stored in backend (e.g., 8/10 -> 4.0/5)
 * and direct 5-point scale inputs (e.g., 4/5 -> 4.0/5).
 */

export const normalizeRatingTo5 = (rating?: number | null): number | null => {
  if (rating === null || rating === undefined) return null;
  const num = Number(rating);
  if (isNaN(num)) return null;
  // If stored on a 10-point scale (> 5), map to 5-star scale
  const normalized = num > 5 ? num / 2 : num;
  return Math.min(5, Math.max(0, normalized));
};

export const formatRating5 = (rating?: number | null): string => {
  const norm = normalizeRatingTo5(rating);
  if (norm === null) return 'Unrated';
  return norm % 1 === 0 ? norm.toString() : norm.toFixed(1);
};
