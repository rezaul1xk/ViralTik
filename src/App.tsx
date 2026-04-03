import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RedditService, RedditVideo } from './services/redditService';
import { VideoCard } from './components/VideoCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { Heart, Zap, Venus, AlertTriangle, XCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const redditService = new RedditService();

// Age Verification Modal Component
const AgeVerificationModal: React.FC<{ 
  isOpen: boolean; 
  onConfirm: () => void; 
  onCancel: () => void; 
}> = ({ isOpen, onConfirm, onCancel }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl"
      >
        <motion.div
          initial={{ scale: 0.8, y: 40, opacity: 0, rotateX: 20 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.8, y: 40, opacity: 0, rotateX: 20 }}
          className="relative w-full max-w-md bg-zinc-900/40 border border-white/10 rounded-[40px] p-10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] perspective-1000"
        >
          {/* Futuristic Background Accents */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-pink-600/30 blur-[100px] rounded-full animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/30 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-inner">
              <AlertTriangle className="text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" size={40} />
            </div>
            
            <h2 className="text-3xl font-black text-white mb-6 tracking-tighter leading-none">
              RESTRICTED<br />
              <span className="text-pink-500">CONTENT</span>
            </h2>
            
            <p className="text-zinc-400 text-sm leading-relaxed mb-10 font-medium">
              This section contains adult content which is strictly for users <span className="text-white font-bold underline decoration-pink-500 underline-offset-4">18 years or older</span>. 
              It may be harmful or inappropriate for children.
              <br /><br />
              Do you accept the terms and verify your age?
            </p>
            
            <div className="grid grid-cols-3 gap-4 w-full">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onCancel}
                className="h-20 bg-white/5 border border-white/10 rounded-3xl text-2xl font-black text-zinc-600 transition-all flex items-center justify-center"
              >
                1
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(236,72,153,0.6)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onConfirm}
                className="h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl text-4xl font-black text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] border border-white/20 flex items-center justify-center"
              >
                X
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onCancel}
                className="h-20 bg-white/5 border border-white/10 rounded-3xl text-2xl font-black text-zinc-600 transition-all flex items-center justify-center"
              >
                K
              </motion.button>
            </div>
            
            <p className="mt-8 text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black">
              SECURE VERIFICATION REQUIRED
            </p>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(type === 'light' ? 10 : 20);
  }
};

interface CategoryButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ icon, label, color, isActive, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${isActive ? 'bg-white/20 backdrop-blur-xl border-white/30 scale-105' : 'bg-transparent border-transparent opacity-60 hover:opacity-100'}`}
  >
    <div className={`${color} ${isActive ? 'scale-110' : ''} transition-transform duration-300`}>
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
    </div>
    <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-white' : 'text-white/70'}`}>
      {label}
    </span>
  </motion.button>
);

