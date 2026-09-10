/**
 * Username rules:
 * - 3 to 25 characters
 * - lowercase letters and digits only, plus
 * - at most one "_" and at most one "." total in the whole string
 */
export function isValidUsername(value: string): boolean {
  if (value.length < 3 || value.length > 25) return false;
  if (!/^[a-z0-9._]+$/.test(value)) return false;

  const underscoreCount = (value.match(/_/g) || []).length;
  const periodCount = (value.match(/\./g) || []).length;

  return underscoreCount <= 1 && periodCount <= 1;
}

export const USERNAME_RULES_HELP =
  "3-25 characters, lowercase letters and numbers, with at most one underscore and one period allowed";
