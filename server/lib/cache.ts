const cache = new Map<string, { value: any; expiry: number }>();

export const getCached = (key: string): any | null => {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }
    return item.value;
};

export const setCached = (key: string, value: any, ttlSeconds: number = 3600) => {
    cache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000
    });
};