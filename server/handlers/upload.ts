import { Request, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const isDev = process.env.NODE_ENV === 'development' || !!process.env.S3_ENDPOINT;
const s3Client = isDev 
    ? new S3Client({
        region: 'local-env',
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:4569',
        forcePathStyle: true,
        credentials: {
            accessKeyId: 'fakeMyKeyId',
            secretAccessKey: 'fakeSecretAccessKey'
        }
    })
    : new S3Client({});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'deony-assets';

export const getUploadUrl = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { media_id } = req.body;
        
        if (!media_id) {
            return res.status(400).json({ error: 'media_id is required' });
        }

        const key = `users/${userId}/manual-media/${media_id}/cover.jpg`;
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: 'image/jpeg'
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        // We can also return the public URL that the frontend will use to display it
        // The public URL depends on CloudFront or local setup
        const publicUrl = isDev 
            ? `${process.env.S3_ENDPOINT || 'http://localhost:4569'}/${BUCKET_NAME}/${key}`
            : `https://${process.env.CDN_DOMAIN}/${key}`;

        res.json({ uploadUrl, publicUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
