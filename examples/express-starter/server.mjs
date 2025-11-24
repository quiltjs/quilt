import express from 'express';
import { Quilt, ExpressEngineAdapter, createHandler } from '@quiltjs/quilt';

class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

const app = express();
app.use(express.json());

const quilt = new Quilt(new ExpressEngineAdapter({ app }));

// Simple auth handler based on a header
const authHandler = createHandler({
  id: 'auth',
  execute: async ({ req }) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      throw new UnauthorizedError();
    }
    return { userId };
  },
});

// Simple route handler that depends on auth
const helloHandler = createHandler({
  dependencies: { auth: authHandler },
  execute: async ({ req, res }, deps) => {
    const name = req.query.name ?? 'world';
    res.status(200).json({
      message: `Hello, ${name}!`,
      userId: deps.auth.userId,
    });
  },
});

quilt.get('/api/hello', helloHandler);

// Central error handler
quilt.setErrorHandler((error, { res }) => {
  if (error instanceof UnauthorizedError) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
