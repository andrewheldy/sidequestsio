/**
 * Quest Proof Camera
 * ------------------
 * Full-screen, three-step flow triggered after quest completion:
 *   1. Capture  — live camera stream or gallery picker
 *   2. Preview  — photo composited with branded SideQuests overlay
 *   3. Share    — pre-filled caption + native share sheet + per-platform intents
 *
 * Photo proofs are composited on a canvas with:
 *   • SideQuests wordmark (top-left)
 *   • Quest title        (top-right, truncated)
 *   • Partner handle     (bottom-left)
 *   • Venue / city       (bottom-left, second line)
 *   • "QUEST COMPLETE" gradient pill badge (bottom-right)
 *
 * Sharing never posts automatically — it opens the browser / OS native share
 * sheet or a platform intent URL. The user decides what to post.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  FlipHorizontal,
  Image as GalleryIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Share2,
  Trophy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getRepository } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics/events';
import { isDemoMode } from '@/lib/demo';
import { uploadQuestProof } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import type { QuestWithContext } from '@/types/db';
import type { CompleteQuestResult } from '@/lib/db/repository';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestProofCameraProps {
  quest: QuestWithContext;
  result: CompleteQuestResult;
  onDone: () => void;
}

type Step = 'capture' | 'preview' | 'share';
type FacingMode = 'environment' | 'user';

// ---------------------------------------------------------------------------
// Caption builder
// ---------------------------------------------------------------------------

function buildCaption(quest: QuestWithContext): string {
  const partnerRaw = quest.partner?.name ?? '';
  const partnerHandle = partnerRaw ? `@${partnerRaw.replace(/\s+/g, '')}` : '';
  const city = quest.venue?.city ?? quest.venue?.address ?? '';
  const tag = quest.category.replace(/_/g, '');

  const parts: string[] = [
    `Just completed "${quest.title}" ✅`,
    '',
    ['@SideQuestsIO', partnerHandle].filter(Boolean).join(' '),
    '',
    [`#SideQuests`, `#${tag}`, city ? `#${city.replace(/\s+/g, '')}` : '']
      .filter(Boolean)
      .join(' '),
  ];
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Canvas overlay renderer
// ---------------------------------------------------------------------------

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

function loadImg(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')); };
    img.src = url;
  });
}

async function renderOverlay(
  photoBlob: Blob,
  questTitle: string,
  partnerHandle: string,
  locationStr: string,
): Promise<Blob> {
  const img = await loadImg(photoBlob);

  const maxW = 1080;
  const scale = Math.min(1, maxW / img.width);
  const W = Math.round(img.width * scale);
  const H = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Base photo
  ctx.drawImage(img, 0, 0, W, H);

  // Top gradient bar
  const topGrad = ctx.createLinearGradient(0, 0, 0, 88);
  topGrad.addColorStop(0, 'rgba(14, 20, 40, 0.90)');
  topGrad.addColorStop(1, 'rgba(14, 20, 40, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 88);

  // Bottom gradient bar
  const botH = 110;
  const botGrad = ctx.createLinearGradient(0, H - botH, 0, H);
  botGrad.addColorStop(0, 'rgba(14, 20, 40, 0)');
  botGrad.addColorStop(1, 'rgba(14, 20, 40, 0.92)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - botH, W, botH);

  // -- Top-left: "SideQuests" wordmark
  const logoSize = Math.max(14, Math.round(W * 0.036));
  ctx.font = `bold ${logoSize}px Poppins, system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('SideQuests', 18, 34);

  // -- Top-right: quest title (truncated to fit)
  const titleSize = Math.max(12, Math.round(W * 0.030));
  ctx.font = `600 ${titleSize}px Poppins, system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.textAlign = 'right';
  const maxTitleW = W - 160;
  let titleText = questTitle;
  while (ctx.measureText(titleText).width > maxTitleW && titleText.length > 4) {
    titleText = titleText.slice(0, -1);
  }
  if (titleText !== questTitle) titleText = titleText.trimEnd() + '…';
  ctx.fillText(titleText, W - 18, 34);
  ctx.textAlign = 'left';

  // -- Bottom-left: partner handle
  const smallSize = Math.max(11, Math.round(W * 0.028));
  ctx.font = `500 ${smallSize}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.textBaseline = 'middle';

  const line1Y = H - 66;
  const line2Y = H - 36;

  if (partnerHandle) {
    ctx.fillText(partnerHandle, 18, line1Y);
  }
  if (locationStr) {
    ctx.font = `400 ${smallSize}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText(`\u{1F4CD} ${locationStr}`, 18, partnerHandle ? line2Y : line1Y);
  }

  // -- Bottom-right: "QUEST COMPLETE" badge pill
  const badgeLabel = 'QUEST COMPLETE';
  const badgeSize = Math.max(9, Math.round(W * 0.025));
  ctx.font = `bold ${badgeSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(badgeLabel).width;
  const padX = 14;
  const padY = 9;
  const bW = textW + padX * 2;
  const bH = badgeSize + padY * 2;
  const bX = W - bW - 18;
  const bY = H - bH - 22;

  const pillGrad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
  pillGrad.addColorStop(0, 'hsl(6, 89%, 68%)');   // coral
  pillGrad.addColorStop(1, 'hsl(174, 100%, 45%)'); // turquoise
  ctx.fillStyle = pillGrad;
  fillRoundRect(ctx, bX, bY, bW, bH, bH / 2);

  ctx.fillStyle = '#0E1428';
  ctx.textAlign = 'center';
  ctx.fillText(badgeLabel, bX + bW / 2, bY + bH / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      'image/webp',
      0.92,
    );
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function QuestProofCamera({ quest, result, onDone }: QuestProofCameraProps) {
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('capture');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Raw capture and composed (overlaid) blobs
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [composedBlob, setComposedBlob] = useState<Blob | null>(null);
  const [composedUrl, setComposedUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [composing, setComposing] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [breadcrumbPosted, setBreadcrumbPosted] = useState(false);
  const [caption, setCaption] = useState(() => buildCaption(quest));

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partnerHandle = quest.partner?.name
    ? `@${quest.partner.name.replace(/\s+/g, '')}`
    : '';
  const locationStr = [quest.venue?.name, quest.venue?.city]
    .filter(Boolean)
    .join(', ');

  // Start / restart camera stream
  const startCamera = useCallback(async () => {
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraError(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError(true);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  // Manage camera lifecycle with step changes
  useEffect(() => {
    if (step !== 'capture') return;
    startCamera();
    return () => stopCamera();
  }, [step, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      if (composedUrl) URL.revokeObjectURL(composedUrl);
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the SideQuests branded overlay to a photo blob
  const applyOverlay = useCallback(
    async (blob: Blob) => {
      setComposing(true);
      try {
        const composed = await renderOverlay(blob, quest.title, partnerHandle, locationStr);
        const url = URL.createObjectURL(composed);
        setComposedBlob(composed);
        setComposedUrl(url);
      } catch {
        // Fallback: use the raw photo without overlay
        const url = URL.createObjectURL(blob);
        setComposedBlob(blob);
        setComposedUrl(url);
      } finally {
        setComposing(false);
      }
    },
    [quest.title, partnerHandle, locationStr],
  );

  // Capture a still frame from the live camera stream
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        stopCamera();
        setRawBlob(blob);
        setIsVideo(false);
        await applyOverlay(blob);
        setStep('preview');
        track('proof_captured', {
          quest_id: quest.id,
          user_id: user?.id,
          props: { source: 'camera' },
        });
      },
      'image/webp',
      0.92,
    );
  }, [cameraReady, facingMode, stopCamera, applyOverlay, quest.id, user?.id]);

  // Handle file picked from gallery
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      stopCamera();
      const video = file.type.startsWith('video/');
      setIsVideo(video);
      setRawBlob(file);

      if (video) {
        const url = URL.createObjectURL(file);
        setComposedBlob(file);
        setComposedUrl(url);
        setStep('preview');
      } else {
        await applyOverlay(file);
        setStep('preview');
      }
      track('proof_captured', {
        quest_id: quest.id,
        user_id: user?.id,
        props: { source: 'gallery', type: video ? 'video' : 'photo' },
      });
    },
    [stopCamera, applyOverlay, quest.id, user?.id],
  );

  const handleRetake = useCallback(() => {
    if (composedUrl) URL.revokeObjectURL(composedUrl);
    setComposedUrl(null);
    setComposedBlob(null);
    setRawBlob(null);
    setStep('capture');
  }, [composedUrl]);

  // --- Share actions ---

  const handleNativeShare = useCallback(async () => {
    if (!composedBlob) return;
    const shareFile = new File(
      [composedBlob],
      `sidequests-${quest.id}-proof.${composedBlob.type.includes('video') ? 'mp4' : 'webp'}`,
      { type: composedBlob.type || 'image/webp' },
    );

    if (navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({
          title: `SideQuests: ${quest.title}`,
          text: caption,
          files: [shareFile],
        });
        track('proof_shared', {
          quest_id: quest.id,
          user_id: user?.id,
          props: { method: 'native_files' },
        });
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          toast.error('Share failed. Try copying the caption.');
        }
      }
    } else if (navigator.share) {
      try {
        await navigator.share({ title: `SideQuests: ${quest.title}`, text: caption });
        track('proof_shared', {
          quest_id: quest.id,
          user_id: user?.id,
          props: { method: 'native_text' },
        });
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          handleCopyCaption();
        }
      }
    } else {
      handleCopyCaption();
    }
  }, [composedBlob, quest.id, quest.title, caption, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied to clipboard!');
    } catch {
      toast.error('Could not copy — please select and copy manually.');
    }
  }, [caption]);

  const handleShareTo = useCallback(
    (platform: 'instagram' | 'tiktok' | 'x' | 'sms') => {
      const encoded = encodeURIComponent(caption);
      switch (platform) {
        case 'instagram':
          handleCopyCaption();
          toast.info('Caption copied! Paste it when you share on Instagram.', { duration: 4000 });
          break;
        case 'tiktok':
          handleCopyCaption();
          toast.info('Caption copied! Paste it when you post on TikTok.', { duration: 4000 });
          break;
        case 'x':
          window.open(`https://x.com/intent/post?text=${encoded}`, '_blank', 'noopener,noreferrer');
          track('proof_shared', { quest_id: quest.id, user_id: user?.id, props: { method: 'x' } });
          break;
        case 'sms':
          window.location.href = `sms:?body=${encoded}`;
          track('proof_shared', { quest_id: quest.id, user_id: user?.id, props: { method: 'sms' } });
          break;
      }
    },
    [caption, handleCopyCaption, quest.id, user?.id],
  );

  const handlePostBreadcrumb = useCallback(async () => {
    if (!user) return;
    if (isDemoMode) {
      toast.info('Demo mode — saving disabled.');
      return;
    }

    setUploading(true);
    try {
      let imageUrl: string | undefined;

      // Upload image to Supabase Storage if configured
      if (composedBlob && supabase) {
        try {
          imageUrl = await uploadQuestProof(user.id, quest.id, composedBlob);
        } catch {
          // Continue without image if upload fails
        }
      }

      const repo = await getRepository();
      const res = await repo.createNote({
        userId: user.id,
        questId: quest.id,
        content: caption.slice(0, 280),
        imageUrl,
      });

      if (res.ok) {
        setBreadcrumbPosted(true);
        track('community_note_created', {
          quest_id: quest.id,
          user_id: user.id,
          props: { source: 'proof_camera', has_image: imageUrl ? 'true' : 'false' },
        });
        toast.success('Quest Breadcrumb posted!');
      } else {
        const map: Record<string, string> = {
          too_long: 'Caption is too long (max 280 chars).',
          not_completed: 'Complete the quest first.',
          empty: 'Caption is empty.',
          not_found: 'Quest not found.',
        };
        toast.error(map[res.error ?? ''] ?? 'Could not post breadcrumb.');
      }
    } catch {
      toast.error('Could not post breadcrumb. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [user, quest.id, caption, composedBlob]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal">
      {step === 'capture' && (
        <CaptureStep
          videoRef={videoRef}
          cameraReady={cameraReady}
          cameraError={cameraError}
          facingMode={facingMode}
          fileInputRef={fileInputRef}
          quest={quest}
          onCapture={capturePhoto}
          onFlip={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
          onFileSelect={handleFileSelect}
          onSkip={onDone}
        />
      )}

      {step === 'preview' && (
        <PreviewStep
          composedUrl={composedUrl}
          isVideo={isVideo}
          composing={composing}
          onRetake={handleRetake}
          onProceed={() => setStep('share')}
        />
      )}

      {step === 'share' && (
        <ShareStep
          composedUrl={composedUrl}
          isVideo={isVideo}
          quest={quest}
          result={result}
          caption={caption}
          setCaption={setCaption}
          uploading={uploading}
          breadcrumbPosted={breadcrumbPosted}
          onNativeShare={handleNativeShare}
          onShareTo={handleShareTo}
          onCopyCaption={handleCopyCaption}
          onPostBreadcrumb={handlePostBreadcrumb}
          onBack={() => setStep('preview')}
          onDone={onDone}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Capture
// ---------------------------------------------------------------------------

interface CaptureStepProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraReady: boolean;
  cameraError: boolean;
  facingMode: FacingMode;
  fileInputRef: React.RefObject<HTMLInputElement>;
  quest: QuestWithContext;
  onCapture: () => void;
  onFlip: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSkip: () => void;
}

function CaptureStep({
  videoRef,
  cameraReady,
  cameraError,
  fileInputRef,
  quest,
  onCapture,
  onFlip,
  onFileSelect,
  onSkip,
}: CaptureStepProps) {
  return (
    <div className="relative flex h-full flex-col">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-4 pt-safe-top bg-gradient-to-b from-charcoal/80 to-transparent" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 rounded-full bg-charcoal/60 px-3 py-1.5 text-sm text-white/80 backdrop-blur"
          aria-label="Skip"
        >
          <X className="h-4 w-4" /> Skip
        </button>
        <span className="font-poppins text-sm font-semibold text-white drop-shadow">
          Log Your Quest
        </span>
        <div className="w-16" aria-hidden />
      </div>

      {/* Camera preview or error state */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {!cameraError ? (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              aria-label="Camera preview"
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-white/60" />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <Camera className="h-16 w-16 text-white/30" />
            <p className="text-sm text-white/60">
              Camera access unavailable.
              <br />
              Pick a photo or video from your gallery instead.
            </p>
            <Button
              variant="outline"
              className="gap-2 border-white/20 text-white/80"
              onClick={() => fileInputRef.current?.click()}
            >
              <GalleryIcon className="h-4 w-4" /> Open Gallery
            </Button>
          </div>
        )}
      </div>

      {/* Quest name overlay (above controls) */}
      <div className="absolute bottom-32 left-0 right-0 px-4 text-center">
        <p className="line-clamp-2 font-poppins text-sm font-semibold text-white drop-shadow">
          {quest.title}
        </p>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-charcoal/90 to-transparent px-8"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))', paddingTop: '16px' }}
      >
        {/* Gallery picker */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur"
          aria-label="Pick from gallery"
        >
          <GalleryIcon className="h-5 w-5 text-white" />
        </button>

        {/* Shutter */}
        <button
          onClick={onCapture}
          disabled={!cameraReady || cameraError}
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80',
            'bg-white/20 backdrop-blur transition-transform active:scale-95',
            (!cameraReady || cameraError) && 'opacity-40',
          )}
          aria-label="Take photo"
        >
          <div className="h-14 w-14 rounded-full bg-white" />
        </button>

        {/* Flip camera */}
        <button
          onClick={onFlip}
          disabled={!cameraReady || cameraError}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur',
            (!cameraReady || cameraError) && 'opacity-40',
          )}
          aria-label="Flip camera"
        >
          <FlipHorizontal className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Preview
