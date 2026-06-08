import { X, MapPin, Clock, Zap, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCategoryColor, getCategoryEmoji, calcDistance } from '@/lib/mapbox';
import { useAuth } from '@/contexts/AuthContext';
import { useSignInPrompt } from '@/contexts/SignInPromptContext';
import { useToast } from '@/hooks/use-toast';
import type { Quest } from '@/lib/quests';

interface QuestMapPopupProps {
  quest: Quest;
  userCoords: { lat: number; lng: number } | null;
  onClose: () => void;
}

/**
 * Slide-up bottom sheet shown when a map marker is tapped.
 * Mirrors the conversion patterns in AppQuestCard — unauthed users
 * are directed to sign up before starting a quest.
 */
const QuestMapPopup = ({ quest, userCoords, onClose }: QuestMapPopupProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { promptSignIn } = useSignInPrompt();
  const { toast } = useToast();

  const color = getCategoryColor(quest.category);
  const emoji = getCategoryEmoji(quest.category);
  const distance = userCoords
    ? calcDistance(userCoords, { lat: quest.lat, lng: quest.lng })
    : quest.distance;

  const handleViewQuest = () => {
    navigate(`/quests/${quest.id}`);
    onClose();
  };

  const handleStartQuest = () => {
    if (!user) {
      onClose();
      promptSignIn('start this quest');
      return;
    }
    onClose();
    toast({ title: 'Quest started! 🧭', description: `Good luck with "${quest.title}".` });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 map-popup-enter">
      <div className="m-3 rounded-2xl border border-border/50 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          {/* Category icon badge */}
          <div
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ background: `${color}22`, border: `1.5px solid ${color}55` }}
          >
            {emoji}
          </div>

          {/* Quest info */}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-poppins font-semibold leading-tight text-foreground">
              {quest.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-0 px-1.5 py-0 text-[10px] font-semibold"
                style={{ background: `${color}22`, color }}
              >
                {quest.category}
              </Badge>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {quest.neighborhood}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Navigation className="h-3 w-3" />
                {distance}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {quest.time}
              </span>
              <span className="flex items-center gap-0.5 font-medium text-primary">
                <Zap className="h-3 w-3" />
                {quest.xp} XP
              </span>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close quest preview"
            className="flex h-7 w-7 touch-manipulation items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted active:scale-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* CTA row */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11 flex-1 border-border touch-manipulation"
            onClick={handleViewQuest}
          >
            View Quest
          </Button>
          <Button
            size="sm"
            className="h-11 flex-1 touch-manipulation"
            onClick={handleStartQuest}
          >
            Start Quest
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuestMapPopup;
