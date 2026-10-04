const fs = require('fs');

let content = fs.readFileSync('server/handlers/user.ts', 'utf8');

const target = `
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
        }

        // Increment profile_version safely for any profile update
        updateExpr.push('profile_version = if_not_exists(profile_version, :zero) + :inc');
        exprVals[':inc'] = 1;
        exprVals[':zero'] = 0;

        if (updateExpr.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await docClient.send(new UpdateCommand({
            TableName: TABLES.USER,
            Key: { id },
            UpdateExpression: \`SET \${updateExpr.join(', ')}, #updated_at = :updated_at\`,
            ExpressionAttributeValues: exprVals,
            ExpressionAttributeNames: exprNames,
            ReturnValues: 'ALL_NEW'
        }));
        
        res.json(result.Attributes);
    } catch (error) {`;

const replacement = `
        const cleanUsername = username !== undefined ? (typeof username === 'string' ? username.trim().replace(/^@/, '') : '') : undefined;
        let oldUsername;

        if (cleanUsername !== undefined) {
            if (!cleanUsername || !/^[a-zA-Z0-9_-]{3,30}$/.test(cleanUsername)) {
                return res.status(400).json({ error: 'Username must be 3-30 characters containing only letters, numbers, underscores, or hyphens' });
            }

            // Need to get old username to release the lock
            const existingUser = await docClient.send(new GetCommand({
                TableName: TABLES.USER,
                Key: { id }
            }));
            
            if (!existingUser.Item) {
                return res.status(404).json({ error: 'User not found' });
            }
            oldUsername = existingUser.Item.username;
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
        const exprVals = { ':updated_at': now };
        const exprNames = { '#updated_at': 'updated_at' };

        if (cleanUsername !== undefined) {
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
        }

        // Increment profile_version safely for any profile update
        updateExpr.push('profile_version = if_not_exists(profile_version, :zero) + :inc');
        exprVals[':inc'] = 1;
        exprVals[':zero'] = 0;

        if (updateExpr.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const transactItems = [];
        
        if (cleanUsername !== undefined && oldUsername !== cleanUsername) {
            transactItems.push({
                Put: {
                    TableName: TABLES.USER,
                    Item: { id: \`USERNAME#\${cleanUsername}\`, locked_by: id },
                    ConditionExpression: 'attribute_not_exists(id)'
                }
            });
            if (oldUsername) {
                transactItems.push({
                    Delete: {
                        TableName: TABLES.USER,
                        Key: { id: \`USERNAME#\${oldUsername}\` }
                    }
                });
            }
        }

        transactItems.push({
            Update: {
                TableName: TABLES.USER,
                Key: { id },
                UpdateExpression: \`SET \${updateExpr.join(', ')}, #updated_at = :updated_at\`,
                ExpressionAttributeValues: exprVals,
                ExpressionAttributeNames: exprNames
            }
        });

        try {
            await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
            // Get updated item
            const updated = await docClient.send(new GetCommand({
                TableName: TABLES.USER,
                Key: { id }
            }));
            res.json(updated.Item);
        } catch (err) {
            const isCondCheckFailed = err.name === 'ConditionalCheckFailedException' || (err.name === 'TransactionCanceledException' && err.CancellationReasons?.some(r => r.Code === 'ConditionalCheckFailed'));
            if (isCondCheckFailed) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            throw err;
        }
    } catch (error) {`;

content = content.replace(target, replacement);
fs.writeFileSync('server/handlers/user.ts', content);
console.log('Fixed user.ts');
