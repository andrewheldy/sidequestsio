import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { cleanHandle } from '@/lib/profile';
import { cn } from '@/lib/utils';

type Platform = 'instagram' | 'tiktok' | 'x';

interface SocialLinksEditorProps {
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  x_handle?: string | null;
}

interface PlatformConfig {
  id: Platform;
  label: string;
  placeholder: string;
}

const PLATFORMS: PlatformConfig[] = [
  { id: 'instagram', label: 'Instagram', placeholder: 'username' },
  { id: 'tiktok',    label: 'TikTok',    placeholder: 'username' },
  { id: 'x',         label: 'X',         placeholder: 'username' },
];

function validateHandle(raw: string): string | null {
  if (!raw) return null;
  if (raw.includes(' ')) return 'No spaces allowed.';
  if (/^https?:\/\/|\.com|\.io/.test(raw)) return 'Enter your username only — not a URL.';
  return null;
}

export function SocialLinksEditor({ instagram_handle, tiktok_handle, x_handle }: SocialLinksEditorProps) {
  const { updateProfile } = useAuth();
  const [editing, setEditing] = useState<Platform | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successPlatform, setSuccessPlatform] = useState<Platform | null>(null);

  const values: Record<Platform, string | null | undefined> = {
    instagram: instagram_handle,
    tiktok: tiktok_handle,
    x: x_handle,
  };

  const openEditor = (platform: Platform) => {
    if (editing === platform) {
      setEditing(null);
      setInputValue('');
      setValidationError(null);
      return;
    }
    setInputValue(values[platform] ?? '');
    setEditing(platform);
    setValidationError(null);
  };

  const cancel = () => {
    setEditing(null);
    setInputValue('');
    setValidationError(null);
  };

  const handleChange = (raw: string) => {
    // Auto-strip leading @ as user types
    const stripped = raw.replace(/^@+/, '');
    setInputValue(stripped);
    setValidationError(validateHandle(stripped));
  };

  const save = async (platform: Platform) => {
    const trimmed = inputValue.trim();
    const err = validateHandle(trimmed);
    if (err) {
      setValidationError(err);
      return;
    }

    setSaving(true);
    try {
      const handle = trimmed ? (cleanHandle(trimmed, platform) ?? null) : null;
      const field = `${platform}_handle` as 'instagram_handle' | 'tiktok_handle' | 'x_handle';
      const { error } = await updateProfile({ [field]: handle });
      if (error) {
        toast.error(error);
      } else {
        const label = PLATFORMS.find((p) => p.id === platform)!.label;
        toast.success(handle ? `${label} connected.` : `${label} removed.`);
        cancel();
        if (handle) {
          setSuccessPlatform(platform);
          setTimeout(() => setSuccessPlatform(null), 1800);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (platform: Platform) => {
    setSaving(true);
    try {
      const field = `${platform}_handle` as 'instagram_handle' | 'tiktok_handle' | 'x_handle';
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
        <h2 className="font-poppins font-semibold tracking-tight">Connect your identities</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tap a card to add or edit your handle.
        </p>
      </div>

      {/* Platform cards */}
      <div className="flex items-stretch gap-3">
        {PLATFORMS.map(({ id, label }) => {
          const handle = values[id];
          const connected = Boolean(handle);
          const isActive = editing === id;
          const isSuccess = successPlatform === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => openEditor(id)}
              aria-label={connected ? `Edit ${label} — @${handle}` : `Connect ${label}`}
              aria-pressed={isActive}
              className={cn(
                'group relative flex flex-1 flex-col items-center gap-2 rounded-2xl border px-2 py-4',
                'min-h-[7rem] transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                connected
                  ? cn(
                      'border-primary/50 bg-primary/5',
                      'hover:border-primary/70 hover:bg-primary/10',
                      isActive && 'border-primary/80 bg-primary/15',
                    )
                  : cn(
                      'border-border/30 bg-card/20',
                      'hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_0_18px_rgba(var(--primary)/0.12)]',
                      isActive && 'border-primary/40 bg-primary/5',
                    ),
              )}
            >
              {/* Platform name */}
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider',
                  connected ? 'text-foreground/70' : 'text-muted-foreground/50',
                )}
              >
                {label}
              </span>

              {/* Icon */}
              <span
                className={cn(
                  'transition-all duration-300',
                  connected ? 'text-primary' : 'text-foreground/20',
                  isSuccess && 'scale-110 text-primary',
                )}
              >
                {isSuccess ? (
                  <Check className="h-6 w-6 animate-in zoom-in duration-200" />
                ) : (
                  <>
                    {id === 'instagram' && <InstagramGlyph />}
                    {id === 'tiktok' && <TikTokGlyph />}
                    {id === 'x' && <XGlyph />}
                  </>
                )}
              </span>

              {/* Handle or "+" */}
              {connected && handle ? (
                <span className="max-w-full truncate px-1 text-center text-[11px] font-medium text-foreground/70">
                  @{handle}
                </span>
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border text-[10px]',
                    'transition-colors duration-200',
                    isActive
                      ? 'border-primary/50 bg-primary/20 text-primary'
                      : 'border-border/60 bg-muted/60 text-muted-foreground',
                  )}
                >
                  <Plus className="h-2.5 w-2.5" />
                </span>
              )}

              {/* Pencil badge — connected & not editing */}
              {connected && !isActive && (
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-primary shadow-sm"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Inline editor — slides in below the cards when a platform is active */}
      {editing && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-muted/20 px-3 py-2.5">
            <span className="shrink-0 text-muted-foreground">
              {editing === 'instagram' && <InstagramGlyph />}
              {editing === 'tiktok' && <TikTokGlyph />}
              {editing === 'x' && <XGlyph />}
            </span>

            <span className="shrink-0 text-sm text-muted-foreground select-none">@</span>

            <Input
              autoFocus
              value={inputValue}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={PLATFORMS.find((p) => p.id === editing)!.placeholder}
              className="h-9 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save(editing);
                if (e.key === 'Escape') cancel();
              }}
            />

            {/* Remove — only when this platform has a saved handle */}
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

            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              aria-label="Cancel"
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void save(editing)}
              disabled={saving || Boolean(validationError)}
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

          {validationError && (
            <p role="alert" className="mt-1.5 px-1 text-xs text-destructive">
              {validationError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ── Brand glyphs (inherit currentColor) ──────────────────────────────────────

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 1.9 1.4 3.3 3.5 3.6v2.4c-1.3.1-2.5-.3-3.5-1v5.7a5.3 5.3 0 1 1-5.3-5.3c.3 0 .5 0 .8.1v2.5a2.8 2.8 0 1 0 2 2.7V3h2.5Z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M17.5 3h3l-7 8 8.2 10h-6.4l-5-6.1L7 21H4l7.4-8.5L3.5 3h6.5l4.5 5.6L17.5 3Zm-1.1 16h1.7L8.7 4.8H6.9L16.4 19Z" />
    </svg>
  );
}

export default SocialLinksEditor;
