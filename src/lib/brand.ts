import wordmarkUrl from '../../brand/logos/wordmark-reverse.svg';

let wordmarkImage: Promise<HTMLImageElement> | undefined;

/** Draw the actual approved lettering on exported photos, rather than typesetting it. */
export async function drawPhotoWordmark(ctx: CanvasRenderingContext2D, canvasWidth: number) {
  wordmarkImage ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      wordmarkImage = undefined;
      reject(new Error('Could not load the sidequests wordmark'));
    };
    image.src = wordmarkUrl;
  });

  const image = await wordmarkImage;
  const width = Math.min(220, canvasWidth * 0.34);
  const height = width * image.naturalHeight / image.naturalWidth;
  ctx.drawImage(image, 18, 34 - height / 2, width, height);
  return 18 + width;
}
