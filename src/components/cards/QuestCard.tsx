import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';
import { Badge } from '@/components/ui/badge';

interface QuestCardProps {
  title: string;
  location: string;
  category: string;
  duration?: string;
  participants?: number;
  /** Quest concept / description (replaces duration+participants when provided) */
  concept?: string;
  /** XP earned on completion */
  xp?: number;
  /** Physical reward text */
  physicalReward?: string;
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
  concept,
  xp,
  physicalReward,
  image,
  delay = 0,
  className,
}: QuestCardProps) {
  const navigate = useNavigate();
  const useMiamiLayout = concept !== undefined;

  return (
    <AnimatedSection direction="up" delay={delay}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate('/app/explore')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate('/app/explore');
        }}
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
          <h3 className="font-poppins font-semibold text-lg text-foreground mb-2 line-clamp-2 leading-snug">
            {title}
          </h3>

          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>

          {useMiamiLayout ? (
            <>
              {concept && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                  {concept}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Zap className="w-4 h-4 flex-shrink-0" />
                <span>{xp} XP</span>
                {physicalReward && (
                  <>
                    <span className="text-muted-foreground font-normal">•</span>
                    <span className="text-muted-foreground font-normal line-clamp-1">{physicalReward}</span>
                  </>
                )}
              </div>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </AnimatedSection>
  );
}

export default QuestCard;
