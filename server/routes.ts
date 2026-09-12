import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createUser, getUser, getUserByUsername, updateUser, deleteUser } from './handlers/user';
import { createCategory, listCategories, updateCategory, softDeleteCategory } from './handlers/category';
import { resolveMedia, createManualMedia, updateMedia, batchGetMedia } from './handlers/media';
import { createExperience, getExperience, updateExperience, deleteExperience, listExperiences } from './handlers/experience';
import { getUploadUrl } from './handlers/upload';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { searchMedia } from './handlers/search';
import { chatWithDeonysus } from './handlers/deonysus';

const router = Router();

const isTest = process.env.NODE_ENV === 'test';

// Global API rate limiter (600 requests per 15 minutes)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: 'Too many requests, please try again later.' }
});

// Dedicated AI Agent rate limiter (25 invocations per minute)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 25,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: 'Deonysus is savoring his wine. Please allow the god a moment before speaking again.' }
});

// Media search rate limiter (60 requests per minute)
const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: 'Too many search requests. Please slow down.' }
});

// S3 Upload URL rate limiter (50 presigned URLs per 15 minutes)
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: 'Upload URL generation limit reached. Please try again later.' }
});

router.use(generalLimiter);

// User routes
router.post('/users', authMiddleware, createUser);
router.get('/users/:id', optionalAuthMiddleware, getUser);
router.get('/users/username/:username', optionalAuthMiddleware, getUserByUsername);
router.patch('/users/:id', authMiddleware, updateUser);
router.put('/users/:id', authMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, deleteUser);

// Category routes
router.post('/categories', authMiddleware, createCategory);
router.get('/categories', authMiddleware, listCategories);
router.patch('/categories/:id', authMiddleware, updateCategory);
router.put('/categories/:id', authMiddleware, updateCategory);
router.delete('/categories/:id', authMiddleware, softDeleteCategory);

// Media routes
router.get('/media/search', authMiddleware, searchLimiter, searchMedia);
router.post('/media/resolve', authMiddleware, resolveMedia);
router.post('/media/manual', authMiddleware, createManualMedia);
router.patch('/media/:id', authMiddleware, updateMedia);
router.put('/media/:id', authMiddleware, updateMedia);
router.post('/media/batch-get', batchGetMedia);

// Experience routes
router.post('/experiences', authMiddleware, createExperience);
router.get('/experiences', authMiddleware, listExperiences);
router.get('/experiences/:id', authMiddleware, getExperience);
router.patch('/experiences/:id', authMiddleware, updateExperience);
router.put('/experiences/:id', authMiddleware, updateExperience);
router.delete('/experiences/:id', authMiddleware, deleteExperience);

// Upload routes
router.post('/upload-url', authMiddleware, uploadLimiter, getUploadUrl);

// AI Agent routes (AWS Bedrock)
router.post('/ai/deonysus', authMiddleware, aiLimiter, chatWithDeonysus);

export default router;
