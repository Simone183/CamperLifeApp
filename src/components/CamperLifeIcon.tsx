import React from 'react';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

interface CamperLifeIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
  className?: string;
}

export function CamperLifeIcon({ size = 44, className, style, alt = "ViaCamper", ...props }: CamperLifeIconProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <div
        style={{ width: dimension, height: dimension, ...style }}
        className={`rounded-full bg-[#3E4A35] flex items-center justify-center text-white font-black text-xs ${className || ''}`}
      >
        VC
      </div>
    );
  }

  return (
    <img
      src={resolveMediaUrl("/logo.png")}
      alt={alt}
      onError={() => setHasError(true)}
      style={{ width: dimension, height: dimension, objectFit: 'contain', ...style }}
      className={`rounded-full ${className || ''}`}
      {...props}
    />
  );
}

export const ViaCamperIcon = CamperLifeIcon;

