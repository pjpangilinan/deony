import { Router } from 'express';
import { createUser, getUser, getUserByUsername, updateUser, deleteUser } from './handlers/user';
import { createCategory, listCategories, updateCategory, softDeleteCategory } from './handlers/category';
import { resolveMedia, createManualMedia, updateMedia, batchGetMedia } from './handlers/media';
import { createExperience, getExperience, updateExperience, deleteExperience, listExperiences } from './handlers/experience';
import { getUploadUrl } from './handlers/upload';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { searchMedia } from './handlers/search';
import { chatWithDeonysus } from './handlers/deonysus';

const router = Router();

// User routes
router.post('/users', createUser);
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
router.get('/media/search', authMiddleware, searchMedia);
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
router.post('/upload-url', authMiddleware, getUploadUrl);

// AI Agent routes (AWS Bedrock)
router.post('/ai/deonysus', authMiddleware, chatWithDeonysus);

export default router;
