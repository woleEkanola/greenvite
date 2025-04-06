import axios from 'axios';

// In-memory cache for images
const imageCache: Record<string, Buffer> = {};

/**
 * Fetches an image from a URL and caches it in memory
 * @param url The URL of the image to fetch
 * @returns A promise that resolves to the image buffer
 */
export async function fetchAndCacheImage(url: string): Promise<Buffer | null> {
  try {
    console.log(`Fetching and caching image from: ${url}`);
    
    // If the image is already in the cache, return it
    if (imageCache[url]) {
      console.log(`Image found in cache: ${url}`);
      return imageCache[url];
    }
    
    // Add retry logic for image fetching
    const fetchWithRetry = async (attempt = 1, maxAttempts = 3) => {
      try {
        const response = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 15000, // 15 second timeout
          headers: {
            'Accept': 'image/*',
            'Cache-Control': 'no-cache'
          }
        });
        return response.data;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
        if (attempt < maxAttempts) {
          console.log(`Retrying... (${attempt}/${maxAttempts})`);
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchWithRetry(attempt + 1, maxAttempts);
        }
        throw error;
      }
    };
    
    const imageData = await fetchWithRetry();
    const buffer = Buffer.from(imageData);
    
    // Cache the image
    imageCache[url] = buffer;
    console.log(`Image cached successfully: ${url} (${buffer.length} bytes)`);
    
    return buffer;
  } catch (error) {
    console.error('Error fetching and caching image:', error);
    return null;
  }
}

/**
 * Gets an image from the cache
 * @param url The URL of the image to get from the cache
 * @returns The image buffer or null if not found
 */
export function getImageFromCache(url: string): Buffer | null {
  return imageCache[url] || null;
}

/**
 * Clears the image cache
 */
export function clearImageCache(): void {
  Object.keys(imageCache).forEach(key => {
    delete imageCache[key];
  });
  console.log('Image cache cleared');
}
