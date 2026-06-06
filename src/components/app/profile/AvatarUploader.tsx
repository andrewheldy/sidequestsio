import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { validateAvatarFile, uploadAvatar } from '@/lib/profile';
import { cn } from '@/lib/utils';

interface AvatarUploaderProps {
  userId: string;
  /** Currently saved (or just-uploaded) avatar URL. */
  value: string | null;
  /** Initials/fallback source. */
  name: string;
  /** Called with the new public URL once an upload succeeds. */
  onUploaded: (url: string) => void;
}

/**
 * Tappable avatar that lets the user pick a photo from camera or gallery,
 * previews it instantly, then compresses + uploads to Supabase Storage.
 * Handles loading / error states inline.
 */
export function AvatarUploader({ userId, value, name, onUploaded }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = (name?.trim()?.[0] ?? 'Q').toUpperCase();
  const shown = preview ?? value;

  const handleFile = async (file: File) => {
    setError(null);
    const invalid = validateAvatarFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    // Optimistic local preview.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const url = await uploadAvatar(userId, file);
      onUploaded(url);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile photo"
        className={cn(
          'group relative h-24 w-24 rounded-3xl outline-none ring-offset-2 ring-offset-background',
          'focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <Avatar className="h-24 w-24 rounded-3xl ring-2 ring-primary/40">
          {shown ? (
            <AvatarImage src={shown} alt="" className="object-cover" />
          ) : null}
          <AvatarFallback className="rounded-3xl bg-gradient-to-br from-coral to-turquoise text-3xl font-bold text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>

        {/* Camera affordance / loading overlay */}
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-3xl bg-charcoal/45 transition-opacity',
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </span>
      </button>

      <span className="text-xs text-muted-foreground">
        {uploading ? 'Uploading…' : 'Tap to change photo'}
      </span>
      {error && (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
    </div>
  );
}

export default AvatarUploader;
