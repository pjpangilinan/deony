import { Request, Response } from 'express';
import { docClient, TABLES } from '../lib/db';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

export const createUser = async (req: Request, res: Response) => {
    try {
        const callerUserId = (req as any).user?.sub;
        if (!callerUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { username, display_name } = req.body;

        if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-30 characters containing only letters, numbers, underscores, or hyphens' });
        }

        if (display_name && (typeof display_name !== 'string' || display_name.length > 100)) {
            return res.status(400).json({ error: 'Display name must not exceed 100 characters' });
        }

        // Prevent duplicate user creation for same Cognito sub
        const existingUser = await docClient.send(new GetCommand({
            TableName: TABLES.USER,
            Key: { id: callerUserId }
        }));
        if (existingUser.Item) {
            return res.status(409).json({ error: 'User profile already exists' });
        }

        // Check if username exists using GSI
        const queryResult = await docClient.send(new QueryCommand({
            TableName: TABLES.USER,
            IndexName: 'UsernameIndex',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        }));

        if (queryResult.Items && queryResult.Items.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const now = new Date().toISOString();

        const user = {
            id: callerUserId,
            username,
            display_name: display_name || username,
            profile_visibility: 'private',
            profile_version: 0,
            created_at: now,
            updated_at: now
        };

        await docClient.send(new PutCommand({
            TableName: TABLES.USER,
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
        const callerUserId = (req as any).user?.sub;
        if (id === 'me') {
            id = callerUserId;
        }
        if (!id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await docClient.send(new GetCommand({
            TableName: TABLES.USER,
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
                    search_indexing: true,
                    avatar_url: null,
                    created_at: now,
                    updated_at: now
                };
                await docClient.send(new PutCommand({
                    TableName: TABLES.USER,
                    Item: newUser
                }));
                return res.json(newUser);
            }
            return res.status(404).json({ error: 'User not found' });
        }

        const isOwner = callerUserId === result.Item.id;
        // Privacy enforcement: mask private profile data for non-owners
        if (result.Item.profile_visibility === 'private' && !isOwner) {
            return res.json({
                id: result.Item.id,
                username: result.Item.username,
                display_name: result.Item.display_name,
                avatar_url: result.Item.avatar_url || null,
                profile_visibility: 'private',
                entries_count: 0
            });
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
            TableName: TABLES.USER,
            IndexName: 'UsernameIndex',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        }));

        let user = result.Items?.[0];

        if (!user) {
            const expCheck = await docClient.send(new QueryCommand({
                TableName: TABLES.EXPERIENCE,
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
                    TableName: TABLES.USER,
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
                avatar_url: user.avatar_url || null,
                profile_visibility: 'private',
                entries_count: 0,
                experiences: []
            });
        }

        // Fetch public experiences
        const expResult = await docClient.send(new QueryCommand({
            TableName: TABLES.EXPERIENCE,
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
                for (let i = 0; i < mediaIds.length; i += 100) {
                    const chunk = mediaIds.slice(i, i + 100);
                    const batchResult = await docClient.send(new BatchGetCommand({
                        RequestItems: {
                            [TABLES.MEDIA]: {
                                Keys: chunk.map(id => ({ id }))
                            }
                        }
                    }));
                    const mediaItems = batchResult.Responses?.[TABLES.MEDIA] || [];
                    mediaItems.forEach((m: any) => {
                        mediaMap[m.id] = m;
                    });
                }
            } catch (mErr) {
                console.error('Error fetching media for public profile:', mErr);
            }
        }

        const enrichedExps = visibleExps.map(e => ({
            ...e,
            cover_image: mediaMap[e.media_id]?.cover_image || (e as any).cover_image || null,
        }));

        res.json({
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            bio: user.bio,
            avatar_url: user.avatar_url || null,
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
        const callerId = (req as any).user?.sub;
        if (id === 'me') {
            id = callerId;
        }
        if (!id || !callerId || id !== callerId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { username, display_name, bio, profile_visibility, search_indexing, avatar_url } = req.body;

        if (username !== undefined) {
            const cleanUsername = typeof username === 'string' ? username.trim().replace(/^@/, '') : '';
            if (!cleanUsername || !/^[a-zA-Z0-9_-]{3,30}$/.test(cleanUsername)) {
                return res.status(400).json({ error: 'Username must be 3-30 characters containing only letters, numbers, underscores, or hyphens' });
            }

            // Check if username is already taken by another user
            const existingQuery = await docClient.send(new QueryCommand({
                TableName: TABLES.USER,
                IndexName: 'UsernameIndex',
                KeyConditionExpression: 'username = :username',
                ExpressionAttributeValues: {
                    ':username': cleanUsername
                }
            }));

            const conflict = existingQuery.Items?.find(item => item.id !== id);
            if (conflict) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }

        if (display_name !== undefined && display_name !== null) {
            if (typeof display_name !== 'string' || display_name.length > 100) {
                return res.status(400).json({ error: 'Display name must not exceed 100 characters' });
            }
        }

        if (bio !== undefined && bio !== null) {
            if (typeof bio !== 'string' || bio.length > 500) {
                return res.status(400).json({ error: 'Bio must not exceed 500 characters' });
            }
        }

        if (profile_visibility !== undefined) {
            if (!['public', 'private'].includes(profile_visibility)) {
                return res.status(400).json({ error: 'Profile visibility must be either "public" or "private"' });
            }
        }

        if (search_indexing !== undefined) {
            if (typeof search_indexing !== 'boolean') {
                return res.status(400).json({ error: 'search_indexing must be a boolean' });
            }
        }

        if (avatar_url !== undefined && avatar_url !== null && avatar_url !== '') {
            if (typeof avatar_url !== 'string') {
                return res.status(400).json({ error: 'avatar_url must be a string or null' });
            }
            if (!avatar_url.startsWith('https://') && !avatar_url.startsWith('http://') && !avatar_url.startsWith('data:image/')) {
                return res.status(400).json({ error: 'avatar_url must start with https://, http://, or data:image/' });
            }
            if (avatar_url.length > 600000) {
                return res.status(400).json({ error: 'avatar_url exceeds maximum allowed length' });
            }
        }
        
        const now = new Date().toISOString();

        const updateExpr = [];
        const exprVals: Record<string, any> = { ':updated_at': now };
        const exprNames: Record<string, string> = { '#updated_at': 'updated_at' };

        if (username !== undefined) {
            const cleanUsername = typeof username === 'string' ? username.trim().replace(/^@/, '') : username;
            updateExpr.push('username = :username');
            exprVals[':username'] = cleanUsername;
        }

        if (display_name !== undefined) {
            updateExpr.push('display_name = :display_name');
            exprVals[':display_name'] = display_name;
        }

        if (bio !== undefined) {
            updateExpr.push('bio = :bio');
            exprVals[':bio'] = bio;
        }

        if (avatar_url !== undefined) {
            updateExpr.push('avatar_url = :avatar_url');
            exprVals[':avatar_url'] = avatar_url || null;
        }

        if (search_indexing !== undefined) {
            updateExpr.push('search_indexing = :search_indexing');
            exprVals[':search_indexing'] = search_indexing;
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
            TableName: TABLES.USER,
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
            TableName: TABLES.EXPERIENCE,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `USER#${id}`
            }
        }));

        for (const exp of expResult.Items || []) {
            await docClient.send(new DeleteCommand({
                TableName: TABLES.EXPERIENCE,
                Key: { PK: exp.PK, SK: exp.SK }
            }));
        }

        // Soft-delete user's custom categories
        const catResult = await docClient.send(new ScanCommand({
            TableName: TABLES.CATEGORY,
            FilterExpression: 'user_id = :userId',
            ExpressionAttributeValues: {
                ':userId': id
            }
        }));

        const now = new Date().toISOString();
        for (const cat of catResult.Items || []) {
            await docClient.send(new UpdateCommand({
                TableName: TABLES.CATEGORY,
                Key: { id: cat.id },
                UpdateExpression: 'SET deleted_at = :now, updated_at = :now',
                ExpressionAttributeValues: { ':now': now }
            }));
        }

        // Delete user row
        await docClient.send(new DeleteCommand({
            TableName: TABLES.USER,
            Key: { id }
        }));

        res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
