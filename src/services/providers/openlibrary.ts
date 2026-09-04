import { MediaProvider, MediaResult } from './types';

const OL_BASE_URL = 'https://openlibrary.org';

export const openLibraryProvider: MediaProvider = {
  name: 'OpenLibrary',
  async search(query: string): Promise<MediaResult[]> {
    if (!query) return [];
    const searchUrl = new URL(`${OL_BASE_URL}/search.json`);
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('limit', '20');

    const response = await fetch(searchUrl.toString());
    if (!response.ok) throw new Error('OpenLibrary search failed');
    const data = await response.json();

    return (data.docs || []).map((item: any): MediaResult => {
      const workId = item.key.replace('/works/', '');
      return {
        id: `ol-book-${workId}`,
        type: 'book',
        title: item.title,
        description: item.first_sentence ? (typeof item.first_sentence === 'string' ? item.first_sentence : item.first_sentence.value) : undefined,
        imageUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : undefined,
        year: item.first_publish_year ? String(item.first_publish_year) : undefined,
        provider: 'OpenLibrary',
        providerId: workId,
      };
    });
  },

  async resolve(id: string): Promise<MediaResult | null> {
    const [provider, type, workId] = id.split('-');
    if (provider !== 'ol' || type !== 'book' || !workId) return null;

    try {
      const response = await fetch(`${OL_BASE_URL}/works/${workId}.json`);
      if (!response.ok) return null;
      const data = await response.json();

      return {
        id,
        type: 'book',
        title: data.title,
        description: data.description ? (typeof data.description === 'string' ? data.description : data.description.value) : undefined,
        imageUrl: data.covers && data.covers.length > 0 ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` : undefined,
        year: data.first_publish_date ? String(data.first_publish_date).substring(0, 4) : undefined,
        provider: 'OpenLibrary',
        providerId: workId,
      };
    } catch (e) {
      return null;
    }
  }
};
