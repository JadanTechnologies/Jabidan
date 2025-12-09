import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useHandTracking } from './hooks/useHandTracking';
import { CircularGallery } from './components/CircularGallery';
import { DetailCard } from './components/DetailCard';
import { HandCursor } from './components/HandCursor';
import { GalleryItem } from './types';

// Generate some placeholder images
const INITIAL_ITEMS: GalleryItem[] = Array.from({ length: 10 }).map((_, i) => ({
  src: `https://picsum.photos/600/800?random=${i + 10}`,
  title: `Memory Fragment #${i + 1}`,
  index: i
}));

function App() {
  const { videoRef, cursor, cursorRef } = useHandTracking();
  const [items, setItems] = useState<GalleryItem[]>(INITIAL_ITEMS);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Memoize URLs for the gallery component
  const itemUrls = useMemo(() => items.map(item => item.src), [items]);

  const handleItemSelect = useCallback((index: number) => {
    setSelectedItemIndex(prev => {
      if (prev !== null) {
        return null; 
      } else {
        return index;
      }
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: GalleryItem[] = Array.from(e.target.files).map((file: any, i) => ({
        src: URL.createObjectURL(file),
        title: file.name.split('.')[0],
        index: i // Reset indices
      }));
      
      setItems(newItems);
      setSelectedItemIndex(null);
    }
  };

  // Swipe Down to Close Logic
  const lastYRef = useRef(0);
  const swipeCooldownRef = useRef(0);

  useEffect(() => {
    // Only detect swipe if detail is open and cursor is visible
    if (selectedItemIndex !== null && cursor.isVisible) {
      const now = Date.now();
      
      // Calculate delta Y
      const deltaY = cursor.y - lastYRef.current;
      
      // Threshold for "Swipe Down"
      // Normalized coordinates: 0 (top) -> 1 (bottom). Positive delta = Down.
      // Adjusted threshold to 0.03 for slightly better responsiveness
      if (deltaY > 0.03 && now - swipeCooldownRef.current > 800) {
         setSelectedItemIndex(null);
         swipeCooldownRef.current = now;
      }
    }
    lastYRef.current = cursor.y;
  }, [cursor, selectedItemIndex]);


  return (
    <div className="relative w-full h-screen bg-[#020405] overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* Hidden Webcam Feed (Required for MediaPipe) */}
      <div className="absolute top-4 left-4 z-40 w-32 h-24 rounded-lg overflow-hidden border border-cyan-500/20 opacity-50 hover:opacity-100 transition-opacity pointer-events-none">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover transform -scale-x-100 opacity-60 mix-blend-screen" // Mirror for user preview
          autoPlay 
          playsInline 
          muted 
        />
        <div className="absolute inset-0 border border-cyan-500/30 rounded-lg pointer-events-none" />
        <div className="absolute bottom-1 left-2 text-[8px] text-cyan-400 bg-black/50 px-1 rounded font-mono">
          SYS.OPTICAL_SENSOR
        </div>
      </div>

      {/* UI Overlay Instructions */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30 text-center pointer-events-none">
        <h1 className="text-cyan-400 text-3xl font-light tracking-[0.3em] mb-2 uppercase drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">Aether Interface</h1>
        <p className="text-cyan-600/60 text-xs font-mono tracking-widest">
          SYSTEM READY • WAITING FOR GESTURAL INPUT
        </p>
      </div>

      {/* Upload Button */}
      <div className="absolute bottom-8 right-8 z-40">
        <label className="cursor-pointer bg-cyan-950/30 hover:bg-cyan-900/40 backdrop-blur-md text-cyan-400 px-6 py-3 border border-cyan-500/30 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] group relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
           <div className="absolute top-0 right-0 w-1 h-2 bg-cyan-500" />
           <div className="absolute bottom-0 right-0 w-1 h-2 bg-cyan-500" />
           
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <span className="group-hover:text-cyan-300 transition-colors font-mono text-sm tracking-wider">IMPORT_DATA</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:text-cyan-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </label>
      </div>

      {/* The 3D Gallery */}
      <CircularGallery 
        items={itemUrls} 
        cursorRef={cursorRef} 
        onItemSelect={handleItemSelect}
        selectedIndex={selectedItemIndex}
      />

      {/* Detail Overlay */}
      <DetailCard 
        isOpen={selectedItemIndex !== null} 
        item={selectedItemIndex !== null ? items[selectedItemIndex] : null} 
      />

      {/* Hand Cursor Overlay */}
      <HandCursor cursor={cursor} />
      
      {/* Edge Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,5,10,0.9)_100%)] z-10" />
      
    </div>
  );
}

export default App;
