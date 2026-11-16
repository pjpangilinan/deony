import { Request, Response } from 'express';
import { docClient, TABLES } from '../lib/db';
import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const VALID_STATUSES = ['Want to Experience', 'Currently Experiencing', 'Completed', 'Dropped'];
const VALID_VISIBILITIES = ['public', 'private'];

function isValidDateStr(d: unknown): d is string {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const parsed = new Date(`${d}T00:00:00Z`);
    return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(d);
}


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

        if (typeof idempotency_key !== 'string' || idempotency_key.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(idempotency_key)) {
            return res.status(400).json({ error: 'Valid idempotency_key is required' });
        }

        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        }

        if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility)) {
            return res.status(400).json({ error: 'visibility must be "public" or "private"' });
        }

        if (started_on !== undefined && started_on !== null && started_on !== '' && !isValidDateStr(started_on)) {
            return res.status(400).json({ error: 'started_on must be a valid YYYY-MM-DD date' });
        }

        if (ended_on !== undefined && ended_on !== null && ended_on !== '' && !isValidDateStr(ended_on)) {
            return res.status(400).json({ error: 'ended_on must be a valid YYYY-MM-DD date' });
        }

        const cleanStartedOn = status === 'Want to Experience' ? undefined : (started_on || undefined);
        const cleanEndedOn = status === 'Want to Experience' ? undefined : (ended_on || undefined);

        if (cleanStartedOn && cleanEndedOn && cleanStartedOn > cleanEndedOn) {
            return res.status(400).json({ error: 'started_on cannot be after ended_on' });
        }

        if (rating !== undefined && rating !== null) {
            if (typeof rating !== 'number' || isNaN(rating) || rating < 0 || rating > 10) {
                return res.status(400).json({ error: 'Rating must be a number between 0 and 10, or null' });
            }
        }

        if (thoughts && typeof thoughts === 'string' && thoughts.length > 50000) {
            return res.status(400).json({ error: 'Thoughts must not exceed 50,000 characters' });
        }

        // Fetch category
        const catRes = await docClient.send(new GetCommand({
            TableName: TABLES.CATEGORY,
            Key: { id: category_id }
        }));
        if (!catRes.Item || catRes.Item.user_id !== userId || catRes.Item.deleted_at !== null) {
            return res.status(400).json({ error: 'Invalid or deleted category' });
        }

        // Fetch media for denormalization
        const mediaRes = await docClient.send(new GetCommand({
            TableName: TABLES.MEDIA,
            Key: { id: media_id }
        }));
        if (!mediaRes.Item) {
            return res.status(404).json({ error: 'Media not found' });
        }
        const media = mediaRes.Item;

        if (media.is_manual && media.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden: Cannot use another user\'s manual media' });
        }
        if (media.media_type !== catRes.Item.media_type) {
            return res.status(400).json({ error: 'Category media_type does not match media item type' });
        }
        
        const experience_id = idempotency_key; // Use key as ID for idempotency via condition expression
        const PK = `USER#${userId}`;
        const SK = `EXP#${experience_id}`;
        const now = new Date().toISOString();

        let sort_date: string | undefined = undefined;
        if (status === 'Currently Experiencing') {
            sort_date = cleanStartedOn;
        } else if (status === 'Completed') {
            sort_date = cleanEndedOn;
        } else if (status === 'Dropped') {
            sort_date = cleanEndedOn || cleanStartedOn || now;
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
            started_on: cleanStartedOn,
            ended_on: cleanEndedOn,
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

        const isPublic = visibility !== 'private';
        const transactItems: any[] = [
            {
                Put: {
                    TableName: TABLES.EXPERIENCE,
                    Item: experience,
                    ConditionExpression: 'attribute_not_exists(SK)'
                }
            }
        ];

        if (isPublic) {
            transactItems.push({
                Update: {
                    TableName: TABLES.USER,
                    Key: { id: userId },
                    UpdateExpression: 'ADD profile_version :one',
                    ExpressionAttributeValues: { ':one': 1 }
                }
            });
        }

        try {
            await docClient.send(new TransactWriteCommand({
                TransactItems: transactItems
            }));
            return res.status(201).json(experience);
        } catch (err: any) {
            const isCondCheckFailed = err.name === 'ConditionalCheckFailedException' || (err.name === 'TransactionCanceledException' && err.CancellationReasons?.[0]?.Code === 'ConditionalCheckFailed');
            if (isCondCheckFailed) {
                // Idempotent return
                const existing = await docClient.send(new GetCommand({
                    TableName: TABLES.EXPERIENCE,
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

        if (!Number.isInteger(version)) {
            return res.status(400).json({ error: 'version is required for optimistic concurrency' });
        }

        if (status !== undefined && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        }

        if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility)) {
            return res.status(400).json({ error: 'visibility must be "public" or "private"' });
        }

        if (started_on !== undefined && started_on !== null && started_on !== '' && !isValidDateStr(started_on)) {
            return res.status(400).json({ error: 'started_on must be a valid YYYY-MM-DD date' });
        }

        if (ended_on !== undefined && ended_on !== null && ended_on !== '' && !isValidDateStr(ended_on)) {
            return res.status(400).json({ error: 'ended_on must be a valid YYYY-MM-DD date' });
        }

        if (rating !== undefined && rating !== null) {
            if (typeof rating !== 'number' || isNaN(rating) || rating < 0 || rating > 10) {
                return res.status(400).json({ error: 'Rating must be a number between 0 and 10, or null' });
            }
        }

        if (thoughts && typeof thoughts === 'string' && thoughts.length > 50000) {
            return res.status(400).json({ error: 'Thoughts must not exceed 50,000 characters' });
        }

        const PK = `USER#${userId}`;
        const SK = `EXP#${id}`;
        
        // We need the existing item to calculate new sort_date if fields change
        const getRes = await docClient.send(new GetCommand({
            TableName: TABLES.EXPERIENCE,
            Key: { PK, SK }
        }));
        
        if (!getRes.Item) {
            return res.status(404).json({ error: 'Experience not found' });
        }
        
        const existing = getRes.Item;
        const newStatus = status !== undefined ? status : existing.status;
        const newStarted = started_on !== undefined ? (started_on || undefined) : existing.started_on;
        const newEnded = ended_on !== undefined ? (ended_on || undefined) : existing.ended_on;
        const newCategory = category_id !== undefined ? category_id : existing.category_id;

        if (newStarted && newEnded && newStarted > newEnded) {
            return res.status(400).json({ error: 'started_on cannot be after ended_on' });
        }

        if (category_id !== undefined && category_id !== existing.category_id) {
            const catRes = await docClient.send(new GetCommand({
                TableName: TABLES.CATEGORY,
                Key: { id: category_id }
            }));
            if (!catRes.Item || catRes.Item.user_id !== userId || catRes.Item.deleted_at !== null) {
                return res.status(400).json({ error: 'Invalid or deleted category' });
            }
            if (catRes.Item.media_type !== existing.media_type) {
                return res.status(400).json({ error: 'Category media_type does not match media item type' });
            }
        }
        
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

        const transactItems: any[] = [
            {
                Update: {
                    TableName: TABLES.EXPERIENCE,
                    Key: { PK, SK },
                    UpdateExpression: updateExprStr,
                    ConditionExpression: '#version = :expected_version',
                    ExpressionAttributeValues: exprVals,
                    ExpressionAttributeNames: exprNames,
                    // ReturnValues: 'ALL_NEW' not supported in TransactWriteItems
                }
            }
        ];

        // Bump profile version if item is currently public, or is being made public
        const isPublicNow = existing.visibility !== 'private';
        const isPublicAfter = visibility !== undefined ? visibility !== 'private' : isPublicNow;
        
        if (isPublicNow || isPublicAfter) {
            transactItems.push({
                Update: {
                    TableName: TABLES.USER,
                    Key: { id: userId },
                    UpdateExpression: 'ADD profile_version :one',
                    ExpressionAttributeValues: { ':one': 1 }
                }
            });
        }

        try {
            await docClient.send(new TransactWriteCommand({
                TransactItems: transactItems
            }));
            
            // Re-fetch because ALL_NEW is not supported in transactions
            const updated = await docClient.send(new GetCommand({
                TableName: TABLES.EXPERIENCE,
                Key: { PK, SK }
            }));
            res.json(updated.Item);
        } catch (err: any) {
            const isCondCheckFailed = err.name === 'ConditionalCheckFailedException' || (err.name === 'TransactionCanceledException' && err.CancellationReasons?.[0]?.Code === 'ConditionalCheckFailed');
            if (isCondCheckFailed) {
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
            TableName: TABLES.EXPERIENCE,
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
        const PK = `USER#${userId}`;
        const SK = `EXP#${id}`;
        
        // Fetch to see if it was public
        const getRes = await docClient.send(new GetCommand({
            TableName: TABLES.EXPERIENCE,
            Key: { PK, SK }
        }));

        if (!getRes.Item) {
            return res.status(204).send(); // Idempotent
        }

        const isPublic = getRes.Item.visibility !== 'private';
        const transactItems: any[] = [
            {
                Delete: {
                    TableName: TABLES.EXPERIENCE,
                    Key: { PK, SK }
                }
            }
        ];

        if (isPublic) {
            transactItems.push({
                Update: {
                    TableName: TABLES.USER,
                    Key: { id: userId },
                    UpdateExpression: 'ADD profile_version :one',
                    ExpressionAttributeValues: { ':one': 1 }
                }
            });
        }

        await docClient.send(new TransactWriteCommand({
            TransactItems: transactItems
        }));
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const listExperiences = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const rawLimit = req.query.limit ? Number(req.query.limit) : 200;
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 200;

        let exclusiveStartKey: Record<string, any> | undefined = undefined;
        if (typeof req.query.cursor === 'string' && req.query.cursor.length > 0) {
            try {
                const decoded = Buffer.from(req.query.cursor, 'base64url').toString('utf8');
                const parsed = JSON.parse(decoded);
                if (!parsed || typeof parsed !== 'object' || parsed.PK !== `USER#${userId}`) {
                    return res.status(400).json({ error: 'Invalid pagination cursor' });
                }
                exclusiveStartKey = parsed;
            } catch {
                return res.status(400).json({ error: 'Invalid pagination cursor' });
            }
        }

        const result = await docClient.send(new QueryCommand({
            TableName: TABLES.EXPERIENCE,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': `USER#${userId}` },
            Limit: limit,
            ExclusiveStartKey: exclusiveStartKey,
        }));

        const nextCursor = result.LastEvaluatedKey
            ? Buffer.from(JSON.stringify(result.LastEvaluatedKey), 'utf8').toString('base64url')
            : undefined;

        res.json({
            items: result.Items || [],
            ...(nextCursor ? { nextCursor } : {}),
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
