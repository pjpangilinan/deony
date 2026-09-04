import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const verifyJwt = (token: string) => {
    // Simple verification for dev
    // For prod, fetch JWKS and verify with it
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
        throw new Error('Invalid token');
    }
    return decoded;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const token = authHeader.split(' ')[1];
        const claims = verifyJwt(token);
        
        (req as any).user = {
            sub: claims.sub,
            username: claims['cognito:username']
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const claims = verifyJwt(token);
            
            (req as any).user = {
                sub: claims.sub,
                username: claims['cognito:username']
            };
        }
    } catch (error) {
        // Ignore errors
    }
    next();
};
