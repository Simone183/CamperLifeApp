import React from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCw, Move } from 'lucide-react';

interface ProfilePhotoCropperProps {
  imageSrc: string;
  onCrop: (croppedImageBase64: string) => void;
  onCancel: () => void;
  aspect?: 'circle' | 'rect';
  title?: string;
}

export default function ProfilePhotoCropper({
  imageSrc,
  onCrop,
  onCancel,
  aspect = 'circle',
  title = 'Ritaglia Foto',
}: ProfilePhotoCropperProps) {
  const [zoom, setZoom] = React.useState<number>(1);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = React.useState<number>(0); // 0, 90, 180, 270

  const containerRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  const [baseSize, setBaseSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerSize = 260; // size of the square preview window
  const cropSize = 200; // diameter or width/height of the crop area

  // When image loads, calculate base dimensions to cover the crop area
  const handleImageLoad = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const imageRatio = naturalWidth / naturalHeight;

    let displayWidth = cropSize;
    let displayHeight = cropSize;

    if (imageRatio > 1) {
      // Landscape: match height to cropSize, scale width
      displayHeight = cropSize;
      displayWidth = cropSize * imageRatio;
    } else {
      // Portrait or square: match width to cropSize, scale height
      displayWidth = cropSize;
      displayHeight = cropSize / imageRatio;
    }

    setBaseSize({ width: displayWidth, height: displayHeight });
    setOffset({ x: 0, y: 0 });
    setZoom(1.2); // Start with a slight comfortable zoom
    setRotation(0);
  };

  // Drag handlers (Mouse + Touch)
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = {
      x: clientX - offset.x,
      y: clientY - offset.y,
    };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const nextX = clientX - dragStart.current.x;
    const nextY = clientY - dragStart.current.y;

    setOffset({ x: nextX, y: nextY });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Perform rotation
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 }); // reset offset on rotate to avoid flying away
  };

  // Generate cropped image Base64
  const handleConfirm = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    // Canvas size for high-res avatar/document output
    const outputSize = 400;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Scaling factor from cropSize to outputSize
    const ratio = outputSize / cropSize;

    // Image size scaled to zoom
    const currentWidth = baseSize.width * zoom;
    const currentHeight = baseSize.height * zoom;

    // Center of crop viewport relative to the image
    // In viewport coords, the image is rendered with top/left:
    const left = (containerSize - currentWidth) / 2 + offset.x;
    const top = (containerSize - currentHeight) / 2 + offset.y;

    // The crop area bounds centered in the viewport
    const cropLeft = (containerSize - cropSize) / 2;
    const cropTop = (containerSize - cropSize) / 2;

    // Position of the image relative to the top-left of the crop area:
    const relativeLeft = left - cropLeft;
    const relativeTop = top - cropTop;

    // Draw on canvas scaled up to high-res
    const drawLeft = relativeLeft * ratio;
    const drawTop = relativeTop * ratio;
    const drawWidth = currentWidth * ratio;
    const drawHeight = currentHeight * ratio;

    // Apply rotation on canvas if rotation > 0
    if (rotation !== 0) {
      ctx.save();
      // Translate to the center of the drawn image
      const centerX = drawLeft + drawWidth / 2;
      const centerY = drawTop + drawHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    } else {
      ctx.drawImage(img, drawLeft, drawTop, drawWidth, drawHeight);
    }

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
    onCrop(croppedBase64);
  };

  // Calculations for styled render
  const currentWidth = baseSize.width * zoom;
  const currentHeight = baseSize.height * zoom;
  const left = (containerSize - currentWidth) / 2 + offset.x;
  const top = (containerSize - currentHeight) / 2 + offset.y;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
            {title}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropping Workspace */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40">
          
          {/* Main Visual Crop Box */}
          <div
            ref={containerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handleEnd}
            className="relative bg-slate-950 overflow-hidden rounded-2xl cursor-move shadow-inner"
            style={{ width: containerSize, height: containerSize }}
          >
            {/* The Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Cropping"
              onLoad={handleImageLoad}
              className="absolute max-w-none pointer-events-none origin-center"
              style={{
                width: currentWidth,
                height: currentHeight,
                left: left,
                top: top,
                transform: `rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out, left 0.1s ease-out, top 0.1s ease-out',
              }}
            />

            {/* Spotlight overlay with box shadow trick */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div 
                className={`${aspect === 'circle' ? 'rounded-full' : 'rounded-2xl'} border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] flex items-center justify-center relative`}
                style={{ width: cropSize, height: cropSize }}
              >
                {/* Visual indicator lines in center */}
                <div className={`absolute inset-0 border border-white/20 pointer-events-none ${aspect === 'circle' ? 'rounded-full' : 'rounded-xl'}`} />
                <Move className="w-6 h-6 text-white/40 animate-pulse absolute" />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium mt-3 text-center flex items-center gap-1.5">
            <span>🖐️ trascina per spostare la foto</span>
          </p>

          {/* Controls Panel */}
          <div className="w-full mt-6 space-y-4">
            
            {/* Zoom Slider with Icons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                className="p-1 text-slate-400 hover:text-[#3E4A35] dark:hover:text-emerald-400 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              <input
                type="range"
                min="0.6"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#3E4A35] dark:accent-emerald-400"
              />

              <button
                onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
                className="p-1 text-slate-400 hover:text-[#3E4A35] dark:hover:text-emerald-400 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotation and Helper Tools */}
            <div className="flex justify-center gap-2">
              <button
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Ruota 90°
              </button>

              <button
                onClick={() => {
                  setZoom(1.2);
                  setOffset({ x: 0, y: 0 });
                  setRotation(0);
                }}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
              >
                Ripristina
              </button>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            Annulla
          </button>
          
          <button
            onClick={handleConfirm}
            className="h-10 px-5 bg-[#3E4A35] hover:bg-[#2C3526] text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-slate-900/10 cursor-pointer transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            Salva Foto
          </button>
        </div>

      </div>
    </div>
  );
}
