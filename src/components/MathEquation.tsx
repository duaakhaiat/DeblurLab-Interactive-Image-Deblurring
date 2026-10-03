import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathEquationProps {
  equation: string;
  block?: boolean;
  className?: string;
}

export function MathEquation({ equation, block = false, className = '' }: MathEquationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(equation, containerRef.current, {
        displayMode: block,
        throwOnError: false,
      });
    }
  }, [equation, block]);

  return <div ref={containerRef} className={className} />;
}
