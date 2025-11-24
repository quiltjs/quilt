import { createHandler } from '@quiltjs/quilt';
import { authHandler } from '../handlers/auth.mjs';
import { NotFoundError } from '../handlers/errors.mjs';

// Shared "load current user" handler
export const loadCurrentUserHandler = createHandler({
  id: 'loadCurrentUser',
  dependencies: { auth: authHandler },
  execute: async (_ctx, deps) => {
    // Fake "database" of users
    const users = new Map([
      [deps.auth.userId, { id: deps.auth.userId, name: 'Jane Doe' }],
    ]);

    const user = users.get(deps.auth.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  },
});

// Route handler that depends on shared user loader
export const getProfileRoute = createHandler({
  dependencies: { user: loadCurrentUserHandler },
  execute: async ({ res }, deps) => {
    res.code(200).send({
      id: deps.user.id,
      name: deps.user.name,
    });
  },
});

