import React, { useRef, useState, useEffect } from 'react';

interface ImageComparisonProps {
  beforeSrc: string | null;
  afterSrc: string | null;
}

export function ImageComparison({ beforeSrc, afterSrc }: ImageComparisonProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  useEffect(() => {
    const onMouseUp = () => document.removeEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onMouseUp);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onMouseUp);
    };
  }, []);

  if (!beforeSrc || !afterSrc) {
    return <div className="w-full h-full bg-muted/20 flex items-center justify-center text-muted-foreground">No image data</div>;
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none cursor-ew-resize"
      onMouseDown={(e) => {
        handleMove(e);
        document.addEventListener('mousemove', handleMove);
      }}
      onTouchStart={(e) => {
        handleMove(e);
        document.addEventListener('touchmove', handleMove);
      }}
    >
      <img src={afterSrc} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="After" />
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden" 
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img src={beforeSrc} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="Before" />
      </div>
      <div 
        className="absolute top-0 bottom-0 w-1 bg-primary/80 shadow-[0_0_10px_rgba(139,92,246,0.8)] cursor-ew-resize flex items-center justify-center z-10"
        style={{ left: `calc(${sliderPos}% - 2px)` }}
      >
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <div className="flex space-x-0.5">
            <div className="w-0.5 h-3 bg-background rounded-full" />
            <div className="w-0.5 h-3 bg-background rounded-full" />
          </div>
        </div>
      </div>
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs font-mono text-primary border border-primary/20">
        Blurred
      </div>
      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs font-mono text-accent border border-accent/20">
        Restored
      </div>
    </div>
  );
}