export default function App() {
  const [videos, setVideos] = useState<RedditVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('Viral');
  const [isGlobalMuted, setIsGlobalMuted] = useState(false); // Default to unmuted
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const touchStart = useRef(0);

  const scrollToVideo = useCallback((index: number) => {
    if (!containerRef.current || isScrolling.current || index < 0) return;
    
    // If we're getting close to the end, load more
    if (index >= videos.length - 5) {
      loadMore();
    }

    if (index >= videos.length) return;

    isScrolling.current = true;
    setActiveIndex(index);
    
    // Reset scrolling flag after animation completes
    setTimeout(() => {
      isScrolling.current = false;
    }, 800); // Matches motion transition duration roughly
  }, [videos.length]);

  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling.current || showAgeModal) return;
    
    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0) {
        scrollToVideo(activeIndex + 1);
      } else {
        scrollToVideo(activeIndex - 1);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isScrolling.current || showAgeModal) return;
    
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart.current - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        scrollToVideo(activeIndex + 1);
      } else {
        scrollToVideo(activeIndex - 1);
      }
    }
  };

  const toggleGlobalMute = () => {
    setIsGlobalMuted(!isGlobalMuted);
  };

  const loadMore = useCallback(async (isInitial = false) => {
    if (loading) return;
    try {
      setLoading(true);
      const newVideos = await redditService.fetchVideos();
      if (newVideos && Array.isArray(newVideos)) {
        setVideos(prev => isInitial ? newVideos : [...prev, ...newVideos]);
      }
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    loadMore(true);
  }, []);

  const handleCategoryChange = async (category: string) => {
    if (loading) return;
    
    const isRefresh = category === currentCategory;

    if (category === '18+' && !isAgeVerified) {
      setShowAgeModal(true);
      return;
    }

    triggerHaptic('medium');
    
    if (!isRefresh) {
      setCurrentCategory(category);
    }
    
    setVideos([]);
    setActiveIndex(0);
    
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    
    redditService.setCategory(category, isRefresh);
    
    setLoading(true);
    const newVideos = await redditService.fetchVideos();
    setVideos(newVideos || []);
    setLoading(false);
  };

  const confirmAge = () => {
    triggerHaptic('medium');
    setIsAgeVerified(true);
    setShowAgeModal(false);
    handleCategoryChange('18+');
  };

  const cancelAge = () => {
    triggerHaptic('light');
    setShowAgeModal(false);
    handleCategoryChange('Viral');
  };

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col">
      {/* Age Verification Modal */}
      <AgeVerificationModal 
        isOpen={showAgeModal} 
        onConfirm={confirmAge} 
        onCancel={cancelAge} 
      />

      {/* Mobile-Native Category Header */}
      <div className="absolute top-0 left-0 right-0 pt-10 pb-4 px-4 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 p-1 bg-black/10 backdrop-blur-md rounded-full border border-white/5 shadow-xl">
          <CategoryButton 
            icon={<Zap />} 
            label="Viral" 
            color="text-yellow-400" 
            isActive={currentCategory === 'Viral'}
            onClick={() => handleCategoryChange('Viral')}
          />
          <CategoryButton 
            icon={<Venus />} 
            label="18+" 
            color="text-pink-500" 
            isActive={currentCategory === '18+'}
            onClick={() => handleCategoryChange('18+')}
          />
        </div>
      </div>

      {/* Floating Auto Scroll Toggle (Right Side) */}
      <div className="absolute right-4 top-[40%] -translate-y-1/2 z-50 flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          {/* Blinking/Pulsing Circle */}
          {isAutoScroll && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute w-16 h-16 rounded-full border-2 border-green-500/50"
            />
          )}
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              triggerHaptic('medium');
              setIsAutoScroll(!isAutoScroll);
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border relative z-10 ${
              isAutoScroll 
                ? 'bg-green-500/20 border-green-500/50 backdrop-blur-xl shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                : 'bg-white/5 border-white/10 backdrop-blur-md'
            }`}
          >
            <motion.div
              animate={{ 
                rotate: isAutoScroll ? 0 : -90,
                color: isAutoScroll ? '#4ade80' : 'rgba(255, 255, 255, 0.7)'
              }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown size={28} strokeWidth={3} />
            </motion.div>
          </motion.button>
        </div>
        
        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isAutoScroll ? 'text-green-400' : 'text-white/30'}`}>
          {isAutoScroll ? 'Auto' : 'Off'}
        </span>
      </div>

      {/* Vertical Video Feed */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-hidden no-scrollbar relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <motion.div
          animate={{ y: -activeIndex * 100 + 'vh' }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 25,
            mass: 1,
            restDelta: 0.001
          }}
          className="h-full w-full"
        >
          {videos.map((video, index) => (
            <VideoCard 
              key={`${video.id}-${index}`} 
              video={video} 
              isActive={index === activeIndex} 
              shouldLoad={Math.abs(index - activeIndex) <= 6} // Preload 6 videos ahead
              isGlobalMuted={isGlobalMuted}
              onMuteToggle={setIsGlobalMuted}
              onAutoSkip={() => {
                if (index === activeIndex) {
                  scrollToVideo(activeIndex + 1);
                }
              }}
              onEnded={() => {
                if (isAutoScroll && index === activeIndex) {
                  scrollToVideo(activeIndex + 1);
                }
              }}
              loop={!isAutoScroll}
            />
          ))}
        </motion.div>

        {loading && videos.length === 0 && (
          <div className="absolute inset-0 bg-black z-50">
            <SkeletonLoader />
          </div>
        )}
        
        {!loading && videos.length === 0 && (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-black p-6 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Zap className="text-white/20" size={32} />
            </div>
            <p className="text-white font-medium mb-2">No videos found</p>
            <p className="text-white/40 mb-8 text-sm max-w-[240px]">
              We couldn't fetch any videos from Reddit right now. This might be due to a temporary API block.
            </p>
            <button 
              onClick={() => {
                triggerHaptic('medium');
                loadMore(true);
              }}
              className="bg-white text-black px-8 py-3 rounded-full font-bold text-sm active:scale-95 transition-transform"
            >
              Try Again
            </button>
          </div>
        )}

        {loading && (
          <div className="h-screen w-full bg-black">
            <SkeletonLoader />
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
