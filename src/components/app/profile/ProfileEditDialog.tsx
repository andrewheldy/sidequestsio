import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth, type Profile } from '@/contexts/AuthContext';
import {
  normalizeSocialLink,
  normalizeUsername,
  normalizePhone,
  validateUsername,
  validatePhone,
  handleFromUrl,
} from '@/lib/profile';
import { AvatarUploader } from './AvatarUploader';

const schema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Add a display name.')
    .max(50, 'Keep it under 50 characters.'),
  username: z
    .string()
    .refine((v) => validateUsername(v) === null, (v) => ({
      message: validateUsername(v) ?? 'Invalid username.',
    })),
  bio: z.string().trim().max(280, 'Bios are capped at 280 characters.').optional().or(z.literal('')),
  home_city: z.string().trim().max(60, 'That city name is a bit long.').optional().or(z.literal('')),
  phone_number: z
    .string()
    .trim()
    .refine((v) => validatePhone(v) === null, (v) => ({
      message: validatePhone(v) ?? 'Invalid phone number.',
    }))
    .optional()
    .or(z.literal('')),
  instagram: z.string().trim().max(200).optional().or(z.literal('')),
  tiktok: z.string().trim().max(200).optional().or(z.literal('')),
  x: z.string().trim().max(200).optional().or(z.literal('')),
  youtube: z.string().trim().max(200).optional().or(z.literal('')),
  snapchat: z.string().trim().max(200).optional().or(z.literal('')),
  avatar_url: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface ProfileEditDialogProps {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Mobile-first edit form for the current user's own profile. */
export function ProfileEditDialog({ profile, open, onOpenChange }: ProfileEditDialogProps) {
  const { updateProfile } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(profile),
  });

  // Re-seed when the dialog opens so edits always start from the latest saved state.
  useEffect(() => {
    if (open) reset(toFormValues(profile));
  }, [open, profile, reset]);

  const bio = watch('bio') ?? '';
  const avatarUrl = watch('avatar_url');

  const onSubmit = async (values: FormValues) => {
    const rawPhone = values.phone_number?.trim() ?? '';
    const { error } = await updateProfile({
      display_name: values.display_name.trim(),
      username: normalizeUsername(values.username),
      bio: values.bio?.trim() ? values.bio.trim() : null,
      home_city: values.home_city?.trim() ? values.home_city.trim() : 'Miami',
      avatar_url: values.avatar_url,
      phone_number: rawPhone ? normalizePhone(rawPhone) : null,
      instagram_url: normalizeSocialLink(values.instagram ?? '', 'instagram'),
      tiktok_url: normalizeSocialLink(values.tiktok ?? '', 'tiktok'),
      x_url: normalizeSocialLink(values.x ?? '', 'x'),
      youtube_url: normalizeSocialLink(values.youtube ?? '', 'youtube'),
      snapchat_url: normalizeSocialLink(values.snapchat ?? '', 'snapchat'),
    });

    if (error) {
      if (error.toLowerCase().includes('username')) {
        setError('username', { message: error });
      }
      toast.error(error);
      return;
    }
    toast.success('Your profile has been updated.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update how you show up across SideQuests.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Profile photo */}
          <div className="flex flex-col items-center gap-1">
            <AvatarUploader
              userId={profile.user_id}
              value={avatarUrl}
              name={watch('display_name') || profile.display_name || 'Q'}
              onUploaded={(url) => setValue('avatar_url', url, { shouldDirty: true })}
            />
          </div>

          <Field id="display_name" label="Display name" error={errors.display_name?.message}>
            <Input id="display_name" autoComplete="name" {...register('display_name')} />
          </Field>

          <Field
            id="username"
            label="Username"
            hint="Letters, numbers, underscores."
            error={errors.username?.message}
          >
            <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="pl-3 text-sm text-muted-foreground">@</span>
              <Input
                id="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="border-0 focus-visible:ring-0"
                {...register('username')}
              />
            </div>
          </Field>

          <Field id="bio" label="About Me" error={errors.bio?.message} hint={`${bio.length}/280`}>
            <Textarea
              id="bio"
              rows={3}
              placeholder="A line or two about what you're exploring."
              {...register('bio')}
            />
          </Field>

          <Field id="home_city" label="City" error={errors.home_city?.message}>
            <Input
              id="home_city"
              placeholder="Miami"
              autoComplete="address-level2"
              {...register('home_city')}
            />
          </Field>

          <Field
            id="phone_number"
            label="Phone number"
            hint="Private — not shown publicly."
            error={errors.phone_number?.message}
          >
            <Input
              id="phone_number"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="e.g. 3055550100"
              {...register('phone_number')}
            />
          </Field>

          {/* Social links */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Social Links</legend>
            <p className="-mt-1 text-xs text-muted-foreground">
              Optional. Paste a handle or full link — we'll tidy it up.
            </p>
            <Field id="instagram" label="Instagram" error={errors.instagram?.message} compact>
              <Input
                id="instagram"
                placeholder="@handle or link"
                autoCapitalize="none"
                {...register('instagram')}
              />
            </Field>
            <Field id="tiktok" label="TikTok" error={errors.tiktok?.message} compact>
              <Input
                id="tiktok"
                placeholder="@handle or link"
                autoCapitalize="none"
                {...register('tiktok')}
              />
            </Field>
            <Field id="x" label="X" error={errors.x?.message} compact>
              <Input
                id="x"
                placeholder="@handle or link"
                autoCapitalize="none"
                {...register('x')}
              />
            </Field>
            <Field id="youtube" label="YouTube" error={errors.youtube?.message} compact>
              <Input
                id="youtube"
                placeholder="@handle or link"
                autoCapitalize="none"
                {...register('youtube')}
              />
            </Field>
            <Field id="snapchat" label="Snapchat" error={errors.snapchat?.message} compact>
              <Input
                id="snapchat"
                placeholder="@handle or link"
                autoCapitalize="none"
                {...register('snapchat')}
              />
            </Field>
          </fieldset>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[7.5rem]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toFormValues(profile: Profile): FormValues {
  return {
    display_name: profile.display_name ?? '',
    username: profile.username ?? '',
    bio: profile.bio ?? '',
    home_city: profile.home_city ?? '',
    phone_number: profile.phone_number ?? '',
    instagram: handleFromUrl(profile.instagram_url) ?? '',
    tiktok: handleFromUrl(profile.tiktok_url) ?? '',
    x: handleFromUrl(profile.x_url) ?? '',
    youtube: handleFromUrl(profile.youtube_url) ?? '',
    snapchat: handleFromUrl(profile.snapchat_url) ?? '',
    avatar_url: profile.avatar_url,
  };
}

function Field({
  id,
  label,
  hint,
  error,
  compact,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export default ProfileEditDialog;
