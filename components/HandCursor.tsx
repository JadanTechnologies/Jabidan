import React from 'react';
import { HandCursor as HandCursorType } from '../types';

interface HandCursorProps {
  cursor: HandCursorType;
}

export const HandCursor: React.FC<HandCursorProps> = ({ cursor }) => {
  if (!cursor.isVisible) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none flex items-center justify-center transition-transform duration-75 ease-out"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${cursor.x * window.innerWidth}px, ${cursor.y * window.innerHeight}px, 0)`,
      }}
    >
      <div 
        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          cursor.isPinching 
            ? 'bg-white/90 border-emerald-400 scale-75' 
            : 'bg-transparent border-white/50 scale-100'
        }`}
      >
        <div className={`w-2 h-2 bg-emerald-400 rounded-full ${cursor.isPinching ? 'opacity-100' : 'opacity-50'}`} />
      </div>
      
      {/* Direction indicators */}
      {cursor.x < 0.4 && (
        <div className="absolute left-16 text-emerald-400 font-bold tracking-widest text-sm whitespace-nowrap opacity-70">
           &lt;&lt; SCROLL
        </div>
      )}
      {cursor.x > 0.6 && (
        <div className="absolute right-16 text-emerald-400 font-bold tracking-widest text-sm whitespace-nowrap opacity-70">
           SCROLL &gt;&gt;
        </div>
      )}
    </div>
  );
};
