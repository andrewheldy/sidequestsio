import { useState } from 'react';
import { Clock, Gift, Heart, Loader2, MapPin, QrCode, Zap } from 'lucide-react';
import type { Quest } from '@/lib/quests';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSignInPrompt } from '@/contexts/SignInPromptContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export function AppQuestCard({ quest }: { quest: Quest }) {
  const { user, refreshProfile } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { promptSignIn } = useSignInPrompt();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completionData, setCompletionData] = useState<{
    xp_awarded: number;
    points_awarded: number;
  } | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const favorited = isFavorite(quest.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      promptSignIn('save favorites');
      return;
    }
    toggleFavorite(quest.id);
    toast({
      title: favorited ? 'Removed from favorites' : 'Saved to favorites ❤️',
      description: quest.title,
    });
  };

  const handleStart = () => {
    if (!user) {
      setOpen(false);
      promptSignIn('start this quest');
      return;
    }
    setOpen(false);
    setQrCode('');
    setCompletionData(null);
    setCompletionError(null);
    setQrOpen(true);
  };

  const handleSubmitQr = async () => {
    const code = qrCode.trim();
    if (!code || !supabase || completing) return;
    setCompleting(true);
    setCompletionError(null);
    const { data, error } = await supabase.rpc('complete_quest_by_qr', { p_code: code });
    setCompleting(false);
    if (error) {
      setCompletionError(error.message ?? 'Something went wrong. Please try again.');
    } else {
      setCompletionData({ xp_awarded: data.xp_awarded, points_awarded: data.points_awarded });
      await refreshProfile();
    }
  };

  const handleQrClose = () => {
    setQrOpen(false);
    setQrCode('');
    setCompletionData(null);
    setCompletionError(null);
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="glass-card hover-lift group cursor-pointer overflow-hidden"
      >
        <div className="relative h-40 overflow-hidden">
          <img
            src={quest.image}
            alt={quest.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
            {quest.category}
          </Badge>
          <button
            onClick={handleFavorite}
            aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-md transition-transform active:scale-90"
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors',
                favorited ? 'fill-coral text-coral' : 'text-foreground',
              )}
            />
          </button>
        </div>
        <div className="p-4">
          <h3 className="mb-2 line-clamp-1 font-poppins text-base font-semibold">{quest.title}</h3>
          <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{quest.neighborhood}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {quest.time}
            </span>
            <span className="flex items-center gap-1 text-turquoise">
              <Zap className="h-4 w-4" />
              {quest.xp} XP
            </span>
          </div>
        </div>
      </div>

      {/* Quest detail dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          <div className="relative h-44">
            <img src={quest.image} alt={quest.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            <Badge className="absolute left-4 top-4 bg-primary text-primary-foreground">
              {quest.category}
            </Badge>
          </div>
          <div className="space-y-4 p-5">
            <DialogHeader>
              <DialogTitle className="text-left font-poppins text-xl">{quest.title}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {quest.neighborhood}, Miami
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat icon={<Gift className="h-4 w-4 text-coral" />} label="Reward" value={quest.reward} />
              <Stat icon={<Zap className="h-4 w-4 text-turquoise" />} label="XP" value={`${quest.xp} XP`} />
              <Stat icon={<MapPin className="h-4 w-4 text-coral" />} label="Distance" value={quest.distance} />
              <Stat icon={<Clock className="h-4 w-4 text-turquoise" />} label="Time" value={quest.time} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleFavorite}>
                <Heart className={cn('mr-2 h-4 w-4', favorited && 'fill-coral text-coral')} />
                {favorited ? 'Saved' : 'Save'}
              </Button>
              <Button className="flex-1" onClick={handleStart}>
                Start Quest
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR verification dialog */}
      <Dialog open={qrOpen} onOpenChange={(v) => { if (!v) handleQrClose(); }}>
        <DialogContent className="max-w-sm">
          {completionData ? (
            <div className="space-y-5 py-2 text-center">
              <div className="text-5xl">🎉</div>
              <DialogTitle className="font-poppins text-xl">Quest Complete!</DialogTitle>
              <p className="text-muted-foreground text-sm">{quest.title}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/30 p-4">
                  <Zap className="mx-auto mb-1.5 h-5 w-5 text-turquoise" />
                  <p className="font-poppins text-xl font-bold">{completionData.xp_awarded}</p>
                  <p className="text-xs text-muted-foreground">XP earned</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-4">
                  <Gift className="mx-auto mb-1.5 h-5 w-5 text-coral" />
                  <p className="font-poppins text-xl font-bold">{completionData.points_awarded}</p>
                  <p className="text-xs text-muted-foreground">Points earned</p>
                </div>
              </div>
              <Button className="w-full" onClick={handleQrClose}>
                Awesome!
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-poppins">
                  <QrCode className="h-5 w-5 text-primary" />
                  Enter QR Code
                </DialogTitle>
                <DialogDescription>
                  Scan or type the code from the QR sign at {quest.neighborhood}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <Input
                  placeholder="e.g. MIAMI-QUEST-ABC123"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitQr()}
                  autoFocus
                  disabled={completing}
                />
                {completionError && (
                  <p className="text-sm text-destructive">{completionError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleQrClose}
                    disabled={completing}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmitQr}
                    disabled={!qrCode.trim() || completing}
                  >
                    {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {completing ? 'Verifying…' : 'Verify'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

export default AppQuestCard;
