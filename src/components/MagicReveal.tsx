import React, { useEffect, useRef } from 'react';

interface MagicRevealProps {
  beforeImage: string;
  afterImage: string;
  duration?: number; // in ms
  onAnimationEnd?: () => void;
}

export const MagicReveal: React.FC<MagicRevealProps> = ({
  beforeImage,
  afterImage,
  duration = 1500,
  onAnimationEnd
}) => {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (revealRef.current) {
      revealRef.current.animate([
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)' }
      ], {
        duration,
        easing: 'ease-in-out',
        fill: 'forwards'
      }).onfinish = () => {
        if (onAnimationEnd) onAnimationEnd();
      };
    }
  }, [duration, onAnimationEnd]);

  return (
    <div className="relative w-full h-full">
      {/* Before image */}
      <img
        src={beforeImage}
        alt="Original"
        className="w-full h-full object-contain absolute inset-0 z-0"
        draggable={false}
      />
      {/* Animated reveal of after image */}
      <div
        ref={revealRef}
        className="absolute inset-0 z-10 overflow-hidden"
        style={{ clipPath: 'inset(0 100% 0 0)' }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="magic-reveal-shimmer" />
        </div>
        <img
          src={afterImage}
          alt="Background Removed"
          className="w-full h-full object-contain relative z-10"
          draggable={false}
        />
      </div>
    </div>
  );
}; 