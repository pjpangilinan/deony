import { api } from '../services/api';

export interface MediaItem {
  id: string;
  title?: string;
  cover_image?: string;
  imageUrl?: string;
  description?: string;
  media_type?: string;
  is_manual?: boolean;
  [key: string]: any;
}

/**
 * Safely fetches media items in chunks of up to 100 (DynamoDB limit per BatchGetItem).
 * Prevents HTTP 400 / DynamoDB ValidationException when user archives >100 entries.
 */
export async function batchFetchMedia(ids: (string | undefined | null)[]): Promise<Record<string, MediaItem>> {
  const cleanIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0))));
  if (cleanIds.length === 0) return {};

  const map: Record<string, MediaItem> = {};
  const CHUNK_SIZE = 100;

  for (let i = 0; i < cleanIds.length; i += CHUNK_SIZE) {
    const chunk = cleanIds.slice(i, i + CHUNK_SIZE);
    try {
      const res = await api.post<{ items: MediaItem[] }>('/media/batch-get', { ids: chunk });
      if (res?.items && Array.isArray(res.items)) {
        res.items.forEach((item) => {
          if (item?.id) {
            map[item.id] = item;
          }
        });
      }
    } catch (err) {
      console.error('Failed to batch fetch media chunk:', err);
    }
  }

  return map;
}