// ---------------------------------------------------------------------------

interface PreviewStepProps {
  composedUrl: string | null;
  isVideo: boolean;
  composing: boolean;
  onRetake: () => void;
  onProceed: () => void;
}

function PreviewStep({ composedUrl, isVideo, composing, onRetake, onProceed }: PreviewStepProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: '12px' }}
      >
        <button
          onClick={onRetake}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          aria-label="Retake"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <span className="font-poppins text-sm font-semibold text-white">Preview</span>
      </div>

      {/* Media preview */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {composing ? (
          <div className="flex h-full items-center justify-center gap-3 flex-col">
            <Loader2 className="h-10 w-10 animate-spin text-white/60" />
            <p className="text-sm text-white/50">Applying SideQuests overlay…</p>
          </div>
        ) : composedUrl ? (
          isVideo ? (
            <video
              src={composedUrl}
              className="h-full w-full object-contain"
              controls
              playsInline
              loop
            />
          ) : (
            <img
              src={composedUrl}
              alt="Your quest proof with SideQuests overlay"
              className="h-full w-full object-contain"
            />
          )
        ) : null}
      </div>

      {/* Bottom controls */}
      <div
        className="flex gap-3 bg-charcoal px-4"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))', paddingTop: '16px' }}
      >
        <Button
          variant="outline"
          className="flex-1 gap-2 border-white/20 text-white/80"
          onClick={onRetake}
        >
          <Camera className="h-4 w-4" /> Retake
        </Button>
        <Button
          className="flex-1 gap-2 bg-gradient-to-r from-coral to-turquoise font-semibold text-charcoal"
          onClick={onProceed}
          disabled={composing || !composedUrl}
        >
          <Share2 className="h-4 w-4" /> Share &amp; Submit
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Share
// ---------------------------------------------------------------------------

