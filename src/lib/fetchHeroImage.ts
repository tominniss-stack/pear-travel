import fs from 'fs/promises';
import path from 'path';

export async function fetchHeroImage(destination: string, placeId?: string | null): Promise<string> {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;

  // 1. Try Google Places API (High-Res Request & Local Save)
  if (placeId && googleApiKey) {
    try {
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${googleApiKey}`
      );
      const detailsData = await detailsRes.json();

      if (detailsData.result?.photos?.length > 0) {
        const photoReference = detailsData.result.photos[0].photo_reference;
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${photoReference}&key=${googleApiKey}`;
        
        const imageRes = await fetch(photoUrl, { redirect: 'follow' });
        if (imageRes.ok) {
          const buffer = await imageRes.arrayBuffer();
          
          // Sanitize placeId to prevent any file path issues
          const safePlaceId = placeId.replace(/[^a-zA-Z0-9]/g, '');
          const filename = `hero-${safePlaceId}.jpg`;
          const uploadDir = path.join(process.cwd(), 'public/uploads');
          
          // Ensure the uploads directory exists before writing
          await fs.mkdir(uploadDir, { recursive: true });
          
          // Write the binary data to the file system
          await fs.writeFile(path.join(uploadDir, filename), Buffer.from(buffer));
          
          // Return the permanent local path
          return `/uploads/${filename}`;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch/save Google image for ${destination}:`, error);
    }
  }

  // 2. Fallback to Unsplash (Permanent URL, safe to save directly to DB)
  if (unsplashApiKey) {
    try {
      const query = encodeURIComponent(`${destination} landscape`);
      const unsplashRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape&per_page=1&client_id=${unsplashApiKey}`
      );
      const unsplashData = await unsplashRes.json();

      if (unsplashData.results?.length > 0) {
        return unsplashData.results[0].urls.regular; // Usually ~1080px wide, perfect for hero
      }
    } catch (error) {
      console.warn(`Failed to fetch Unsplash image for ${destination}:`, error);
    }
  }

  // 3. Absolute Fallback
  return `https://picsum.photos/seed/${encodeURIComponent(destination)}/1600/900`;
}