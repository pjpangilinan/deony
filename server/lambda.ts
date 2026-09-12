import express from 'express';
import cors from 'cors';
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import apiRoutes from './routes';

const app = express();

app.disable('x-powered-by');

app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const defaultAllowedOrigins = [
    'https://d1cdomhzh1pe4j.cloudfront.net',
    'http://localhost:5173',
    'http://localhost:3000',
];

const allAllowedOrigins = [...new Set([...defaultAllowedOrigins, ...allowedOrigins])];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allAllowedOrigins.includes(origin) || origin.endsWith('.cloudfront.net')) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
}));
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ limit: '6mb', extended: true }));

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

const ssmClient = new SSMClient({});
let secretsLoaded = false;

async function loadSecrets() {
    if (secretsLoaded) return;
    try {
        if (!process.env.TMDB_API_KEY) {
            const paramName = process.env.TMDB_SSM_PARAM || '/deony/production/tmdb-api-key';
            const cmd = new GetParameterCommand({
                Name: paramName,
                WithDecryption: true,
            });
            const res = await ssmClient.send(cmd);
            if (res.Parameter?.Value) {
                process.env.TMDB_API_KEY = res.Parameter.Value;
            }
        }

        if (!process.env.RAWG_API_KEY) {
            const paramName = process.env.RAWG_SSM_PARAM || '/deony/production/rawg-api-key';
            const cmd = new GetParameterCommand({
                Name: paramName,
                WithDecryption: true,
            });
            const res = await ssmClient.send(cmd);
            if (res.Parameter?.Value) {
                process.env.RAWG_API_KEY = res.Parameter.Value;
            }
        }
    } catch (err) {
        console.warn('SSM secrets loading notice:', err);
    }
    secretsLoaded = true;
}

const serverlessHandler = serverlessExpress({ app });

export const handler = async (event: any, context: any, callback: any) => {
    await loadSecrets();
    return serverlessHandler(event, context, callback);
};
