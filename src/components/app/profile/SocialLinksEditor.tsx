import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeSocialLink, handleFromUrl } from '@/lib/profile';
import { cn } from '@/lib/utils';

type Platform = 'instagram' | 'tiktok' | 'x';

interface SocialLinksEditorProps {
  instagram?: string | null;
  tiktok?: string | null;
  x?: string | null;
}

const PLATFORMS: { id: Platform; label: string; placeholder: string }[] = [
  { id: 'instagram', label: 'Instagram', placeholder: '@handle or link' },
  { id: 'tiktok', label: 'TikTok', placeholder: '@handle or link' },
  { id: 'x', label: 'X', placeholder: '@handle or link' },
];

/**
 * Inline social link editor for the current user's own profile.
 * Shows three platform tiles — faded with a plus badge when empty,
 * full-opacity with a pencil badge when connected.
 * Clicking a tile opens an inline input row below the tiles.
 * Only used in Profile.tsx (not PublicProfile.tsx).
 */
export function SocialLinksEditor({ instagram, tiktok, x }: SocialLinksEditorProps) {
  const { updateProfile } = useAuth();
  const [editing, setEditing] = useState<Platform | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const values: Record<Platform, string | null | undefined> = { instagram, tiktok, x };

  const openEditor = (platform: Platform) => {
    if (editing === platform) {
      setEditing(null);
      setInputValue('');
      return;
    }
    const current = values[platform];
    setInputValue(handleFromUrl(current)?.replace(/^@/, '') ?? '');
    setEditing(platform);
  };

  const cancel = () => {
    setEditing(null);
    setInputValue('');
  };

  const save = async (platform: Platform) => {
    setSaving(true);
    try {
      const normalized = normalizeSocialLink(inputValue.trim(), platform);
      const field = `${platform}_url` as 'instagram_url' | 'tiktok_url' | 'x_url';
      const { error } = await updateProfile({ [field]: normalized });
      if (error) {
        toast.error(error);
      } else {
        const label = PLATFORMS.find((p) => p.id === platform)!.label;
        toast.success(normalized ? `${label} added.` : `${label} removed.`);
        cancel();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (platform: Platform) => {
    setSaving(true);
    try {
      const field = `${platform}_url` as 'instagram_url' | 'tiktok_url' | 'x_url';
      const { error } = await updateProfile({ [field]: null });
      if (error) {
        toast.error(error);
      } else {
        const label = PLATFORMS.find((p) => p.id === platform)!.label;
        toast.success(`${label} removed.`);
        cancel();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-card p-5">
      <div className="mb-4">
        <h2 className="font-poppins font-semibold">Social Links</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Optional. Tap to add — identity context, not clout.
        </p>
      </div>

      {/* Three platform tiles */}
      <div className="flex items-start justify-around gap-2">
        {PLATFORMS.map(({ id, label }) => {
          const url = values[id];
          const handle = handleFromUrl(url);
          const connected = Boolean(url);
          const isActive = editing === id;

          return (
            <div key={id} className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => openEditor(id)}
                aria-label={connected ? `Edit ${label}` : `Add ${label}`}
                aria-pressed={isActive}
                className={cn(
                  'relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  connected
                    ? cn(
                        'border-primary/40 bg-card/60 text-foreground',
                        'hover:border-primary/70 hover:bg-card/80',
                        isActive && 'border-primary/80 bg-primary/10',
                      )
                    : cn(
                        'border-border/30 bg-card/20 text-foreground/25',
                        'hover:border-primary/30 hover:text-foreground/50 hover:bg-card/30',
                        isActive && 'border-primary/40 bg-primary/5 text-foreground/50',
                      ),
                )}
              >
                {id === 'instagram' && <InstagramGlyph />}
                {id === 'tiktok' && <TikTokGlyph />}
                {id === 'x' && <XGlyph />}

                {/* Plus badge — empty, not currently editing */}
                {!connected && !isActive && (
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground shadow-sm"
                  >
                    <Plus className="h-3 w-3" />
                  </span>
                )}

                {/* Pencil badge — connected, not currently editing */}
                {connected && !isActive && (
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-primary shadow-sm"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>

              <span
                className={cn(
                  'max-w-[68px] truncate text-center text-xs',
                  connected ? 'text-muted-foreground' : 'text-muted-foreground/40',
                )}
                title={connected && handle ? handle : undefined}
              >
                {connected && handle ? handle : `Add ${label}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Inline editor row — appears below tiles when a platform is active */}
      {editing && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-muted/20 px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="shrink-0 text-muted-foreground">
            {editing === 'instagram' && <InstagramGlyph />}
            {editing === 'tiktok' && <TikTokGlyph />}
            {editing === 'x' && <XGlyph />}
          </span>

          <Input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={PLATFORMS.find((p) => p.id === editing)!.placeholder}
            className="h-9 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save(editing);
              if (e.key === 'Escape') cancel();
            }}
          />

          {/* Remove — only shown if this platform is currently connected */}
          {values[editing] && (
            <button
              type="button"
              onClick={() => void remove(editing)}
              disabled={saving}
              aria-label={`Remove ${PLATFORMS.find((p) => p.id === editing)!.label}`}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Cancel */}
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            aria-label="Cancel"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={() => void save(editing)}
            disabled={saving}
            aria-label="Save"
            className="shrink-0 rounded-lg p-1.5 text-primary transition-colors hover:text-primary/80 disabled:pointer-events-none disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </section>
  );
}

// Subtle, monochrome brand glyphs (inherit currentColor).

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 1.9 1.4 3.3 3.5 3.6v2.4c-1.3.1-2.5-.3-3.5-1v5.7a5.3 5.3 0 1 1-5.3-5.3c.3 0 .5 0 .8.1v2.5a2.8 2.8 0 1 0 2 2.7V3h2.5Z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M17.5 3h3l-7 8 8.2 10h-6.4l-5-6.1L7 21H4l7.4-8.5L3.5 3h6.5l4.5 5.6L17.5 3Zm-1.1 16h1.7L8.7 4.8H6.9L16.4 19Z" />
    </svg>
  );
}

export default SocialLinksEditor;
