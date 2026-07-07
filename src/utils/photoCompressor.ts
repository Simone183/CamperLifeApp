export function compressImage(base64Str: string, quality: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      // Determine max dimension and compression factor
      let maxDim = 2048;
      let compressionRatio = 0.9;
      if (quality === 'medium') {
        maxDim = 1200;
        compressionRatio = 0.7;
      } else if (quality === 'low') {
        maxDim = 800;
        compressionRatio = 0.5;
      } else if (quality === 'high') {
        maxDim = 1920;
        compressionRatio = 0.85;
      }

      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Determine MIME type
      let mimeType = 'image/jpeg';
      if (base64Str.startsWith('data:image/png')) {
        mimeType = 'image/png';
      } else if (base64Str.startsWith('data:image/webp')) {
        mimeType = 'image/webp';
      }

      const compressedBase64 = canvas.toDataURL(mimeType, compressionRatio);
      resolve(compressedBase64);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