interface ShareStepProps {
  composedUrl: string | null;
  isVideo: boolean;
  quest: QuestWithContext;
  result: CompleteQuestResult;
  caption: string;
  setCaption: (v: string) => void;
  uploading: boolean;
  breadcrumbPosted: boolean;
  onNativeShare: () => void;
  onShareTo: (platform: 'instagram' | 'tiktok' | 'x' | 'sms') => void;
  onCopyCaption: () => void;
  onPostBreadcrumb: () => void;
  onBack: () => void;
  onDone: () => void;
}

function ShareStep({
  composedUrl,
  isVideo,
  quest,
  result,
  caption,
  setCaption,
  uploading,
  breadcrumbPosted,
  onNativeShare,
  onShareTo,
  onCopyCaption,
  onPostBreadcrumb,
  onBack,
  onDone,
}: ShareStepProps) {
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: '12px' }}
      >
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          aria-label="Back to preview"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <span className="font-poppins text-sm font-semibold text-white">Share Your Quest</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Quest complete banner */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-coral/20 to-turquoise/20 p-4">
          <Trophy className="h-8 w-8 shrink-0 text-secondary" />
          <div>
            <p className="font-poppins font-bold text-foreground">Quest Complete!</p>
            {result.ok && (
              <p className="text-xs text-muted-foreground">
                +{result.xpAwarded} XP · +{result.pointsAwarded} pts
                {result.leveledUp && (
                  <span className="ml-1 font-semibold text-secondary">
                    · Level {result.newLevel}!
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Image thumbnail */}
        {composedUrl && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
            {isVideo ? (
              <video
                src={composedUrl}
                className="aspect-[9/16] w-full object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <img
                src={composedUrl}
                alt="Quest proof with SideQuests overlay"
                className="aspect-[3/4] w-full object-cover"
              />
            )}
          </div>
        )}

        {/* Caption */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Suggested Caption
          </label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={6}
            className="resize-none border-white/10 bg-muted/40 text-sm text-foreground focus-visible:ring-primary"
          />
        </div>

        {/* Primary share button */}
        <Button
          onClick={canNativeShare ? onNativeShare : onCopyCaption}
          className="mb-3 w-full gap-2 bg-gradient-to-r from-coral to-turquoise font-semibold text-charcoal"
          size="lg"
        >
          <Share2 className="h-5 w-5" />
          {canNativeShare ? 'Share via…' : 'Copy Caption'}
        </Button>

        {/* Platform grid */}
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <PlatformButton
            label="Instagram"
            emoji="📸"
            style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
            onClick={() => onShareTo('instagram')}
          />
          <PlatformButton
            label="TikTok"
            emoji="🎵"
            style={{ background: '#010101' }}
            onClick={() => onShareTo('tiktok')}
          />
          <PlatformButton
            label="X (Twitter)"
            emoji="✖"
            style={{ background: '#000000' }}
            onClick={() => onShareTo('x')}
          />
          <PlatformButton
            label="SMS"
            emoji="💬"
            style={{ background: '#22c55e' }}
            onClick={() => onShareTo('sms')}
          />
        </div>

        {/* Copy caption (standalone) */}
        <Button
          variant="outline"
          className="mb-3 w-full gap-2 border-white/15 text-white/80"
          onClick={onCopyCaption}
        >
          <Copy className="h-4 w-4" /> Copy Caption
        </Button>

        {/* Divider */}
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40">also</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Post as Breadcrumb */}
        <Button
          variant="outline"
          className={cn(
            'mb-4 w-full gap-2 border-white/15',
            breadcrumbPosted
              ? 'border-secondary/40 text-secondary'
              : 'text-white/80',
          )}
          onClick={onPostBreadcrumb}
          disabled={uploading || breadcrumbPosted}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : breadcrumbPosted ? (
            <Check className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          {breadcrumbPosted ? 'Breadcrumb Posted!' : 'Post as Quest Breadcrumb'}
        </Button>

        {/* Done */}
        <Button
          variant="ghost"
          className="w-full text-white/50"
          onClick={onDone}
        >
          Done
        </Button>

        {/* Note about platform sharing */}
        <p className="mt-4 text-center text-[11px] leading-relaxed text-white/30">
          SideQuests never posts on your behalf.
          <br />
          All sharing happens through your own apps.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform button
// ---------------------------------------------------------------------------

function PlatformButton({
  label,
  emoji,
  style,
  onClick,
}: {
  label: string;
  emoji: string;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white transition-opacity active:opacity-80"
      style={style}
    >
      <span className="text-lg leading-none">{emoji}</span>
      {label}
    </button>
  );
}
