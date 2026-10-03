import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function NeuralNetAnim() {
  const [activeLayer, setActiveLayer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLayer((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const layers = [4, 6, 6, 3];

  return (
    <div className="flex items-center justify-between w-full max-w-sm mx-auto h-48 relative">
      {layers.map((nodeCount, layerIdx) => (
        <div key={layerIdx} className="flex flex-col justify-around h-full z-10">
          {Array.from({ length: nodeCount }).map((_, nodeIdx) => (
            <motion.div
              key={nodeIdx}
              className={`w-3 h-3 rounded-full border ${
                activeLayer === layerIdx
                  ? 'bg-primary border-primary shadow-[0_0_10px_rgba(139,92,246,0.8)]'
                  : 'bg-background border-muted-foreground'
              }`}
              animate={{
                scale: activeLayer === layerIdx ? 1.2 : 1,
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      ))}
      {/* SVG for edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <g stroke="currentColor" strokeOpacity="0.1" strokeWidth="1">
          {/* Abstract connections */}
          <line x1="10%" y1="20%" x2="40%" y2="50%" />
          <line x1="10%" y1="50%" x2="40%" y2="50%" />
          <line x1="10%" y1="80%" x2="40%" y2="50%" />
          
          <line x1="40%" y1="20%" x2="70%" y2="50%" />
          <line x1="40%" y1="50%" x2="70%" y2="20%" />
          <line x1="40%" y1="80%" x2="70%" y2="80%" />
          
          <line x1="70%" y1="20%" x2="90%" y2="50%" />
          <line x1="70%" y1="50%" x2="90%" y2="50%" />
          <line x1="70%" y1="80%" x2="90%" y2="50%" />
        </g>
      </svg>
    </div>
  );
}
