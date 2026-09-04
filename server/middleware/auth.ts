import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const region = process.env.AWS_REGION || 'ap-southeast-1';
const jwksUrl = userPoolId
    ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    : null;

const pemsCache: Record<string, string> = {};

async function getPemForKid(kid?: string): Promise<string | null> {
    if (!jwksUrl || !kid) return null;
    if (pemsCache[kid]) return pemsCache[kid];

    try {
        const res = await fetch(jwksUrl);
        const data = (await res.json()) as any;
        if (Array.isArray(data.keys)) {
            for (const key of data.keys) {
                if (key.kid && key.kty === 'RSA') {
                    const pubKey = crypto.createPublicKey({ key, format: 'jwk' });
                    pemsCache[key.kid] = pubKey.export({ type: 'spki', format: 'pem' }) as string;
                }
            }
        }
        return pemsCache[kid] || null;
    } catch (e) {
        console.error('Failed to fetch Cognito JWKS:', e);
        return null;
    }
}

const verifyJwt = async (token: string) => {
    const decoded = jwt.decode(token, { complete: true }) as any;
    if (!decoded || !decoded.payload) {
        throw new Error('Invalid token');
    }

    const payload = decoded.payload;

    // Reject expired tokens
    if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
    }

    // In production with Cognito, enforce cryptographic RS256 signature verification
    if (jwksUrl) {
        const kid = decoded.header?.kid;
        if (!kid || decoded.header?.alg !== 'RS256') {
            throw new Error('Token must be RS256 signed by Cognito with kid');
        }
        const pem = await getPemForKid(kid);
        if (!pem) {
            throw new Error('Unknown signing key');
        }
        jwt.verify(token, pem, { algorithms: ['RS256'] });
    }

    return payload;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const token = authHeader.split(' ')[1];
        const claims = await verifyJwt(token);
        
        (req as any).user = {
            sub: claims.sub,
            username: claims['cognito:username'] || claims.username
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

export const optionalAuthMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const claims = await verifyJwt(token);
            
            (req as any).user = {
                sub: claims.sub,
                username: claims['cognito:username'] || claims.username
            };
        }
    } catch (error) {
        // Ignore errors
    }
    next();
};
