import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/brand/CategoryIcon';

/**
 * Quest photo that never renders as a broken <img>: when the quest has no
 * image URL (every quest imported before its hero asset is approved) or the
 * URL fails to load, it falls back to a Midnight Navy surface anchored by the
 * quest's category glyph.
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
        className="flex h-full w-full items-center justify-center bg-navy"
      >
        <CategoryIcon category={category} className="h-10 w-10 text-reward/70" strokeWidth={1.4} />
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
