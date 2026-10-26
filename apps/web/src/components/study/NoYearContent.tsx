import { Notice } from '../ui';

/** Shown when a student's year level has no curriculum yet (we only fall back one year either side). */
export function NoYearContent({ yearLevel }: { yearLevel: number | undefined }) {
  return (
    <Notice tone="info" title={`Year ${yearLevel ?? '?'} isn’t in Study Helper yet`}>
      We’re adding more year levels. If your year level is wrong, a linked parent can change it from their Family page (your name → Account).
    </Notice>
  );
}
