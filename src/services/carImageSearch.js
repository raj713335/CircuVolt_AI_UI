/**
 * Car Image Search Service
 * Uses Wikimedia Commons API (free, no API key needed) + Google Custom Search fallback
 * to fetch real car photographs for display in the Vehicle Architecture Studio.
 */

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/**
 * Search for car images from Wikimedia Commons
 * @param {string} carName - e.g. "Tesla Model 3", "BMW i4"
 * @param {number} limit - max images to return
 * @returns {Promise<Array<{url: string, thumb: string, title: string}>>}
 */
export async function searchCarImages(carName, limit = 8) {
  try {
    // Strategy 1: Wikipedia page images (most reliable for specific car models)
    const wikiImages = await fetchWikipediaImages(carName, limit);
    if (wikiImages.length >= 2) return wikiImages;

    // Strategy 2: Wikimedia Commons search
    const commonsImages = await fetchCommonsImages(carName, limit);
    return [...wikiImages, ...commonsImages].slice(0, limit);
  } catch (err) {
    console.warn('Image search failed:', err);
    return [];
  }
}

/**
 * Fetch images from the Wikipedia article for a car model
 */
async function fetchWikipediaImages(carName, limit) {
  try {
    // First, find the Wikipedia page
    const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(carName + ' car')}&srlimit=3&format=json&origin=*`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();
    
    if (!searchData.query?.search?.length) return [];
    
    const pageTitle = searchData.query.search[0].title;
    
    // Get images from the page
    const imagesUrl = `${WIKI_API}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&imlimit=20&format=json&origin=*`;
    const imagesResp = await fetch(imagesUrl);
    const imagesData = await imagesResp.json();
    
    const pages = imagesData.query?.pages;
    if (!pages) return [];
    
    const page = Object.values(pages)[0];
    if (!page.images) return [];
    
    // Filter for actual car photos (exclude icons, logos, flags, etc.)
    const imageFiles = page.images
      .map(img => img.title)
      .filter(title => {
        const lower = title.toLowerCase();
        return (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp'))
          && !lower.includes('icon') && !lower.includes('logo') && !lower.includes('flag')
          && !lower.includes('symbol') && !lower.includes('commons-logo') && !lower.includes('edit-')
          && !lower.includes('question_book') && !lower.includes('ambox') && !lower.includes('crystal')
          && !lower.includes('nuvola') && !lower.includes('arrow') && !lower.includes('red_x')
          && !lower.includes('check') && !lower.includes('stub') && !lower.includes('wiki')
          && !lower.includes('disambig') && !lower.includes('gnome') && !lower.includes('folder');
      })
      .slice(0, limit);
    
    if (!imageFiles.length) return [];
    
    // Get actual URLs for these images
    const urlsUrl = `${WIKI_API}?action=query&titles=${imageFiles.map(f => encodeURIComponent(f)).join('|')}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=800&format=json&origin=*`;
    const urlsResp = await fetch(urlsUrl);
    const urlsData = await urlsResp.json();
    
    const urlPages = urlsData.query?.pages;
    if (!urlPages) return [];
    
    return Object.values(urlPages)
      .filter(p => p.imageinfo?.[0])
      .map(p => ({
        url: p.imageinfo[0].url,
        thumb: p.imageinfo[0].thumburl || p.imageinfo[0].url,
        title: p.title.replace('File:', '').replace(/\.[^.]+$/, '').replace(/_/g, ' '),
      }))
      .slice(0, limit);
  } catch (err) {
    console.warn('Wikipedia image fetch failed:', err);
    return [];
  }
}

/**
 * Fetch images from Wikimedia Commons search
 */
async function fetchCommonsImages(carName, limit) {
  try {
    const searchUrl = `${COMMONS_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(carName + ' car photo')}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=800&format=json&origin=*`;
    const resp = await fetch(searchUrl);
    const data = await resp.json();
    
    const pages = data.query?.pages;
    if (!pages) return [];
    
    return Object.values(pages)
      .filter(p => p.imageinfo?.[0])
      .filter(p => {
        const title = p.title.toLowerCase();
        return (title.endsWith('.jpg') || title.endsWith('.jpeg') || title.endsWith('.png') || title.endsWith('.webp'))
          && !title.includes('logo') && !title.includes('icon');
      })
      .map(p => ({
        url: p.imageinfo[0].url,
        thumb: p.imageinfo[0].thumburl || p.imageinfo[0].url,
        title: p.title.replace('File:', '').replace(/\.[^.]+$/, '').replace(/_/g, ' '),
      }))
      .slice(0, limit);
  } catch (err) {
    console.warn('Commons image fetch failed:', err);
    return [];
  }
}

/**
 * Get a primary hero image for a car model
 */
export async function getCarHeroImage(carName) {
  const images = await searchCarImages(carName, 3);
  return images.length > 0 ? images[0] : null;
}
