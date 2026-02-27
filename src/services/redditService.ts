export interface RedditVideo {
  id: string;
  title: string;
  author: string;
  url: string;
  thumbnail: string;
  ups: number;
  subreddit: string;
  permalink: string;
  hasAudio?: boolean;
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Hot': [
    'RealGirls', 'holdmycosmo', 'BikiniBodies', 'TightDress', 'YogaPants', 
    'FitGirls', 'BeautifulFemales', 'HighHeels', 'Stockings', 'Legs', 
    'CelebrityNSFW', 'NSFW_GIFS', 'WildStar', 'Amateur', 'Selfie',
    'gonewild', 'AsiansGoneWild', 'palegirls', 'CollegeAmateurs',
    'FestivalSluts', 'WorkGoneWild', 'PetiteGoneWild', 'TallGoneWild',
    'Curvy', 'Thick', 'Slim', 'Fit', 'Athletic', 'GirlsInTightPants',
    'HighResNSFW', 'GfycatDepot', 'NSFW_HTML5', '60fpsporn', 'HighQualityNSFW'
  ],
  'Viral': [
    'TikTokCringe', 'Unexpected', 'nextfuckinglevel', 'BeAmazed', 'MayBeMaybeMaybe',
    'funny', 'WatchPeopleDieInside', 'HoldMyBeer', 'Instant_Regret', 'NatureIsFuckingLit',
    'AnimalsBeingDerps', 'Satisfying', 'interestingasfuck', 'Damnthatsinteresting',
    'OddlySatisfying', 'WorldMusic', 'Art', 'Space', 'Science', 'Memes',
    'DankMemes', 'WholesomeMemes', 'Technology', 'Gadgets', 'Gaming',
    'Games', 'PCMasterRace', 'NintendoSwitch', 'PS5', 'XboxSeriesX',
    'MildlyInteresting', 'HumansBeingBros', 'MadeMeSmile', 'Nonononoyes',
    'Aww', 'EyeBleach', 'AnimalsBeingBros', 'JusticeServed', 'PublicFreakout'
  ]
};

export class RedditService {
  private currentCategory: string = 'Viral';
  private shuffledSubreddits: string[] = [];
  private currentSubredditIndex: number = 0;
  private after: string | null = null;
  private retryCount = 0;
  private MAX_RETRIES = 30;
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
  ];
  private videoCache: Map<string, RedditVideo[]> = new Map();

  constructor() {
    this.initCategory('Viral');
  }

  private initCategory(category: string) {
    this.currentCategory = category;
    const subreddits = CATEGORY_MAP[category] || CATEGORY_MAP['Viral'];
    this.shuffledSubreddits = [...subreddits].sort(() => Math.random() - 0.5);
    this.currentSubredditIndex = 0;
    this.after = null;
    this.retryCount = 0;
  }

  setCategory(category: string) {
    if (this.currentCategory !== category) {
      this.initCategory(category);
    }
  }

  async fetchVideos(): Promise<RedditVideo[]> {
    const cacheKey = `${this.currentCategory}-${this.after || 'start'}`;
    if (this.videoCache.has(cacheKey)) {
      return this.videoCache.get(cacheKey)!;
    }

    try {
      // Fetch from 10 subreddits at once to ensure we find enough videos with audio
      const start = this.currentSubredditIndex;
      const end = Math.min(start + 10, this.shuffledSubreddits.length);
      const subredditsChunk = this.shuffledSubreddits.slice(start, end).join('+');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced timeout to 10s

      const url = `https://www.reddit.com/r/${subredditsChunk}/hot.json?limit=50&raw_json=1${this.after ? `&after=${this.after}` : ''}`;
      
      const response = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 404) {
        throw new Error(`Subreddits not found (404)`);
      }
      
      if (!response.ok) throw new Error(`Reddit API error: ${response.status}`);
      
      const data = await response.json();
      if (!data?.data?.children) throw new Error('Invalid response');

      this.after = data.data.after;

      const videos: RedditVideo[] = data.data.children
        .map((child: any) => {
          const d = child.data;
          let videoUrl = '';
          let hasAudio = false;
          
          if (d.secure_media?.reddit_video) {
            videoUrl = d.secure_media.reddit_video.fallback_url;
            hasAudio = d.secure_media.reddit_video.has_audio;
          } else if (d.preview?.reddit_video_preview) {
            videoUrl = d.preview.reddit_video_preview.fallback_url;
            hasAudio = d.preview.reddit_video_preview.has_audio;
          }

          if (!videoUrl || !videoUrl.includes('v.redd.it')) return null;

          const thumbnail = (d.thumbnail && d.thumbnail.startsWith('http')) ? d.thumbnail : '';

          return {
            id: d.id,
            title: d.title,
            author: d.author,
            url: videoUrl,
            thumbnail: thumbnail,
            ups: d.ups,
            subreddit: d.subreddit,
            permalink: `https://reddit.com${d.permalink}`,
            hasAudio: !!hasAudio
          };
        })
        .filter((v: any): v is RedditVideo => v !== null && v.hasAudio === true);

      const shuffledVideos = videos.sort(() => Math.random() - 0.5);

      if (shuffledVideos.length === 0 && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        this.currentSubredditIndex = (this.currentSubredditIndex + 10) % this.shuffledSubreddits.length;
        
        if (this.currentSubredditIndex === 0) {
          this.shuffledSubreddits.sort(() => Math.random() - 0.5);
        }

        this.after = null; 
        return this.fetchVideos();
      }

      this.videoCache.set(cacheKey, shuffledVideos);
      this.retryCount = 0;
      // Advance index for next fetch
      this.currentSubredditIndex = (this.currentSubredditIndex + 10) % this.shuffledSubreddits.length;
      return shuffledVideos;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Reddit fetch timed out, retrying...');
      } else if (error.message.includes('404')) {
        console.warn(error.message, 'Retrying with next subreddit...');
      } else {
        console.error('Reddit fetch error:', error);
      }
      
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        this.currentSubredditIndex = (this.currentSubredditIndex + 1) % this.shuffledSubreddits.length;
        
        // If we loop back to the start, reshuffle for variety
        if (this.currentSubredditIndex === 0) {
          this.shuffledSubreddits.sort(() => Math.random() - 0.5);
        }

        this.after = null;
        return this.fetchVideos();
      }
      
      this.retryCount = 0;
      return [];
    }
  }
}
