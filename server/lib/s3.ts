import { S3Client } from '@aws-sdk/client-s3';

const isDev = process.env.NODE_ENV !== 'production';

const clientParams = isDev ? {
    endpoint: 'http://localhost:4569',
    region: 'local-env',
    forcePathStyle: true,
    credentials: {
        accessKeyId: 'S3RVER',
        secretAccessKey: 'S3RVER'
    }
} : {};

export const s3Client = new S3Client(clientParams);
