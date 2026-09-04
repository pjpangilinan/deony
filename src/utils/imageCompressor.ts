/**
 * Utility to resize and compress images client-side before sending to server or S3.
 * Prevents 413 Payload Too Large errors and keeps upload times snappy.
 */
export async function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file must be an image (JPEG, PNG, WebP, etc.).'));
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        return reject(new Error('Could not read image data.'));
      }
      img.src = e.target.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file from disk.'));
    };

    img.onload = () => {
      try {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Unable to initialize image processor canvas.'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err: any) {
        reject(new Error(`Failed to compress image: ${err?.message || err}`));
      }
    };

    img.onerror = () => {
      reject(new Error('The selected image file is corrupted or unsupported.'));
    };

    reader.readAsDataURL(file);
  });
}
