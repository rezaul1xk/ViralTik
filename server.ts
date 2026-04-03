import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const cache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // API Proxy for Reddit - Optimized for speed and reliability
  app.get("/api/reddit", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    // Remove cache buster from URL for server-side caching and to avoid bot detection
    const cleanUrl = url.replace(/[&?]cb=[^&]*/, '');

    const cached = cache.get(cleanUrl);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json(cached.data);
    }

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    ];

    const fetchWithParallelProxies = async (): Promise<any> => {
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      // Try both www and old reddit as they sometimes have different rate limits
      const redditUrls = [
        url,
        url.replace('www.reddit.com', 'old.reddit.com')
      ];
      
      const configs: any[] = [];
      
      for (const rUrl of redditUrls) {
        const isOld = rUrl.includes('old.reddit.com');
        const suffix = isOld ? ' (Old)' : '';
        
        configs.push(
          // Direct
          {
            name: `Direct${suffix}`,
            url: rUrl,
            headers: {
              'User-Agent': ua,
              'Accept': 'application/json',
              'Referer': isOld ? 'https://old.reddit.com/' : 'https://www.reddit.com/',
            }
          },
          // CorsProxy.io
          {
            name: `CorsProxy.io${suffix}`,
            url: `https://corsproxy.io/?${encodeURIComponent(rUrl)}`,
            headers: { 'User-Agent': ua }
          },
          // AllOrigins Raw
          {
            name: `AllOrigins Raw${suffix}`,
            url: `https://api.allorigins.win/raw?url=${encodeURIComponent(rUrl)}`,
            headers: { 'User-Agent': ua }
          },
          // Codetabs
          {
            name: `Codetabs${suffix}`,
            url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rUrl)}`,
            headers: { 'User-Agent': ua }
          },
          // ThingProxy (sometimes works)
          {
            name: `ThingProxy${suffix}`,
            url: `https://thingproxy.freeboard.io/fetch/${rUrl}`,
            headers: { 'User-Agent': ua }
          }
        );
      }

      // Try all proxies in parallel and take the first one that succeeds
      const proxyPromises = configs.map(async (config) => {
        try {
          const response = await axios.get(config.url, { 
            headers: config.headers, 
            timeout: 8000, // Shorter timeout for parallel attempts
            validateStatus: (status) => status === 200
          });
          
          const data = response.data;
          let parsedData = data;

          if (typeof data === 'string') {
            try {
              parsedData = JSON.parse(data);
            } catch (e) {
              throw new Error("Invalid JSON string");
            }
          }

          if (parsedData && parsedData.data && parsedData.data.children) {
            console.log(`Success with ${config.name}`);
            return parsedData;
          }
          
          throw new Error("Invalid data structure");
        } catch (e: any) {
          throw e;
        }
      });

      try {
        return await Promise.any(proxyPromises);
      } catch (e: any) {
        // If all parallel attempts fail, try one more time with a fallback or throw
        console.error("All parallel proxy attempts failed.");
        throw new Error("All proxy attempts failed.");
      }
    };

    try {
      console.log(`Fetching Reddit URL: ${url}`);
      const data = await fetchWithParallelProxies();
      cache.set(cleanUrl, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      console.error(`Reddit API Error for ${url}:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        // If it's a 403, Reddit might be blocking the IP.
        if (error.response.status === 403) {
          console.error("Reddit is returning 403. This usually means the server IP is flagged or headers are insufficient.");
        }
      }
      res.status(error.response?.status || 500).json({ 
        error: error.message,
        status: error.response?.status
      });
    }
  });

  // Proxy for Reddit assets (images/videos) with Range support
  app.get("/api/proxy-asset", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Referer': 'https://www.reddit.com/',
        'Origin': 'https://www.reddit.com'
      };

      // Forward Range header if present
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await axios.get(url, {
        responseType: 'stream',
        headers: headers,
        timeout: 30000 // 30s for assets
      });

      // Forward relevant headers back to client
      const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'];
      headersToForward.forEach(h => {
        if (response.headers[h]) res.set(h, response.headers[h]);
      });

      // Set status code (e.g., 206 Partial Content)
      res.status(response.status);
      response.data.pipe(res);
    } catch (error: any) {
      console.error(`Asset Proxy Error for ${url}:`, error.message);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
