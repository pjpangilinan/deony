const fs = require('fs');

let content = fs.readFileSync('server/handlers/__tests__/experience.test.ts', 'utf8');

// Update imports
content = content.replace(
  "import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';",
  "import { PutCommand, UpdateCommand, TransactWriteCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';"
);

// We need to mock Category first, then Media.
content = content.replace(
  /\.mockResolvedValueOnce\(\{ Item: \{ id: 'PROVIDER/g,
  ".mockResolvedValueOnce({ Item: { user_id: 'usr-test-123', deleted_at: null, media_type: 'movie' } } as any)\n        .mockResolvedValueOnce({ Item: { id: 'PROVIDER"
);

content = content.replace(
  /vi\.mocked\(docClient\.send\)\.mockResolvedValueOnce\(\{ Item: undefined \} as any\);/,
  "vi.mocked(docClient.send)\n        .mockResolvedValueOnce({ Item: { user_id: 'usr-test-123', deleted_at: null, media_type: 'movie' } } as any)\n        .mockResolvedValueOnce({ Item: undefined } as any);"
);


content = content.replace(
  /const putCall = vi\.mocked\(docClient\.send\)\.mock\.calls\[1\]\[0\] as PutCommand;\n\s*expect\(putCall\.input\.TableName\)\.toBe\('Experience'\);\n\s*expect\(putCall\.input\.Item\?\.sort_date\)\.toBeUndefined\(\);\n\s*expect\(putCall\.input\.Item\?\.GSI2SK\)\.toBeUndefined\(\);\n\s*expect\(putCall\.input\.ConditionExpression\)\.toBe\('attribute_not_exists\(SK\)'\);/g,
  "const transactCall = vi.mocked(docClient.send).mock.calls[2][0] as TransactWriteCommand;\n      const putItem = (transactCall.input.TransactItems![0].Put as any);\n      expect(putItem.TableName).toBe('Experience');\n      expect(putItem.Item?.sort_date).toBeUndefined();\n      expect(putItem.Item?.GSI2SK).toBeUndefined();\n      expect(putItem.ConditionExpression).toBe('attribute_not_exists(SK)');"
);

content = content.replace(
  /const putCall = vi\.mocked\(docClient\.send\)\.mock\.calls\[1\]\[0\] as PutCommand;\n\s*expect\(putCall\.input\.Item\?\.rating\)\.toBeNull\(\);\n\s*expect\(putCall\.input\.Item\?\.rating\)\.not\.toBe\(0\);/g,
  "const transactCall = vi.mocked(docClient.send).mock.calls[2][0] as TransactWriteCommand;\n      const putItem = (transactCall.input.TransactItems![0].Put as any);\n      expect(putItem.Item?.rating).toBeNull();\n      expect(putItem.Item?.rating).not.toBe(0);"
);

content = content.replace(
  /const putCall = vi\.mocked\(docClient\.send\)\.mock\.calls\[1\]\[0\] as PutCommand;\n\s*expect\(putCall\.input\.Item\?\.sort_date\)\.toBe\('2026-02-28'\);\n\s*expect\(putCall\.input\.Item\?\.GSI2SK\)\.toBe\('2026-02-28#idem-completed-1'\);/g,
  "const transactCall = vi.mocked(docClient.send).mock.calls[2][0] as TransactWriteCommand;\n      const putItem = (transactCall.input.TransactItems![0].Put as any);\n      expect(putItem.Item?.sort_date).toBe('2026-02-28');\n      expect(putItem.Item?.GSI2SK).toBe('2026-02-28#idem-completed-1');"
);

content = content.replace(
  /const updateCall = vi\.mocked\(docClient\.send\)\.mock\.calls\[1\]\[0\] as UpdateCommand;\n\s*expect\(updateCall\.input\.UpdateExpression\)\.toContain\('REMOVE sort_date, GSI2SK'\);\n\s*expect\(updateCall\.input\.UpdateExpression\)\.not\.toContain\('sort_date ='\);/g,
  "const transactCall = vi.mocked(docClient.send).mock.calls[1][0] as TransactWriteCommand;\n      const updateItem = (transactCall.input.TransactItems![0].Update as any);\n      expect(updateItem.UpdateExpression).toContain('REMOVE sort_date, GSI2SK');\n      expect(updateItem.UpdateExpression).not.toContain('sort_date =');"
);

content = content.replace(
  /await deleteExperience\(mockReq, mockRes\);\n\s*expect\(mockRes\.status\)\.toHaveBeenCalledWith\(204\);\n\s*expect\(mockRes\.send\)\.toHaveBeenCalled\(\);/g,
  "vi.mocked(docClient.send).mockResolvedValueOnce({ Item: { visibility: 'public' } } as any);\n      vi.mocked(docClient.send).mockResolvedValueOnce({} as any);\n      await deleteExperience(mockReq, mockRes);\n      expect(mockRes.status).toHaveBeenCalledWith(204);\n      expect(mockRes.send).toHaveBeenCalled();"
);

fs.writeFileSync('server/handlers/__tests__/experience.test.ts', content);
console.log('Fixed experience.test.ts');
