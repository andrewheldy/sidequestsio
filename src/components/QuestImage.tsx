import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getCategoryEmoji } from '@/lib/mapbox';

/**
 * Quest photo that never renders as a broken <img>: when the quest has no
 * image URL (every quest imported before its hero asset is approved) or the
 * URL fails to load, it falls back to the same gradient treatment as the
 * QuestHero fallback, anchored by the category emoji.
 */
export function QuestImage({
  src,
  alt,
  category,
  className,
}: {
  src?: string | null;
  alt: string;
  category: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/20"
      >
        <span className="text-4xl opacity-80" aria-hidden="true">
          {getCategoryEmoji(category)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}

export default QuestImage;
