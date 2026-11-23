/** Cards stay in the trash this long; a nightly job removes them afterwards. */
export const TRASH_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days a card trashed at `deletedAt` has left before it is removed for good. */
export function trashDaysLeft(deletedAt: string, now: Date = new Date()): number {
  const passed = Math.floor((now.getTime() - new Date(deletedAt).getTime()) / DAY_MS);
  return Math.min(Math.max(TRASH_DAYS - passed, 0), TRASH_DAYS);
}
