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
  '18+': [
    'RealGirls', 'BikiniBodies', 'TightDress', 'YogaPants', 
    'FitGirls', 'BeautifulFemales', 'HighHeels', 'Stockings', 'Legs', 
    'CelebrityNSFW', 'WildStar', 'Amateur', 'Selfie',
    'gonewild', 'AsiansGoneWild', 'palegirls', 'CollegeAmateurs',
    'WorkGoneWild', 'PetiteGoneWild', 'TallGoneWild',
    'Curvy', 'Thick', 'Slim', 'Fit', 'Athletic', 'GirlsInTightPants',
    'HighResNSFW', 'HighQualityNSFW', 'NSFW_Snapchat', 'BonerMaterial', 
    'OnOff', 'BurstingOut', 'TittyDrop', 'NSFW_Visual_Arts', 
    'Ebony', 'Latina', 'Milf', 'Mature', 'Cougars', 'LegalTeens', 
    'CollegeGirls', 'PartyGirls', 'SpringBreak', 'BeachGirls', 'Poolside', 
    'Lingerie', 'Underwear', 'Panties', 'Thongs', 'Ass', 'Boobs', 'Tits', 
    'Cleavage', 'Bottomless', 'Topless', 'Nude', 'Naked', 'Skin', 'Body', 
    'Curves', 'HotGirls', 'SexyGirls', 'PrettyGirls', 'CuteGirls', 
    'BeautifulGirls', 'NSFW_Wallpapers', 'NSFW_OC', 'NSFW_Social_Media', 
    'NSFW_Snapchat_Share', 'NSFW_Showcase', 'NSFW_Reels', 'NSFW_Shorts', 
    'NSFW_TikTok', 'NSFW_Clips', 'NSFW_GIFS', 'NSFW_HTML5', '60fpsporn',
    'VerticalPorn', 'MobilePorn', 'AsianPorn', 'IndianPorn', 'DrunkGirls',
    'FestivalSluts', 'GfycatDepot', 'Porn_Gifs', 'adult_gifs', 'porninfifteenseconds'
  ],
  'Viral': [
    'TikTokCringe', 'Unexpected', 'nextfuckinglevel', 'BeAmazed', 'MayBeMaybeMaybe',
    'funny', 'WatchPeopleDieInside', 'HoldMyBeer', 'Instant_Regret', 'NatureIsFuckingLit',
    'AnimalsBeingDerps', 'Satisfying', 'interestingasfuck', 'Damnthatsinteresting',
    'OddlySatisfying', 'Memes', 'DankMemes', 'WholesomeMemes', 'Nonononoyes',
    'Aww', 'EyeBleach', 'AnimalsBeingBros', 'PublicFreakout', 'Videos', 'Gifs',
    'BetterEveryLoop', 'FunnyAnimals', 'CatVideos', 'DogVideos', 'NatureIsMetal',
    'Whatcouldgowrong', 'IdiotsInCars', 'WinStupidPrizes', 'PerfectlyCutScreams',
    'ContagiousLaughter', 'DadReflexes', 'Stepdadreflexes', 'ChildrenFallingOver',
    'BlackMagicFuckery', 'MadLads', 'AbsoluteUnits', 'Chonkers', 'RarePuppers',
    'Zoomies', 'Sploot', 'TippyTaps', 'Teefies', 'Blep', 'Mlem', 'StartledCats'
  ]
};

export class RedditService {
  private currentCategory: string = 'Viral';
  private shuffledSubreddits: string[] = [];
  private currentSubredditIndex: number = 0;
  private after: string | null = null;
  private retryCount = 0;
  private MAX_RETRIES = 15;
  private videoCache: Map<string, RedditVideo[]> = new Map();
  private seenVideoIds: Set<string> = new Set();
  private feedTypes: string[] = ['hot', 'new', 'rising'];
  private currentFeedTypeIndex: number = 0;

  constructor() {
    this.initCategory('Viral');
  }

  private initCategory(category: string) {
    this.currentCategory = category;
    const subreddits = CATEGORY_MAP[category] || CATEGORY_MAP['Viral'];
    this.shuffledSubreddits = [...subreddits].sort(() => Math.random() - 0.5);
    this.currentSubredditIndex = Math.floor(Math.random() * this.shuffledSubreddits.length);
    this.currentFeedTypeIndex = Math.floor(Math.random() * this.feedTypes.length);
    this.after = null;
    this.retryCount = 0;
    this.seenVideoIds.clear(); // Clear seen videos on category change/refresh
    this.videoCache.clear(); // Clear cache to force fresh fetch
  }

