export interface MediaResult {
  id: string;
  type: 'movie' | 'tv' | 'book' | 'game';
  title: string;
  description?: string;
  imageUrl?: string;
  year?: string;
  provider: string;
  providerId: string;
  metadata?: Record<string, any>;
}

export interface MediaProvider {
  name: string;
  search(query: string): Promise<MediaResult[]>;
  resolve(id: string): Promise<MediaResult | null>;
}
