import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RedditVideo } from '../services/redditService';
import { SkeletonLoader } from './SkeletonLoader';

interface VideoCardProps {
  video: RedditVideo;
  isActive: boolean;
  shouldLoad: boolean;
  isGlobalMuted: boolean;
  onMuteToggle: (muted: boolean) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, shouldLoad, isGlobalMuted, onMuteToggle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Haptic feedback helper
  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'light' ? 10 : 20);
    }
  };

  // Sync with global mute
  useEffect(() => {
    setIsLocalMuted(isGlobalMuted);
  }, [isGlobalMuted]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isLocalMuted;
    }
  }, [isLocalMuted]);

  useEffect(() => {
    if (videoRef.current && shouldLoad) {
      if (isActive) {
        if (isPlaying) {
          // Use a promise to handle play() and catch errors for weak networks
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.log("Playback failed, retrying...", e);
              // If playback fails, it might be a network issue or autoplay policy
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.play().catch(err => console.log("Retry failed", err));
              }
            });
          }
        } else {
          videoRef.current.pause();
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(true); 
      }
    }
  }, [isActive, isPlaying, shouldLoad]);

  const togglePlay = () => {
    triggerHaptic('light');
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  return (
    <div className="relative h-screen w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      {/* Video Element */}
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnail}
          className="h-full w-full object-cover cursor-pointer"
          loop
          playsInline
          preload="auto"
          muted={isLocalMuted}
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onTimeUpdate={handleTimeUpdate}
          onClick={handleVideoClick}
        />
      ) : (
        <div className="h-full w-full bg-black">
           <SkeletonLoader />
        </div>
      )}

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-40">
        <motion.div 
          className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{ width: `${progress}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
        />
      </div>

      {/* Loading State */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <AnimatePresence>
          {!isLoaded && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <SkeletonLoader />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Volume/Play Indicator (Feedback on click) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <AnimatePresence mode="wait">
          {!isPlaying && (
            <motion.div
              key="paused"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="bg-black/40 p-6 rounded-full"
            >
              <Play className="w-12 h-12 text-white fill-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
