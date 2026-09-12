import { Request, Response } from 'express';
import { getCached, setCached } from '../lib/cache';

export const searchMedia = async (req: Request, res: Response) => {
    try {
        const { q, type } = req.query;

        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        if (q.length > 200) {
            return res.status(400).json({ error: 'Query string must not exceed 200 characters' });
        }

        if (!type || typeof type !== 'string') {
            return res.status(400).json({ error: 'Query parameter "type" is required' });
        }

        const trimmedQ = q.trim();
        const query = encodeURIComponent(trimmedQ);
        const cacheKey = `search:${type}:${query}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        let results: any[] = [];

        if (type === 'movie' || type === 'film') {
            const tmdbKey = process.env.TMDB_API_KEY;
            if (!tmdbKey) return res.status(500).json({ error: 'TMDB_API_KEY is missing' });
            
            const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${query}&api_key=${tmdbKey}`, {
                headers: {
                    'accept': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.results) {
                results = data.results.map((item: any) => ({
                    source: 'tmdb',
                    external_id: item.id.toString(),
                    title: item.title,
                    release_date: item.release_date || null,
                    cover_image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                    description: item.overview || null
                }));
            }
        } else if (type === 'tv' || type === 'show') {
            const tmdbKey = process.env.TMDB_API_KEY;
            if (!tmdbKey) return res.status(500).json({ error: 'TMDB_API_KEY is missing' });
            
            const response = await fetch(`https://api.themoviedb.org/3/search/tv?query=${query}&api_key=${tmdbKey}`, {
                headers: {
                    'accept': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.results) {
                results = data.results.map((item: any) => ({
                    source: 'tmdb',
                    external_id: item.id.toString(),
                    title: item.name,
                    release_date: item.first_air_date || null,
                    cover_image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                    description: item.overview || null
                }));
            }
        } else if (type === 'book') {
            const response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=20`);
            const data = await response.json();
            
            if (data.docs) {
                results = data.docs.map((item: any) => ({
                    source: 'openlibrary',
                    external_id: item.key.replace('/works/', ''),
                    title: item.title,
                    release_date: item.first_publish_year ? item.first_publish_year.toString() : null,
                    cover_image: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
                    description: item.author_name ? `By ${item.author_name.join(', ')}` : null
                }));
            }
        } else if (type === 'game') {
            const rawgKey = process.env.RAWG_API_KEY;
            if (!rawgKey) return res.status(500).json({ error: 'RAWG_API_KEY is missing' });
            
            const response = await fetch(`https://api.rawg.io/api/games?search=${query}&key=${rawgKey}`);
            const data = await response.json();
            
            if (data.results) {
                results = data.results.map((item: any) => ({
                    source: 'rawg',
                    external_id: item.id.toString(),
                    title: item.name,
                    release_date: item.released || null,
                    cover_image: item.background_image || null,
                    description: null // RAWG search doesn't return full description, would need details endpoint
                }));
            }
        } else {
            return res.status(400).json({ error: 'Unsupported media type for search' });
        }

        setCached(cacheKey, results, 3600 * 24); // Cache searches for 24h
        return res.json(results);
    } catch (error) {
        console.error('Error searching media:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
