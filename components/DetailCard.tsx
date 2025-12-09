import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DetailCardProps {
  isOpen: boolean;
  item: { src: string; title: string; index: number } | null;
}

const CornerBracket = ({ className }: { className?: string }) => (
  <svg className={`absolute w-8 h-8 text-cyan-500 ${className}`} viewBox="0 0 40 40" fill="none">
    <path d="M2 38V2H38" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const TechnicalLine = ({ className }: { className?: string }) => (
  <div className={`absolute h-[1px] bg-cyan-500/40 w-full ${className}`}>
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
  </div>
);

export const DetailCard: React.FC<DetailCardProps> = ({ isOpen, item }) => {
  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Holographic Grid Backdrop */}
          <motion.div 
             className="absolute inset-0 bg-black/80 backdrop-blur-md"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
          >
             <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
          </motion.div>

          <motion.div
            layoutId={`card-${item.index}`}
            initial={{ scale: 0.8, opacity: 0, rotateX: 20 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateX: 20 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            className="relative p-1 max-w-2xl w-[90%] md:w-auto overflow-hidden pointer-events-auto group"
          >
            {/* Outer Glow */}
            <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-lg" />

            {/* Main HUD Container */}
            <div className="relative bg-[#050a10]/90 border border-cyan-500/30 p-6 rounded-sm shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              
              {/* Corner Brackets */}
              <CornerBracket className="top-0 left-0" />
              <CornerBracket className="top-0 right-0 rotate-90" />
              <CornerBracket className="bottom-0 right-0 rotate-180" />
              <CornerBracket className="bottom-0 left-0 -rotate-90" />

              {/* Header Data */}
              <div className="flex justify-between items-center mb-4 text-xs font-mono tracking-widest text-cyan-400/80 uppercase">
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 bg-cyan-500 animate-pulse rounded-full" />
                   <span>ARCHIVE_REF: 00{item.index}</span>
                </div>
                <div>SECURE_CONNECTION // VERIFIED</div>
              </div>

              <TechnicalLine className="top-14 left-0" />

              {/* Image Container with Scan Effect */}
              <div className="relative overflow-hidden border-x border-cyan-500/20 my-4 bg-black">
                <motion.img 
                  src={item.src} 
                  alt={item.title} 
                  className="w-full max-h-[60vh] object-cover opacity-90 sepia-[.2] hue-rotate-180 saturate-[.5]"
                  layoutId={`img-${item.index}`}
                />
                
                {/* Image Overlay Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
                
                {/* Scanning Laser */}
                <motion.div 
                  className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] z-10"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay" />
              </div>

              <TechnicalLine className="bottom-24 left-0" />

              {/* Footer Info */}
              <div className="flex flex-col items-center justify-center mt-6 text-cyan-100 font-mono relative">
                 <motion.h2 
                   className="text-2xl font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                 >
                   {item.title}
                 </motion.h2>
                 
                 <div className="flex items-center gap-4 mt-2 text-[10px] text-cyan-500/60 uppercase tracking-[0.2em]">
                    <span>Res: 1080p</span>
                    <span>•</span>
                    <span>Size: 24MB</span>
                    <span>•</span>
                    <span>Enc: H.265</span>
                 </div>

                 {/* Gesture Instruction */}
                 <motion.div 
                   className="mt-6 flex flex-col items-center gap-2"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.5 }}
                 >
                   <div className="w-8 h-12 border-2 border-cyan-500/30 rounded-full relative overflow-hidden">
                      <motion.div 
                        className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                        animate={{ top: ['10%', '60%', '10%'], opacity: [1, 0, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                   </div>
                   <span className="text-xs text-cyan-400 font-bold tracking-widest animate-pulse">SWIPE DOWN TO CLOSE</span>
                 </motion.div>
              </div>

              {/* Decorative Random Numbers */}
              <div className="absolute right-4 bottom-24 flex flex-col items-end text-[8px] text-cyan-500/30 font-mono leading-tight pointer-events-none">
                 {Array.from({ length: 4 }).map((_, i) => (
                   <div key={i}>{Math.random().toString(16).substr(2, 8).toUpperCase()}</div>
                 ))}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
