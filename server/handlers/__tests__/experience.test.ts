import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExperience, updateExperience, getExperience, deleteExperience } from '../experience';
import { docClient } from '../../lib/db';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

vi.mock('../../lib/db', () => ({
  docClient: {
    send: vi.fn(),
  },
}));

describe('Experience Handler — Architectural Invariants (TICK-001)', () => {
  const mockUserId = 'usr-test-123';
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

  describe('createExperience', () => {
    it('requires idempotency_key', async () => {
      mockReq.body = {
        media_id: 'PROVIDER#tmdb#123',
        category_id: 'cat-films',
        status: 'Want to Experience',
      };

      await createExperience(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'idempotency_key is required' })
      );
    });

    it('returns 404 if media is not found', async () => {
      mockReq.body = {
        idempotency_key: 'idem-key-1',
        media_id: 'PROVIDER#tmdb#999',
        category_id: 'cat-films',
      };

      vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined } as any);

      await createExperience(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Media not found' });
    });

    it('INVARIANT: Want to Experience MUST omit sort_date and GSI2SK (never null/zero/fake date)', async () => {
      mockReq.body = {
        idempotency_key: 'idem-wishlist-1',
        media_id: 'PROVIDER#tmdb#101',
        category_id: 'cat-films',
        status: 'Want to Experience',
        rating: null,
      };

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: { id: 'PROVIDER#tmdb#101', title: 'Inception', media_type: 'movie' } } as any) // GetCommand for media
        .mockResolvedValueOnce({} as any); // PutCommand for experience

      await createExperience(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const putCall = vi.mocked(docClient.send).mock.calls[1][0] as PutCommand;
      expect(putCall.input.TableName).toBe('Experience');
      expect(putCall.input.Item?.sort_date).toBeUndefined();
      expect(putCall.input.Item?.GSI2SK).toBeUndefined();
      expect(putCall.input.ConditionExpression).toBe('attribute_not_exists(SK)');
    });

    it('INVARIANT: rating: null is preserved and never coerced to 0', async () => {
      mockReq.body = {
        idempotency_key: 'idem-unrated-1',
        media_id: 'PROVIDER#tmdb#102',
        category_id: 'cat-films',
        status: 'Currently Experiencing',
        started_on: '2026-03-01',
        rating: null,
      };

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: { id: 'PROVIDER#tmdb#102', title: 'Arrival', media_type: 'movie' } } as any)
        .mockResolvedValueOnce({} as any);

      await createExperience(mockReq, mockRes);

      const putCall = vi.mocked(docClient.send).mock.calls[1][0] as PutCommand;
      expect(putCall.input.Item?.rating).toBeNull();
      expect(putCall.input.Item?.rating).not.toBe(0);
    });

    it('computes sort_date correctly for Completed and Currently Experiencing', async () => {
      mockReq.body = {
        idempotency_key: 'idem-completed-1',
        media_id: 'PROVIDER#tmdb#103',
        category_id: 'cat-films',
        status: 'Completed',
        ended_on: '2026-02-28',
      };

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: { id: 'PROVIDER#tmdb#103', title: 'Dune', media_type: 'movie' } } as any)
        .mockResolvedValueOnce({} as any);

      await createExperience(mockReq, mockRes);

      const putCall = vi.mocked(docClient.send).mock.calls[1][0] as PutCommand;
      expect(putCall.input.Item?.sort_date).toBe('2026-02-28');
      expect(putCall.input.Item?.GSI2SK).toBe('2026-02-28#idem-completed-1');
    });

    it('INVARIANT: creation idempotency returns existing item when key duplicates', async () => {
      mockReq.body = {
        idempotency_key: 'idem-dup-1',
        media_id: 'PROVIDER#tmdb#104',
        category_id: 'cat-films',
        status: 'Want to Experience',
      };

      const existingExp = {
        id: 'idem-dup-1',
        PK: `USER#${mockUserId}`,
        SK: 'EXP#idem-dup-1',
        media_title: 'Interstellar',
      };

      const condError: any = new Error('Conditional check failed');
      condError.name = 'ConditionalCheckFailedException';

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: { id: 'PROVIDER#tmdb#104', title: 'Interstellar' } } as any)
        .mockRejectedValueOnce(condError) // PutCommand fails condition
        .mockResolvedValueOnce({ Item: existingExp } as any); // GetCommand fetches existing

      await createExperience(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(existingExp);
    });
  });

  describe('updateExperience', () => {
    it('requires version for optimistic concurrency', async () => {
      mockReq.params = { id: 'exp-123' };
      mockReq.body = { status: 'Completed' }; // missing version

      await updateExperience(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'version is required for optimistic concurrency' })
      );
    });

    it('returns 404 if experience not found', async () => {
      mockReq.params = { id: 'exp-missing' };
      mockReq.body = { version: 1, status: 'Completed' };

      vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined } as any);

      await updateExperience(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('INVARIANT: transition from Completed to Want to Experience issues REMOVE sort_date, GSI2SK', async () => {
      mockReq.params = { id: 'exp-123' };
      mockReq.body = {
        version: 2,
        status: 'Want to Experience',
      };

      const existingItem = {
        id: 'exp-123',
        PK: `USER#${mockUserId}`,
        SK: 'EXP#exp-123',
        category_id: 'cat-films',
        status: 'Completed',
        sort_date: '2026-01-01',
        version: 2,
      };

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: existingItem } as any) // GetCommand
        .mockResolvedValueOnce({ Attributes: { ...existingItem, status: 'Want to Experience', version: 3 } } as any); // UpdateCommand

      await updateExperience(mockReq, mockRes);

      const updateCall = vi.mocked(docClient.send).mock.calls[1][0] as UpdateCommand;
      expect(updateCall.input.UpdateExpression).toContain('REMOVE sort_date, GSI2SK');
      expect(updateCall.input.UpdateExpression).not.toContain('sort_date = :sort_date');
      expect(updateCall.input.ConditionExpression).toBe('#version = :expected_version');
      expect(updateCall.input.ExpressionAttributeValues?.[':expected_version']).toBe(2);
      expect(updateCall.input.ExpressionAttributeValues?.[':new_version']).toBe(3);
    });

    it('INVARIANT: optimistic concurrency failure returns 409 Conflict', async () => {
      mockReq.params = { id: 'exp-123' };
      mockReq.body = {
        version: 1, // outdated version
        status: 'Completed',
      };

      const existingItem = {
        id: 'exp-123',
        PK: `USER#${mockUserId}`,
        SK: 'EXP#exp-123',
        version: 2,
      };

      const condError: any = new Error('ConditionalCheckFailedException');
      condError.name = 'ConditionalCheckFailedException';

      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Item: existingItem } as any)
        .mockRejectedValueOnce(condError);

      await updateExperience(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Conflict: version mismatch' })
      );
    });
  });

  describe('getExperience and deleteExperience', () => {
    it('getExperience returns 404 when item does not exist', async () => {
      mockReq.params = { id: 'non-existent' };
      vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined } as any);

      await getExperience(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('deleteExperience issues DeleteCommand and returns 204', async () => {
      mockReq.params = { id: 'exp-to-del' };
      vi.mocked(docClient.send).mockResolvedValueOnce({} as any);

      await deleteExperience(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });
});
