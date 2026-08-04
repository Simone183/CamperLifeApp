import React from 'react';

interface CamperLifeIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
  className?: string;
}

export function CamperLifeIcon({ size = 44, className, style, alt = "ViaCamper Logo", ...props }: CamperLifeIconProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/logo.png"
      alt={alt}
      style={{ width: dimension, height: dimension, objectFit: 'contain', ...style }}
      className={`rounded-full ${className || ''}`}
      {...props}
    />
  );
}
