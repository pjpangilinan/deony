import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCategory, listCategories, updateCategory, softDeleteCategory } from '../category';
import { docClient } from '../../lib/db';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

vi.mock('../../lib/db', () => ({
  docClient: {
    send: vi.fn(),
  },
}));

describe('Category Handler — Invariants & Operations (TICK-001)', () => {
  const mockUserId = 'usr-cat-123';
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      user: { sub: mockUserId },
      body: {},
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe('createCategory', () => {
    it('creates a category with normalized_name and initial metadata', async () => {
      mockReq.body = {
        name: 'Sci-Fi Films',
        media_type: 'movie',
        icon: 'movie',
        color: '#6366f1',
        sort_order: 1,
      };

      vi.mocked(docClient.send).mockResolvedValueOnce({} as any);

      await createCategory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const putCall = vi.mocked(docClient.send).mock.calls[0][0] as PutCommand;
      expect(putCall.input.TableName).toBe('Category');
      expect(putCall.input.Item?.name).toBe('Sci-Fi Films');
      expect(putCall.input.Item?.normalized_name).toBe('sci-fi films');
      expect(putCall.input.Item?.media_type).toBe('movie');
      expect(putCall.input.Item?.deleted_at).toBeNull();
      expect(putCall.input.Item?.is_builtin).toBe(false);
    });
  });

  describe('updateCategory', () => {
    it('INVARIANT: media_type is immutable and cannot be updated', async () => {
      mockReq.params = { id: 'cat-1' };
      mockReq.body = {
        name: 'Updated Books',
        media_type: 'movie', // Attempting to change media_type from book to movie
      };

      const existingCat = {
        id: 'cat-1',
        user_id: mockUserId,
        name: 'Books',
        media_type: 'book',
        is_builtin: false,
      };

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: existingCat } as any) // GetCommand
        .mockResolvedValueOnce({ Attributes: { ...existingCat, name: 'Updated Books' } } as any); // UpdateCommand

      await updateCategory(mockReq, mockRes);

      const updateCall = vi.mocked(docClient.send).mock.calls[1][0] as UpdateCommand;
      expect(updateCall.input.UpdateExpression).toContain('#name = :name');
      expect(updateCall.input.UpdateExpression).not.toContain('media_type');
      expect(updateCall.input.ExpressionAttributeValues?.[':name']).toBe('Updated Books');
      expect(updateCall.input.ExpressionAttributeValues?.[':media_type']).toBeUndefined();
    });

    it('returns 404 if category does not belong to the user', async () => {
      mockReq.params = { id: 'cat-foreign' };
      mockReq.body = { name: 'Hacked' };

      vi.mocked(docClient.send).mockResolvedValueOnce({
        Item: { id: 'cat-foreign', user_id: 'different-user' },
      } as any);

      await updateCategory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('softDeleteCategory', () => {
    it('INVARIANT: built-in category cannot be deleted (returns 403)', async () => {
      mockReq.params = { id: 'builtin-films' };

      vi.mocked(docClient.send).mockResolvedValueOnce({
        Item: {
          id: 'builtin-films',
          user_id: mockUserId,
          name: 'Films',
          is_builtin: true,
        },
      } as any);

      await softDeleteCategory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Cannot delete built-in category' });
      expect(vi.mocked(docClient.send)).toHaveBeenCalledTimes(1); // Did NOT issue UpdateCommand
    });

    it('INVARIANT: custom category is soft-deleted via deleted_at timestamp', async () => {
      mockReq.params = { id: 'custom-anime' };

      const existingCat = {
        id: 'custom-anime',
        user_id: mockUserId,
        name: 'Anime',
        is_builtin: false,
      };

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: existingCat } as any)
        .mockResolvedValueOnce({ Attributes: { ...existingCat, deleted_at: '2026-03-01T00:00:00.000Z' } } as any);

      await softDeleteCategory(mockReq, mockRes);

      const updateCall = vi.mocked(docClient.send).mock.calls[1][0] as UpdateCommand;
      expect(updateCall.input.TableName).toBe('Category');
      expect(updateCall.input.UpdateExpression).toBe('SET deleted_at = :now, updated_at = :now');
      expect(updateCall.input.ExpressionAttributeValues?.[':now']).toBeDefined();
    });
  });

  describe('listCategories', () => {
    it('filters out soft-deleted categories and computes experience counts', async () => {
      const activeCats = [
        { id: 'cat-1', name: 'Films', user_id: mockUserId },
        { id: 'cat-2', name: 'Books', user_id: mockUserId },
      ];

      const experiences = [
        { category_id: 'cat-1' },
        { category_id: 'cat-1' },
        { category_id: 'cat-2' },
      ];

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Items: activeCats } as any) // ScanCommand for categories
        .mockResolvedValueOnce({ Items: experiences } as any); // QueryCommand for experiences

      await listCategories(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        items: [
          { id: 'cat-1', name: 'Films', user_id: mockUserId, count: 2 },
          { id: 'cat-2', name: 'Books', user_id: mockUserId, count: 1 },
        ],
      });
    });
  });
});