  setCategory(category: string, forceRefresh: boolean = false) {
    if (this.currentCategory !== category || forceRefresh) {
      this.initCategory(category);
    }
  }

  async fetchVideos(): Promise<RedditVideo[]> {
    // Randomize feed type for every new fetch if no 'after' token
    if (!this.after) {
      this.currentFeedTypeIndex = Math.floor(Math.random() * this.feedTypes.length);
    }
    
    const feedType = this.feedTypes[this.currentFeedTypeIndex];
    
    try {
      const start = this.currentSubredditIndex;
      const chunkSize = 4; // Smaller chunk size to avoid long URLs and being flagged
      const end = Math.min(start + chunkSize, this.shuffledSubreddits.length);
      let subredditsSlice = this.shuffledSubreddits.slice(start, end);
      
      if (subredditsSlice.length === 0) {
        this.currentSubredditIndex = 0;
        this.currentFeedTypeIndex = Math.floor(Math.random() * this.feedTypes.length);
        return this.fetchVideos();
      }
      
      const subredditsChunk = subredditsSlice.join('+');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      // Use a random cache buster to avoid stale results and bot detection
      const cb = Math.random().toString(36).substring(7);
      const redditUrl = `https://www.reddit.com/r/${subredditsChunk}/${feedType}.json?limit=100&raw_json=1&cb=${cb}${this.after ? `&after=${this.after}` : ''}`;
      
      let data = null;
      try {
        const engineUrl = `/api/reddit?url=${encodeURIComponent(redditUrl)}`;
        const response = await fetch(engineUrl, { signal: controller.signal });
        
        if (response.ok) {
          data = await response.json();
        } else {
          this.currentSubredditIndex = (this.currentSubredditIndex + chunkSize) % this.shuffledSubreddits.length;
          this.after = null;
          this.retryCount++;
          return this.fetchVideos();
        }
      } catch (e: any) {
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          this.currentSubredditIndex = (this.currentSubredditIndex + chunkSize) % this.shuffledSubreddits.length;
          this.after = null;
          return this.fetchVideos();
        }
        throw e;
      }
      
      clearTimeout(timeoutId);
      
      if (!data?.data?.children) {
        throw new Error(`Could not fetch data for r/${subredditsChunk}`);
      }

      this.after = data.data.after;

      const videos: RedditVideo[] = data.data.children
        .map((child: any) => {
          const d = child.data;
          
          // Deduplication
          if (this.seenVideoIds.has(d.id)) return null;

          let videoUrl = '';
          if (d.secure_media?.reddit_video) {
            videoUrl = d.secure_media.reddit_video.fallback_url;
          } else if (d.preview?.reddit_video_preview) {
            videoUrl = d.preview.reddit_video_preview.fallback_url;
          }

          if (!videoUrl || !videoUrl.includes('v.redd.it')) return null;

          // Filter out explicit sexual acts based on keywords in title
          const explicitKeywords = ['sex', 'fingering', 'masturbation', 'fuck', 'blowjob', 'handjob', 'pussy', 'cum', 'cock', 'dick', 'anal', 'porn'];
          const titleLower = d.title.toLowerCase();
          if (this.currentCategory === '18+' && explicitKeywords.some(keyword => titleLower.includes(keyword))) {
            return null;
          }

          const thumbnail = (d.thumbnail && d.thumbnail.startsWith('http')) ? d.thumbnail : '';

          this.seenVideoIds.add(d.id);

          return {
            id: d.id,
            title: d.title,
            author: d.author,
            url: videoUrl,
            thumbnail: thumbnail,
            ups: d.ups,
            subreddit: d.subreddit,
            permalink: `https://reddit.com${d.permalink}`
          };
        })
        .filter((v: any): v is RedditVideo => v !== null);

      const shuffledVideos = videos.sort(() => Math.random() - 0.5);

      if (shuffledVideos.length === 0 && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        // If no new videos found, move to next subreddit chunk
        this.currentSubredditIndex = (this.currentSubredditIndex + chunkSize) % this.shuffledSubreddits.length;
        this.after = null;
        return this.fetchVideos();
      }

      this.retryCount = 0;
      
      // If we don't have an 'after' token, it means we reached the end of this subreddit chunk's feed
      if (!this.after) {
        this.currentSubredditIndex = (this.currentSubredditIndex + chunkSize) % this.shuffledSubreddits.length;
      }
      
      return shuffledVideos;
    } catch (error: any) {
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        this.currentSubredditIndex = (this.currentSubredditIndex + 8) % this.shuffledSubreddits.length;
        this.after = null;
        return this.fetchVideos();
      }
      this.retryCount = 0;
      return [];
    }
  }
}
