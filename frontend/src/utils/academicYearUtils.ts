/**
 * Standardizes academic year format and provides dynamic fallbacks.
 * Format used: YYYY-YY (e.g., 2024-25)
 */

/**
 * Normalizes academic year to YYYY-YY format.
 * Example: "2024-2025" -> "2024-25", "2024-25" -> "2024-25"
 */
export const normalizeAcademicYear = (year: string): string => {
  if (!year) return '';
  const parts = String(year).trim().split('-');
  if (parts.length === 2 && parts[1].length === 4) {
    return `${parts[0]}-${parts[1].slice(-2)}`;
  }
  return parts.join('-');
};

/**
 * Gets a dynamic default academic year based on the current date.
 * Uses an April-March academic cycle.
 * Example: In May 2026, returns "2026-27". In Jan 2026, returns "2025-26".
 */
export const getDynamicFallbackYear = (): string => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=April)
  const startYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
};

/**
 * Robustly determines the academic year to use, prioritizing provided values
 * and falling back to a dynamic calculation.
 */
export const getAcademicYearToUse = (
  viewingYear?: string, 
  currentYear?: string, 
  fallback?: string
): string => {
  const year = viewingYear || currentYear || fallback || getDynamicFallbackYear();
  return normalizeAcademicYear(year);
};
