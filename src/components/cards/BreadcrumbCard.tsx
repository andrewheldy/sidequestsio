import { Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';

interface BreadcrumbCardProps {
  author: string;
  location: string;
  message: string;
  image?: string;
  delay?: number;
  className?: string;
}

export function CommunityNoteCard({
  author,
  location,
  message,
  image,
  delay = 0,
  className,
}: BreadcrumbCardProps) {
  return (
    <AnimatedSection direction="up" delay={delay}>
      <div
        className={cn(
          'glass-card p-5 hover-lift group relative overflow-hidden',
          className
        )}
      >
        {/* Quote icon */}
        <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />

        {/* Optional image */}
        {image && (
          <div className="relative h-32 -mx-5 -mt-5 mb-4 overflow-hidden">
            <img
              src={image}
              alt={`Photo from ${location}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}

        {/* Message */}
        <p className="text-foreground text-sm leading-relaxed mb-4 italic">
          "{message}"
        </p>

        {/* Author info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {author.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{author}</p>
            <p className="text-xs text-muted-foreground">{location}</p>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default CommunityNoteCard;