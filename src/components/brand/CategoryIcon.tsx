import { cn } from '@/lib/utils';
import { getCategoryGlyph } from '@/lib/mapbox';

/**
 * The quest-category glyph, drawn from the same geometry the map markers use
 * (src/lib/mapbox.ts) so a category looks identical on a pin, a card and a
 * popup. The markers are raw DOM for Mapbox, so the shared source is an SVG
 * string — the values are module constants in this repo, never user input.
 *
 * Replaces the category emoji the pre-migration UI used as an icon.
 */
export function CategoryIcon({
  category,
  className,
  strokeWidth = 1.8,
}: {
  category: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('h-5 w-5', className)}
      dangerouslySetInnerHTML={{ __html: getCategoryGlyph(category) }}
    />
  );
}

export default CategoryIcon;
