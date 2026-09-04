import { Request, Response } from 'express';
import { docClient, TABLES } from '../lib/db';
import { PutCommand, ScanCommand, UpdateCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const createCategory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { name, media_type, icon, color, sort_order, is_builtin } = req.body;

        const VALID_MEDIA_TYPES = ['movie', 'tv', 'book', 'game'];
        if (!media_type || !VALID_MEDIA_TYPES.includes(media_type)) {
            return res.status(400).json({ error: `Invalid media_type. Must be one of: ${VALID_MEDIA_TYPES.join(', ')}` });
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
            return res.status(400).json({ error: 'Category name must be between 1 and 100 characters' });
        }
        
        const id = uuidv4();
        const now = new Date().toISOString();
        const normalized_name = (name || '').toLowerCase().trim();

        const category = {
            id,
            user_id: userId,
            name,
            normalized_name,
            media_type,
            icon,
            color,
            sort_order: sort_order || 0,
            is_builtin: is_builtin || false,
            deleted_at: null,
            created_at: now,
            updated_at: now
        };

        await docClient.send(new PutCommand({
            TableName: TABLES.CATEGORY,
            Item: category
        }));

        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const listCategories = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        
        const result = await docClient.send(new ScanCommand({
            TableName: TABLES.CATEGORY,
            FilterExpression: 'user_id = :userId AND (attribute_not_exists(deleted_at) OR deleted_at = :nullValue)',
            ExpressionAttributeValues: {
                ':userId': userId,
                ':nullValue': null
            }
        }));

        const expResult = await docClient.send(new QueryCommand({
            TableName: TABLES.EXPERIENCE,
            KeyConditionExpression: 'PK = :pk',
            ProjectionExpression: 'category_id',
            ExpressionAttributeValues: {
                ':pk': `USER#${userId}`
            }
        }));

        const counts: Record<string, number> = {};
        for (const exp of expResult.Items || []) {
            if (exp.category_id) {
                counts[exp.category_id] = (counts[exp.category_id] || 0) + 1;
            }
        }

        const items = (result.Items || []).map(cat => ({
            ...cat,
            count: counts[cat.id] || 0
        }));

        res.json({ items });
    } catch (error) {
        console.error('Error listing categories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { id } = req.params;
        const { name, icon, color, sort_order } = req.body;
        // media_type is immutable, do not update

        const getRes = await docClient.send(new GetCommand({
            TableName: TABLES.CATEGORY,
            Key: { id }
        }));

        if (!getRes.Item || getRes.Item.user_id !== userId) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const now = new Date().toISOString();
        const updateExpr = [];
        const exprVals: Record<string, any> = { ':updated_at': now };
        const exprNames: Record<string, string> = { '#updated_at': 'updated_at' };

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
                return res.status(400).json({ error: 'Category name must be between 1 and 100 characters' });
            }
            updateExpr.push('#name = :name');
            updateExpr.push('normalized_name = :normalized_name');
            exprVals[':name'] = name;
            exprVals[':normalized_name'] = name.toLowerCase().trim();
            exprNames['#name'] = 'name';
        }
        if (icon !== undefined) {
            updateExpr.push('icon = :icon');
            exprVals[':icon'] = icon;
        }
        if (color !== undefined) {
            updateExpr.push('color = :color');
            exprVals[':color'] = color;
        }
        if (sort_order !== undefined) {
            updateExpr.push('sort_order = :sort_order');
            exprVals[':sort_order'] = sort_order;
        }

        if (updateExpr.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await docClient.send(new UpdateCommand({
            TableName: TABLES.CATEGORY,
            Key: { id },
            UpdateExpression: `SET ${updateExpr.join(', ')}, #updated_at = :updated_at`,
            ExpressionAttributeValues: exprVals,
            ExpressionAttributeNames: exprNames,
            ReturnValues: 'ALL_NEW'
        }));

        res.json(result.Attributes);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const softDeleteCategory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.sub;
        const { id } = req.params;

        const getRes = await docClient.send(new GetCommand({
            TableName: TABLES.CATEGORY,
            Key: { id }
        }));

        if (!getRes.Item || getRes.Item.user_id !== userId) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (getRes.Item.is_builtin) {
            return res.status(403).json({ error: 'Cannot delete built-in category' });
        }

        const now = new Date().toISOString();
        const result = await docClient.send(new UpdateCommand({
            TableName: TABLES.CATEGORY,
            Key: { id },
            UpdateExpression: 'SET deleted_at = :now, updated_at = :now',
            ExpressionAttributeValues: {
                ':now': now
            },
            ReturnValues: 'ALL_NEW'
        }));

        res.json(result.Attributes);
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
