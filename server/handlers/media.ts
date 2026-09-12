import { Request, Response } from 'express';
import { docClient, TABLES } from '../lib/db';
import { PutCommand, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const resolveMedia = async (req: Request, res: Response) => {
    try {
        const { source, external_id, title, media_type, description, cover_image, release_date } = req.body;
        
        if (!source || !external_id) {
            return res.status(400).json({ error: 'source and external_id are required' });
        }

        const VALID_SOURCES = ['tmdb', 'openlibrary', 'rawg'];
        if (!VALID_SOURCES.includes(source)) {
            return res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(', ')}` });
        }

        if (typeof external_id !== 'string' || external_id.length > 200 || !/^[a-zA-Z0-9_\-/:.]+$/.test(external_id)) {
            return res.status(400).json({ error: 'external_id is invalid or exceeds allowed length' });
        }

        const id = `PROVIDER#${source}#${external_id}`;
        const now = new Date().toISOString();

        const mediaItem = {
            id,
            media_type,
            external_id,
            source,
            is_manual: false,
            user_id: null,
            title,
            description,
            cover_image,
            release_date,
            created_at: now,
            updated_at: now
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLES.MEDIA,
                Item: mediaItem,
                ConditionExpression: 'attribute_not_exists(id)'
            }));
            return res.status(201).json(mediaItem);
        } catch (err: any) {
            if (err.name === 'ConditionalCheckFailedException') {
                // Item already exists, return it
                const existing = await docClient.send(new GetCommand({
                    TableName: TABLES.MEDIA,
                    Key: { id }
                }));
                return res.json(existing.Item);
            }
            throw err;
        }
    } catch (error) {
        console.error('Error resolving media:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createManualMedia = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { title, media_type, description, release_date, cover_image } = req.body;

        if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 300) {
            return res.status(400).json({ error: 'Title is required and must be between 1 and 300 characters' });
        }

        if (cover_image && typeof cover_image === 'string') {
            if (!cover_image.startsWith('https://') && !cover_image.startsWith('http://') && !cover_image.startsWith('data:image/')) {
                return res.status(400).json({ error: 'Cover image must start with https://, http://, or data:image/' });
            }
        }

        if (description && (typeof description !== 'string' || description.length > 5000)) {
            return res.status(400).json({ error: 'Description must not exceed 5000 characters' });
        }
        
        const mediaId = uuidv4();
        const id = `MANUAL#${userId}#${mediaId}`;
        const now = new Date().toISOString();

        const mediaItem = {
            id,
            media_type,
            external_id: null,
            source: null,
            is_manual: true,
            user_id: userId,
            title,
            description,
            cover_image: cover_image || null,
            release_date,
            created_at: now,
            updated_at: now
        };

        await docClient.send(new PutCommand({
            TableName: TABLES.MEDIA,
            Item: mediaItem
        }));

        res.status(201).json(mediaItem);
    } catch (error) {
        console.error('Error creating manual media:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateMedia = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.sub;
        const id = req.params.id as string;
        const { cover_image, title, description } = req.body;
        const now = new Date().toISOString();

        const existing = await docClient.send(new GetCommand({
            TableName: TABLES.MEDIA,
            Key: { id }
        }));

        if (!existing.Item) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Security invariant: Provider-sourced media is global and immutable; only user-owned manual media can be updated
        if (!existing.Item.is_manual || existing.Item.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden: Only owned manual media can be updated' });
        }

        if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0 || title.length > 300)) {
            return res.status(400).json({ error: 'Title must be between 1 and 300 characters' });
        }

        if (cover_image && typeof cover_image === 'string') {
            if (!cover_image.startsWith('https://') && !cover_image.startsWith('http://') && !cover_image.startsWith('data:image/')) {
                return res.status(400).json({ error: 'Cover image must start with https://, http://, or data:image/' });
            }
        }

        if (description && (typeof description !== 'string' || description.length > 5000)) {
            return res.status(400).json({ error: 'Description must not exceed 5000 characters' });
        }

        const updated = {
            ...existing.Item,
            ...(cover_image !== undefined && { cover_image }),
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            updated_at: now
        };

        await docClient.send(new PutCommand({
            TableName: TABLES.MEDIA,
            Item: updated
        }));

        res.json(updated);
    } catch (error) {
        console.error('Error updating media:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const batchGetMedia = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body; // array of media IDs
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids must be a non-empty array' });
        }

        if (ids.length > 100) {
            return res.status(400).json({ error: 'ids array cannot exceed 100 items per request' });
        }

        const validIds = ids.filter(id => typeof id === 'string' && id.trim().length > 0 && id.length <= 256);
        if (validIds.length === 0) {
            return res.status(400).json({ error: 'No valid ids provided' });
        }

        const keys = validIds.map(id => ({ id }));
        
        const result = await docClient.send(new BatchGetCommand({
            RequestItems: {
                [TABLES.MEDIA]: {
                    Keys: keys
                }
            }
        }));

        const items = result.Responses ? result.Responses[TABLES.MEDIA] : [];
        res.json({ items });
    } catch (error) {
        console.error('Error batch getting media:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
