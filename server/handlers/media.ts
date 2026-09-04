import { Request, Response } from 'express';
import { docClient } from '../lib/db';
import { PutCommand, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const resolveMedia = async (req: Request, res: Response) => {
    try {
        const { source, external_id, title, media_type, description, cover_image, release_date } = req.body;
        
        if (!source || !external_id) {
            return res.status(400).json({ error: 'source and external_id are required' });
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
                TableName: 'Media',
                Item: mediaItem,
                ConditionExpression: 'attribute_not_exists(id)'
            }));
            return res.status(201).json(mediaItem);
        } catch (err: any) {
            if (err.name === 'ConditionalCheckFailedException') {
                // Item already exists, return it
                const existing = await docClient.send(new GetCommand({
                    TableName: 'Media',
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
        const { title, media_type, description, release_date } = req.body;
        
        const mediaId = uuidv4();
        const id = `MANUAL#${userId}#${mediaId}`;
        const now = new Date().toISOString();
        
        // Note: Cover image will be handled via presigned S3 upload 
        // to users/{userId}/manual-media/{mediaId}/cover.jpg and updated separately.

        const mediaItem = {
            id,
            media_type,
            external_id: null,
            source: null,
            is_manual: true,
            user_id: userId,
            title,
            description,
            cover_image: null,
            release_date,
            created_at: now,
            updated_at: now
        };

        await docClient.send(new PutCommand({
            TableName: 'Media',
            Item: mediaItem
        }));

        res.status(201).json(mediaItem);
    } catch (error) {
        console.error('Error creating manual media:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const batchGetMedia = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body; // array of media IDs
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids must be a non-empty array' });
        }

        const keys = ids.map(id => ({ id }));
        
        // DynamoDB BatchGet limits to 100 items per request, assuming < 100 here.
        // For production, chunk array into 100s.
        const result = await docClient.send(new BatchGetCommand({
            RequestItems: {
                'Media': {
                    Keys: keys
                }
            }
        }));

        const items = result.Responses ? result.Responses['Media'] : [];
        res.json({ items });
    } catch (error) {
        console.error('Error batch getting media:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
