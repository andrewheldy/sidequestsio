/**
 * CaptureTheMoment
 * ----------------
 * Full-screen, three-step capture flow triggered from the quest detail page.
 * Works at any point during a quest (not just after completion).
 *
 * Steps:
 *   1. Capture  — native camera on mobile, file picker on desktop
 *   2. Preview  — photo with branded SideQuests overlay
 *   3. Share    — caption editor + platform share options + download
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Download,
  Image as GalleryIcon,
  Share2,
  X,
  Zap,
  Gift,
  FlipHorizontal,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/events';

export interface CaptureTheMomentProps {
  questId: string;
  questTitle: string;
  venueName?: string | null;
  xp?: number;
  reward?: string | null;
  onDone: () => void;
}

type Step = 'capture' | 'preview' | 'share';
type FacingMode = 'environment' | 'user';

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
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

async function renderMomentOverlay(
  photoBlob: Blob,
  questTitle: string,
  venueName: string,
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

  ctx.drawImage(img, 0, 0, W, H);

  // Top gradient
  const topGrad = ctx.createLinearGradient(0, 0, 0, 88);
  topGrad.addColorStop(0, 'rgba(14, 20, 40, 0.90)');
  topGrad.addColorStop(1, 'rgba(14, 20, 40, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 88);

  // Bottom gradient
  const botH = 120;
  const botGrad = ctx.createLinearGradient(0, H - botH, 0, H);
  botGrad.addColorStop(0, 'rgba(14, 20, 40, 0)');
  botGrad.addColorStop(1, 'rgba(14, 20, 40, 0.92)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - botH, W, botH);

  // SideQuests wordmark (top-left)
  const logoSize = Math.max(14, Math.round(W * 0.036));
  ctx.font = `bold ${logoSize}px Poppins, system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('SideQuests', 18, 34);

  // Quest title (top-right)
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

  // Venue name (bottom-left)
  const smallSize = Math.max(11, Math.round(W * 0.028));
  ctx.font = `500 ${smallSize}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.textBaseline = 'middle';
  if (venueName) {
    ctx.fillText(venueName, 18, H - 66);
  }
  ctx.font = `400 ${smallSize}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.60)';
  ctx.fillText('#SideQuests', 18, H - 36);

  // "CAPTURE THE MOMENT" badge pill (bottom-right)
  const badgeLabel = 'CAPTURE THE MOMENT';
  const badgeSize = Math.max(9, Math.round(W * 0.022));
  ctx.font = `bold ${badgeSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(badgeLabel).width;
  const padX = 12;
  const padY = 8;
  const bW = textW + padX * 2;
  const bH = badgeSize + padY * 2;
  const bX = W - bW - 18;
  const bY = H - bH - 24;

  const pillGrad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
  pillGrad.addColorStop(0, 'hsl(6, 89%, 68%)');
  pillGrad.addColorStop(1, 'hsl(174, 100%, 45%)');
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

export function CaptureTheMoment({
  questId,
  questTitle,
  venueName,
  xp,
  reward,
  onDone,
}: CaptureTheMomentProps) {
  const [step, setStep] = useState<Step>('capture');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [composedBlob, setComposedBlob] = useState<Blob | null>(null);
  const [composedUrl, setComposedUrl] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [caption, setCaption] = useState(
    `I just completed "${questTitle}"${venueName ? ` at ${venueName}` : ''} on SideQuests. 🗺️\n@SideQuestsIO #SideQuests`,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const venueStr = venueName ?? '';

  // Camera lifecycle
  const startCamera = useCallback(async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
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

  useEffect(() => {
    if (step !== 'capture') return;
    startCamera();
    return () => stopCamera();
  }, [step, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (composedUrl) URL.revokeObjectURL(composedUrl);
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyOverlay = useCallback(
    async (blob: Blob) => {
      setComposing(true);
      try {
        const composed = await renderMomentOverlay(blob, questTitle, venueStr);
        const url = URL.createObjectURL(composed);
        setComposedBlob(composed);
        setComposedUrl(url);
      } catch {
        const url = URL.createObjectURL(blob);
        setComposedBlob(blob);
        setComposedUrl(url);
      } finally {
        setComposing(false);
      }
    },
    [questTitle, venueStr],
  );

  // Capture still frame from live camera
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      setRawBlob(blob);
      track('capture_moment_photo', { quest_id: questId });
      await applyOverlay(blob);
      setStep('preview');
    }, 'image/webp', 0.92);
  }, [cameraReady, stopCamera, applyOverlay, questId]);

  // Handle file chosen from gallery or file picker
  const handleFileChosen = useCallback(
    async (file: File | null) => {
      if (!file) return;
      stopCamera();
      const isVid = file.type.startsWith('video/');
      track(isVid ? 'capture_moment_video' : 'capture_moment_photo', { quest_id: questId });
      if (isVid) {
        const url = URL.createObjectURL(file);
        setComposedBlob(file);
        setComposedUrl(url);
        setStep('preview');
      } else {
        setRawBlob(file);
        await applyOverlay(file);
        setStep('preview');
      }
    },
    [stopCamera, applyOverlay, questId],
  );

  // Share handlers
  const handleNativeShare = async () => {
    track('capture_moment_share', { quest_id: questId, platform: 'native' });
    try {
      if (composedBlob && navigator.canShare?.({ files: [new File([composedBlob], 'moment.webp', { type: 'image/webp' })] })) {
        await navigator.share({
          files: [new File([composedBlob], 'sidequests-moment.webp', { type: 'image/webp' })],
          text: caption,
        });
      } else {
        await navigator.clipboard.writeText(caption);
        toast.success('Caption copied to clipboard!');
      }
    } catch {
      await navigator.clipboard.writeText(caption).catch(() => {});
      toast.success('Caption copied!');
    }
  };

  const handlePlatformShare = async (platform: 'instagram' | 'tiktok' | 'x') => {
    track('capture_moment_share', { quest_id: questId, platform });
    await navigator.clipboard.writeText(caption).catch(() => {});
    if (platform === 'x') {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(caption)}`, '_blank', 'noopener');
    } else {
      toast.success(`Caption copied — paste it into ${platform === 'instagram' ? 'Instagram' : 'TikTok'}!`);
    }
  };

  const handleDownload = () => {
    if (!composedBlob) return;
    track('capture_moment_download', { quest_id: questId });
    const url = URL.createObjectURL(composedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sidequests-${questTitle.replace(/\s+/g, '-').toLowerCase()}.webp`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Caption copied!');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <button
          onClick={step === 'capture' ? onDone : () => setStep(step === 'share' ? 'preview' : 'capture')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 transition-colors hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Capture the Moment</p>
          <p className="text-xs text-muted-foreground truncate">{questTitle}</p>
        </div>
        <button
          onClick={onDone}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 transition-colors hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Step: Capture */}
      {step === 'capture' && (
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-black">
          {/* Live camera */}
          {!cameraError && (
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn(
                'h-full w-full object-cover transition-opacity duration-300',
                cameraReady ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}

          {/* Camera loading / error state */}
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-white/70">Starting camera…</p>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 text-center">
              <Camera className="h-12 w-12 text-white/30" />
              <p className="text-sm font-medium text-white">Camera not available</p>
              <p className="text-xs text-white/60">Use the gallery button below to pick a photo</p>
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-6 pb-10 pt-16">
            {/* Gallery / native file picker */}
            <div className="flex w-full items-center justify-between">
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur"
                aria-label="Pick from gallery"
              >
                <GalleryIcon className="h-6 w-6 text-white" />
              </button>

              {/* Shutter */}
              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white disabled:opacity-40 active:scale-95 transition-transform"
                aria-label="Take photo"
              >
                <div className="h-16 w-16 rounded-full border-2 border-black/20 bg-white" />
              </button>

              {/* Flip camera */}
              <button
                onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur"
                aria-label="Flip camera"
              >
                <FlipHorizontal className="h-6 w-6 text-white" />
              </button>
            </div>

            <p className="text-center text-xs text-white/60">
              Or{' '}
              <button
                className="underline underline-offset-2"
                onClick={() => fileInputRef.current?.click()}
              >
                upload from your camera roll
              </button>
            </p>
          </div>

          {/* Quest info chip */}
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur">
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-[160px] truncate text-xs font-medium text-white">{questTitle}</span>
          </div>
          {xp && (
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur">
              <Zap className="h-3.5 w-3.5 text-turquoise" />
              <span className="text-xs font-bold text-white">+{xp} XP</span>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {composing ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Adding overlay…</p>
            </div>
          ) : composedUrl ? (
            <>
              <div className="relative flex-1 overflow-hidden bg-black">
                <img
                  src={composedUrl}
                  alt="Your moment"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-3 border-t border-border/40 p-4">
                {/* Quest completion preview */}
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl">
                    📸
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{questTitle}</p>
                    {venueName && <p className="text-xs text-muted-foreground">{venueName}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {xp && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-turquoise">
                        <Zap className="h-3 w-3" /> +{xp} XP
                      </span>
                    )}
                    {reward && (
                      <span className="flex items-center gap-0.5 text-xs text-coral">
                        <Gift className="h-3 w-3" /> {reward}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setComposedUrl(null); setComposedBlob(null); setRawBlob(null); setStep('capture'); }}
                  >
                    Retake
                  </Button>
                  <Button className="flex-1 gap-2" onClick={() => setStep('share')}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Step: Share */}
      {step === 'share' && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {composedUrl && (
            <div className="relative h-52 shrink-0 overflow-hidden bg-black">
              <img src={composedUrl} alt="Your moment" className="h-full w-full object-contain" />
            </div>
          )}

          <div className="flex-1 space-y-4 p-4">
            {/* Caption */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Caption</p>
                <button
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Share buttons */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Share to</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handlePlatformShare('instagram')}
                >
                  <span className="text-base">📸</span>
                  Instagram Story
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handlePlatformShare('tiktok')}
                >
                  <span className="text-base">🎵</span>
                  TikTok
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handlePlatformShare('x')}
                >
                  <span className="text-base">𝕏</span>
                  X / Twitter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleNativeShare}
                >
                  <Share2 className="h-4 w-4" />
                  More…
                </Button>
              </div>
            </div>

            {/* Download */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Save to Device
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Sharing is always optional. Your moment is yours.
            </p>

            <Button className="w-full" onClick={onDone}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CaptureTheMoment;
