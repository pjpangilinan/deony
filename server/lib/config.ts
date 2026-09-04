export const getParameter = async (path: string): Promise<string> => {
    // In a real environment, this might read from AWS SSM Parameter Store
    // For dev, we'll just read from process.env
    const envKey = path.split('/').pop()?.toUpperCase() || '';
    return process.env[envKey] || '';
};

export const config = {
    TMDB_API_KEY: process.env.TMDB_API_KEY || '',
    RAWG_API_KEY: process.env.RAWG_API_KEY || ''
};
