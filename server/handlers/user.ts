import { Request, Response } from 'express';
import { docClient } from '../lib/db';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { username, display_name } = req.body;
        // Check if username exists using GSI
        const queryResult = await docClient.send(new QueryCommand({
            TableName: 'User',
            IndexName: 'UsernameIndex',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        }));

        if (queryResult.Items && queryResult.Items.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        const user = {
            id,
            username,
            display_name,
            profile_visibility: 'private',
            profile_version: 0,
            created_at: now,
            updated_at: now
        };

        await docClient.send(new PutCommand({
            TableName: 'User',
            Item: user
        }));

        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        let { id } = req.params;
        if (id === 'me') {
            id = (req as any).user?.sub;
        }
        if (!id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await docClient.send(new GetCommand({
            TableName: 'User',
            Key: { id }
        }));

        if (!result.Item) {
            if (req.params.id === 'me' && (req as any).user) {
                const now = new Date().toISOString();
                const username = (req as any).user?.username || `user_${id.slice(0, 8)}`;
                const newUser = {
                    id,
                    username,
                    display_name: username,
                    profile_visibility: 'public',
                    profile_version: 1,
                    created_at: now,
                    updated_at: now
                };
                await docClient.send(new PutCommand({
                    TableName: 'User',
                    Item: newUser
                }));
                return res.json(newUser);
            }
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.Item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getUserByUsername = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const result = await docClient.send(new QueryCommand({
            TableName: 'User',
            IndexName: 'UsernameIndex',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        }));

        let user = result.Items?.[0];

        if (!user) {
            const expCheck = await docClient.send(new QueryCommand({
                TableName: 'Experience',
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': `USER#${username}`
                },
                Limit: 1
            }));

            if (expCheck.Items && expCheck.Items.length > 0) {
                const now = new Date().toISOString();
                user = {
                    id: username,
                    username,
                    display_name: username,
                    profile_visibility: 'public',
                    profile_version: 1,
                    created_at: now,
                    updated_at: now
                };
                await docClient.send(new PutCommand({
                    TableName: 'User',
                    Item: user
                }));
            } else {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        const callerUserId = (req as any).user?.sub;
        const isOwner = callerUserId === user.id;

        // Privacy enforcement (TICK-002)
        if (user.profile_visibility === 'private' && !isOwner) {
            return res.json({
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                profile_visibility: 'private',
                entries_count: 0,
                experiences: []
            });
        }

        // Fetch public experiences
        const expResult = await docClient.send(new QueryCommand({
            TableName: 'Experience',
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `USER#${user.id}`
            }
        }));

        const allExps = expResult.Items || [];
        const visibleExps = isOwner
            ? allExps
            : allExps.filter(e => e.visibility !== 'private');

        // Fetch cover images via BatchGet for media items
        const mediaIds = Array.from(new Set(visibleExps.map(e => e.media_id).filter(Boolean))) as string[];
        const mediaMap: Record<string, any> = {};
        if (mediaIds.length > 0) {
            try {
                const batchResult = await docClient.send(new BatchGetCommand({
                    RequestItems: {
                        'Media': {
                            Keys: mediaIds.slice(0, 100).map(id => ({ id }))
                        }
                    }
                }));
                const mediaItems = batchResult.Responses?.['Media'] || [];
                mediaItems.forEach((m: any) => {
                    mediaMap[m.id] = m;
                });
            } catch (mErr) {
                console.error('Error fetching media for public profile:', mErr);
            }
        }

        const enrichedExps = visibleExps.map(e => ({
            ...e,
            cover_image: mediaMap[e.media_id]?.cover_image || null,
        }));

        res.json({
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            bio: user.bio,
            profile_visibility: user.profile_visibility || 'public',
            created_at: user.created_at,
            profile_version: user.profile_version || 1,
            entries_count: enrichedExps.length,
            experiences: enrichedExps,
        });
    } catch (error) {
        console.error('Error fetching user by username:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        let { id } = req.params;
        if (id === 'me') {
            id = (req as any).user?.sub;
        }
        if (!id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { username, display_name, bio, profile_visibility } = req.body;
        
        const now = new Date().toISOString();

        const updateExpr = [];
        const exprVals: Record<string, any> = { ':updated_at': now };
        const exprNames: Record<string, string> = { '#updated_at': 'updated_at' };

        if (username !== undefined) {
            updateExpr.push('username = :username');
            exprVals[':username'] = username;
        }

        if (display_name !== undefined) {
            updateExpr.push('display_name = :display_name');
            exprVals[':display_name'] = display_name;
        }

        if (bio !== undefined) {
            updateExpr.push('bio = :bio');
            exprVals[':bio'] = bio;
        }

        if (profile_visibility !== undefined) {
            updateExpr.push('profile_visibility = :profile_visibility');
            exprVals[':profile_visibility'] = profile_visibility;
            
            // Increment profile_version safely if visibility changed
            updateExpr.push('profile_version = if_not_exists(profile_version, :zero) + :inc');
            exprVals[':inc'] = 1;
            exprVals[':zero'] = 0;
        }

        if (updateExpr.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await docClient.send(new UpdateCommand({
            TableName: 'User',
            Key: { id },
            UpdateExpression: `SET ${updateExpr.join(', ')}, #updated_at = :updated_at`,
            ExpressionAttributeValues: exprVals,
            ExpressionAttributeNames: exprNames,
            ReturnValues: 'ALL_NEW'
        }));

        res.json(result.Attributes);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        let { id } = req.params;
        if (id === 'me') {
            id = (req as any).user?.sub;
        }
        if (!id || id !== (req as any).user?.sub) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Delete user's experiences
        const expResult = await docClient.send(new QueryCommand({
            TableName: 'Experience',
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `USER#${id}`
            }
        }));

        for (const exp of expResult.Items || []) {
            await docClient.send(new DeleteCommand({
                TableName: 'Experience',
                Key: { PK: exp.PK, SK: exp.SK }
            }));
        }

        // Soft-delete user's custom categories
        const catResult = await docClient.send(new ScanCommand({
            TableName: 'Category',
            FilterExpression: 'user_id = :userId',
            ExpressionAttributeValues: {
                ':userId': id
            }
        }));

        const now = new Date().toISOString();
        for (const cat of catResult.Items || []) {
            await docClient.send(new UpdateCommand({
                TableName: 'Category',
                Key: { id: cat.id },
                UpdateExpression: 'SET deleted_at = :now, updated_at = :now',
                ExpressionAttributeValues: { ':now': now }
            }));
        }

        // Delete user row
        await docClient.send(new DeleteCommand({
            TableName: 'User',
            Key: { id }
        }));

        res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
