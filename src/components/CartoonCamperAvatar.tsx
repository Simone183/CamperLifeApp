import React from 'react';
import { RollyMascotIcon, RollyMascotIconProps } from './RollyMascotIcon';

export interface CartoonCamperAvatarProps extends RollyMascotIconProps {
  className?: string;
  size?: number;
}

export const CartoonCamperAvatar: React.FC<CartoonCamperAvatarProps> = ({
  className = "w-10 h-10",
  size,
  animate = true,
  waving = false,
  accessory = 'none',
  showSpeechBubble,
  speechText,
  onClick,
}) => {
  return (
    <RollyMascotIcon
      className={className}
      size={size}
      animate={animate}
      waving={waving}
      accessory={accessory}
      showSpeechBubble={showSpeechBubble}
      speechText={speechText}
      onClick={onClick}
    />
  );
};

