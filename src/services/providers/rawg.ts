import { MediaProvider, MediaResult } from './types';

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

export const rawgProvider: MediaProvider = {
  name: 'RAWG',
  async search(query: string): Promise<MediaResult[]> {
    if (!query || !RAWG_API_KEY) return [];
    
    const searchUrl = new URL(`${RAWG_BASE_URL}/games`);
    searchUrl.searchParams.append('key', RAWG_API_KEY);
    searchUrl.searchParams.append('search', query);
    searchUrl.searchParams.append('page_size', '20');

    const response = await fetch(searchUrl.toString());
    if (!response.ok) throw new Error('RAWG search failed');
    const data = await response.json();

    return (data.results || []).map((item: any): MediaResult => ({
      id: `rawg-game-${item.id}`,
      type: 'game',
      title: item.name,
      imageUrl: item.background_image,
      year: item.released ? item.released.substring(0, 4) : undefined,
      provider: 'RAWG',
      providerId: String(item.id),
    }));
  },

  async resolve(id: string): Promise<MediaResult | null> {
    if (!RAWG_API_KEY) return null;
    const [provider, type, gameId] = id.split('-');
    if (provider !== 'rawg' || type !== 'game' || !gameId) return null;

    try {
      const response = await fetch(`${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`);
      if (!response.ok) return null;
      const item = await response.json();

      return {
        id,
        type: 'game',
        title: item.name,
        description: item.description_raw || item.description,
        imageUrl: item.background_image,
        year: item.released ? item.released.substring(0, 4) : undefined,
        provider: 'RAWG',
        providerId: String(item.id),
      };
    } catch (e) {
      return null;
    }
  }
};
