import express from 'express';
import cors from 'cors';
import S3rver from 's3rver';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './routes';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const port = 3001;

app.use(cors({
    origin: 'http://localhost:5173',
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api', apiRoutes);

// Start s3rver
const s3Port = 4569;
new S3rver({
    port: s3Port,
    directory: path.resolve(process.cwd(), 'local-data/s3'),
    silent: false,
    configureBuckets: [{
        name: 'deony-media-assets',
        configs: []
    }]
}).run((err, addressInfo) => {
    if (err) {
        console.error('Failed to start s3rver', err);
    } else {
        console.log(`s3rver running on port ${addressInfo?.port}`);
    }
});

app.listen(port, () => {
    console.log(`API dev server running on port ${port}`);
});
