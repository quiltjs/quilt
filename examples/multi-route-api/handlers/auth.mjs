import { createHandler } from '@quiltjs/quilt';
import { UnauthorizedError } from './errors.mjs';

// Shared auth handler used across multiple routes
export const authHandler = createHandler({
  id: 'auth',
  execute: async ({ req }) => {
    const userId = req.headers['x-user-id'];
    if (!userId || Array.isArray(userId)) {
      throw new UnauthorizedError();
    }
    return { userId };
  },
});

