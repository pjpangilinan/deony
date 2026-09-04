import { Request, Response } from 'express';
import { docClient } from '../lib/db';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';


export const createExperience = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { 
            idempotency_key,
            media_id, 
            category_id, 
            status, 
            rating, 
            started_on, 
            ended_on, 
            thoughts, 
            visibility 
        } = req.body;

        if (!idempotency_key) {
            return res.status(400).json({ error: 'idempotency_key is required' });
        }

        // Fetch media for denormalization
        const mediaRes = await docClient.send(new GetCommand({
            TableName: 'Media',
            Key: { id: media_id }
        }));
        if (!mediaRes.Item) {
            return res.status(404).json({ error: 'Media not found' });
        }
        
        const media = mediaRes.Item;
        const experience_id = idempotency_key; // Use key as ID for idempotency via condition expression
        const PK = `USER#${userId}`;
        const SK = `EXP#${experience_id}`;
        const now = new Date().toISOString();

        let sort_date: string | undefined = undefined;
        if (status === 'Currently Experiencing') {
            sort_date = started_on;
        } else if (status === 'Completed') {
            sort_date = ended_on;
        } else if (status === 'Dropped') {
            sort_date = ended_on || started_on || now;
        }
        // For 'Want to Experience', sort_date remains absent

        const experience = {
            id: experience_id,
            PK,
            SK,
            user_id: userId,
            media_id,
            category_id,
            status,
            rating: rating !== undefined ? rating : null,
            started_on,
            ended_on,
            sort_date,
            thoughts,
            visibility,
            media_title: media.title,
            media_type: media.media_type,
            version: 1,
            created_at: now,
            updated_at: now,
            GSI1SK: `${category_id}#${status}#${sort_date || ''}`,
            GSI2SK: sort_date ? `${sort_date}#${experience_id}` : undefined,
            GSI3SK: `${(media.title || '').toLowerCase()}#${experience_id}`,
            GSI4SK: `${now}#${experience_id}`
        };

        try {
            await docClient.send(new PutCommand({
                TableName: 'Experience',
                Item: experience,
                ConditionExpression: 'attribute_not_exists(SK)'
            }));
            return res.status(201).json(experience);
        } catch (err: any) {
            if (err.name === 'ConditionalCheckFailedException') {
                // Idempotent return
                const existing = await docClient.send(new GetCommand({
                    TableName: 'Experience',
                    Key: { PK, SK }
                }));
                return res.json(existing.Item);
            }
            throw err;
        }
    } catch (error) {
        console.error('Error creating experience:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateExperience = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { id } = req.params;
        const { 
            category_id, 
            status, 
            rating, 
            started_on, 
            ended_on, 
            thoughts, 
            visibility,
            version 
        } = req.body;

        if (version === undefined) {
            return res.status(400).json({ error: 'version is required for optimistic concurrency' });
        }

        const PK = `USER#${userId}`;
        const SK = `EXP#${id}`;
        
        // We need the existing item to calculate new sort_date if fields change
        const getRes = await docClient.send(new GetCommand({
            TableName: 'Experience',
            Key: { PK, SK }
        }));
        
        if (!getRes.Item) {
            return res.status(404).json({ error: 'Experience not found' });
        }
        
        const existing = getRes.Item;
        const newStatus = status !== undefined ? status : existing.status;
        const newStarted = started_on !== undefined ? started_on : existing.started_on;
        const newEnded = ended_on !== undefined ? ended_on : existing.ended_on;
        const newCategory = category_id !== undefined ? category_id : existing.category_id;
        
        let newSortDate: string | undefined = undefined;
        if (newStatus === 'Currently Experiencing') {
            newSortDate = newStarted;
        } else if (newStatus === 'Completed') {
            newSortDate = newEnded;
        } else if (newStatus === 'Dropped') {
            newSortDate = newEnded || newStarted || existing.created_at;
        }

        const now = new Date().toISOString();
        const setClauses: string[] = [];
        const removeClauses: string[] = [];
        const exprVals: Record<string, any> = { 
            ':updated_at': now,
            ':expected_version': version,
            ':new_version': version + 1
        };
        const exprNames: Record<string, string> = { 
            '#updated_at': 'updated_at',
            '#status': 'status',
            '#version': 'version'
        };

        setClauses.push('#updated_at = :updated_at');
        setClauses.push('#version = :new_version');

        if (status !== undefined) { setClauses.push('#status = :status'); exprVals[':status'] = status; }
        if (rating !== undefined) { setClauses.push('rating = :rating'); exprVals[':rating'] = rating; }
        if (started_on !== undefined) { setClauses.push('started_on = :started_on'); exprVals[':started_on'] = started_on; }
        if (ended_on !== undefined) { setClauses.push('ended_on = :ended_on'); exprVals[':ended_on'] = ended_on; }
        if (thoughts !== undefined) { setClauses.push('thoughts = :thoughts'); exprVals[':thoughts'] = thoughts; }
        if (visibility !== undefined) { setClauses.push('visibility = :visibility'); exprVals[':visibility'] = visibility; }
        if (category_id !== undefined) { setClauses.push('category_id = :category_id'); exprVals[':category_id'] = category_id; }
        
        // Update GSIs
        setClauses.push('GSI1SK = :gsi1sk');
        exprVals[':gsi1sk'] = `${newCategory}#${newStatus}#${newSortDate || ''}`;
        
        if (newSortDate) {
            setClauses.push('sort_date = :sort_date');
            exprVals[':sort_date'] = newSortDate;
            
            setClauses.push('GSI2SK = :gsi2sk');
            exprVals[':gsi2sk'] = `${newSortDate}#${id}`;
        } else {
            removeClauses.push('sort_date', 'GSI2SK');
        }

        let updateExprStr = `SET ${setClauses.join(', ')}`;
        if (removeClauses.length > 0) {
            updateExprStr += ` REMOVE ${removeClauses.join(', ')}`;
        }

        try {
            const result = await docClient.send(new UpdateCommand({
                TableName: 'Experience',
                Key: { PK, SK },
                UpdateExpression: updateExprStr,
                ConditionExpression: '#version = :expected_version',
                ExpressionAttributeValues: exprVals,
                ExpressionAttributeNames: exprNames,
                ReturnValues: 'ALL_NEW'
            }));
            res.json(result.Attributes);
        } catch (err: any) {
            if (err.name === 'ConditionalCheckFailedException') {
                return res.status(409).json({ error: 'Conflict: version mismatch' });
            }
            throw err;
        }

    } catch (error) {
        console.error('Error updating experience:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getExperience = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { id } = req.params;
        const result = await docClient.send(new GetCommand({
            TableName: 'Experience',
            Key: { PK: `USER#${userId}`, SK: `EXP#${id}` }
        }));
        
        if (!result.Item) {
            return res.status(404).json({ error: 'Experience not found' });
        }
        res.json(result.Item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteExperience = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { id } = req.params;
        await docClient.send(new DeleteCommand({
            TableName: 'Experience',
            Key: { PK: `USER#${userId}`, SK: `EXP#${id}` }
        }));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const listExperiences = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        // Simple query for MVP using RecentlyAddedIndex if no params, or just PK.
        const result = await docClient.send(new QueryCommand({
            TableName: 'Experience',
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': `USER#${userId}` }
        }));
        res.json({ items: result.Items || [] });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
