import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RedditService, RedditVideo } from './services/redditService';
import { VideoCard } from './components/VideoCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { Flame, Zap } from 'lucide-react';
import { motion } from 'motion/react';

const redditService = new RedditService();

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
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (category === currentCategory || loading) return;
    
    triggerHaptic('medium');
    setCurrentCategory(category);
    setVideos([]);
    setActiveIndex(0);
    
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    
    redditService.setCategory(category);
    
    setLoading(true);
    const newVideos = await redditService.fetchVideos();
    setVideos(newVideos);
    setLoading(false);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const index = Math.round(scrollTop / height);
    
    if (index !== activeIndex) {
      setActiveIndex(index);
    }

    // Aggressive preloading: load more when 10 videos ahead
    if (scrollTop + height * 10 >= containerRef.current.scrollHeight) {
      loadMore();
    }
  };

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col">
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
            icon={<Flame />} 
            label="Hot" 
            color="text-orange-500" 
            isActive={currentCategory === 'Hot'}
            onClick={() => handleCategoryChange('Hot')}
          />
        </div>
      </div>

      {/* Vertical Video Feed */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {loading && videos.length === 0 && (
          <div className="h-screen w-full bg-black">
            <SkeletonLoader />
          </div>
        )}

        {videos.map((video, index) => (
          <VideoCard 
            key={`${video.id}-${index}`} 
            video={video} 
            isActive={index === activeIndex} 
            shouldLoad={Math.abs(index - activeIndex) <= 6} // Preload 6 videos ahead
            isGlobalMuted={isGlobalMuted}
            onMuteToggle={setIsGlobalMuted}
          />
        ))}
        
        {!loading && videos.length === 0 && (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-black p-6 text-center">
            <p className="text-white/60 mb-4 text-sm">No videos found or failed to load from Reddit.</p>
            <button 
              onClick={() => loadMore()}
              className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm"
            >
              Retry Loading
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
