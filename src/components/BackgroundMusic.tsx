import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';

interface BackgroundMusicProps {
  url?: string;
  volume?: number;
  enabled?: boolean;
}

export default function BackgroundMusic({ url, volume = 0.5, enabled = true }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!audioRef.current || !url || !enabled) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (hasInteracted) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.warn("Autoplay was prevented:", err);
            setIsPlaying(false);
          });
      }
    }
  }, [url, enabled, hasInteracted]);

  if (!url || !enabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <audio
        ref={audioRef}
        src={url}
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        onClick={() => setIsMuted(!isMuted)}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl backdrop-blur-md",
          isMuted 
            ? "bg-slate-800/80 text-slate-400 scale-90" 
            : "bg-indigo-600/90 text-white hover:scale-110 shadow-indigo-500/20"
        )}
        title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} className={isPlaying ? "animate-pulse" : ""} />}
        
        {isPlaying && !isMuted && (
          <div className="absolute -inset-1 border-2 border-indigo-400 rounded-full animate-ping opacity-20 pointer-events-none" />
        )}
      </button>
    </div>
  );
}
