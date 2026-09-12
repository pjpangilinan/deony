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
        const userId = (req as any).user?.sub;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { media_id, content_type = 'image/jpeg' } = req.body;
        
        // Prevent path traversal and enforce safe identifier
        if (!media_id || typeof media_id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(media_id)) {
            return res.status(400).json({ error: 'Valid media_id (1-64 alphanumeric characters, underscores, or dashes) is required' });
        }

        const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_MIME_TYPES.includes(content_type)) {
            return res.status(400).json({ error: `content_type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}` });
        }

        const ext = content_type === 'image/png' ? 'png' : content_type === 'image/webp' ? 'webp' : 'jpg';
        const key = `users/${userId}/manual-media/${media_id}/cover.${ext}`;
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: content_type
        });

        // 15-minute expiration for presigned upload URLs
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

        const publicUrl = isDev 
            ? `${process.env.S3_ENDPOINT || 'http://localhost:4569'}/${BUCKET_NAME}/${key}`
            : `https://${process.env.CDN_DOMAIN || 'd1cdomhzh1pe4j.cloudfront.net'}/${key}`;

        res.json({ uploadUrl, publicUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
