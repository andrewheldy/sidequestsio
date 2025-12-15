import { MapPin, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';
import { Badge } from '@/components/ui/badge';

interface QuestCardProps {
  title: string;
  location: string;
  category: string;
  duration: string;
  participants: number;
  image: string;
  delay?: number;
  className?: string;
}

export function QuestCard({
  title,
  location,
  category,
  duration,
  participants,
  image,
  delay = 0,
  className,
}: QuestCardProps) {
  return (
    <AnimatedSection direction="up" delay={delay}>
      <div
        className={cn(
          'glass-card overflow-hidden hover-lift group cursor-pointer',
          className
        )}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
            {category}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-poppins font-semibold text-lg text-foreground mb-2 line-clamp-1">
            {title}
          </h3>

          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="line-clamp-1">{location}</span>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{participants} explorers</span>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default QuestCard;