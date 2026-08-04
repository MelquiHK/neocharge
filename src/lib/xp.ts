export function getGoalProgressPercent(currentXP: number, goalXP: number): number {
  if (goalXP <= 0) {
    return 0;
  }

  const progress = Math.round((currentXP / goalXP) * 100);
  return Math.min(100, Math.max(0, progress));
}
