import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveMedia, createManualMedia, batchGetMedia } from '../media';
import { docClient } from '../../lib/db';
import { PutCommand, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

vi.mock('../../lib/db', () => ({
  docClient: {
    send: vi.fn(),
  },
}));

describe('Media Handler — Uniqueness & Invariants (TICK-001)', () => {
  const mockUserId = 'usr-media-123';
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

  describe('resolveMedia', () => {
    it('returns 400 if source or external_id is missing', async () => {
      mockReq.body = { title: 'Dune' }; // missing source & external_id

      await resolveMedia(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'source and external_id are required' })
      );
    });

    it('INVARIANT: encodes ID as PROVIDER#{source}#{external_id}, user_id=null, conditional put', async () => {
      mockReq.body = {
        source: 'tmdb',
        external_id: '438631',
        title: 'Dune',
        media_type: 'movie',
        description: 'Paul Atreides leads nomadic freemen...',
        release_date: '2021-10-22',
      };

      vi.mocked(docClient.send).mockResolvedValueOnce({} as any);

      await resolveMedia(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const putCall = vi.mocked(docClient.send).mock.calls[0][0] as PutCommand;
      expect(putCall.input.TableName).toBe('Media');
      expect(putCall.input.Item?.id).toBe('PROVIDER#tmdb#438631');
      expect(putCall.input.Item?.is_manual).toBe(false);
      expect(putCall.input.Item?.user_id).toBeNull();
      expect(putCall.input.ConditionExpression).toBe('attribute_not_exists(id)');
    });

    it('INVARIANT: returns existing item without duplication if ConditionalCheckFailedException', async () => {
      mockReq.body = {
        source: 'tmdb',
        external_id: '438631',
        title: 'Dune',
        media_type: 'movie',
      };

      const existingMedia = {
        id: 'PROVIDER#tmdb#438631',
        title: 'Dune',
        media_type: 'movie',
        is_manual: false,
      };

      const condError: any = new Error('ConditionalCheckFailedException');
      condError.name = 'ConditionalCheckFailedException';

      vi.mocked(docClient.send)
        .mockRejectedValueOnce(condError) // PutCommand fails because ID exists
        .mockResolvedValueOnce({ Item: existingMedia } as any); // GetCommand fetches existing

      await resolveMedia(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(existingMedia);
      const getCall = vi.mocked(docClient.send).mock.calls[1][0] as GetCommand;
      expect(getCall.input.Key).toEqual({ id: 'PROVIDER#tmdb#438631' });
    });
  });

  describe('createManualMedia', () => {
    it('INVARIANT: encodes ID as MANUAL#{user_id}#{uuid}, is_manual=true, user-scoped', async () => {
      mockReq.body = {
        title: 'Indie Film Screening',
        media_type: 'movie',
        description: 'Local student film festival project',
      };

      vi.mocked(docClient.send).mockResolvedValueOnce({} as any);

      await createManualMedia(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const putCall = vi.mocked(docClient.send).mock.calls[0][0] as PutCommand;
      expect(putCall.input.TableName).toBe('Media');
      expect(putCall.input.Item?.id).toMatch(/^MANUAL#usr-media-123#[a-f0-9-]+$/);
      expect(putCall.input.Item?.is_manual).toBe(true);
      expect(putCall.input.Item?.user_id).toBe('usr-media-123');
      expect(putCall.input.Item?.source).toBeNull();
      expect(putCall.input.Item?.external_id).toBeNull();
    });
  });

  describe('batchGetMedia', () => {
    it('returns 400 for invalid or empty ids array', async () => {
      mockReq.body = { ids: [] };

      await batchGetMedia(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'ids must be a non-empty array' })
      );
    });

    it('issues BatchGetCommand with mapped keys and returns items', async () => {
      mockReq.body = {
        ids: ['PROVIDER#tmdb#1', 'PROVIDER#tmdb#2'],
      };

      const mockItems = [
        { id: 'PROVIDER#tmdb#1', title: 'Movie 1' },
        { id: 'PROVIDER#tmdb#2', title: 'Movie 2' },
      ];

      vi.mocked(docClient.send).mockResolvedValueOnce({
        Responses: {
          Media: mockItems,
        },
      } as any);

      await batchGetMedia(mockReq, mockRes);

      const batchCall = vi.mocked(docClient.send).mock.calls[0][0] as BatchGetCommand;
      expect(batchCall.input.RequestItems?.['Media'].Keys).toEqual([
        { id: 'PROVIDER#tmdb#1' },
        { id: 'PROVIDER#tmdb#2' },
      ]);
      expect(mockRes.json).toHaveBeenCalledWith({ items: mockItems });
    });
  });
});
