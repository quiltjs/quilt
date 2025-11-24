import fastify from 'fastify';
import { Quilt, FastifyEngineAdapter, createHandler } from '@quiltjs/quilt';

const app = fastify();

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

// Auth handler: derive user from headers
const authHandler = createHandler({
  id: 'auth',
  execute: async ({ req }) => {
    const userId = req.headers['x-user-id'];
    if (!userId || Array.isArray(userId)) {
      throw new Error('Unauthorized');
    }
    return { userId };
  },
});

// Simple route handler that depends on auth
const helloHandler = createHandler({
  dependencies: { auth: authHandler },
  execute: async ({ req, res }, deps) => {
    const name = req.query.name ?? 'world';
    res.code(200).send({
      message: `Hello, ${name}!`,
      userId: deps.auth.userId,
    });
  },
});

quilt.get('/api/hello', helloHandler);

// Map domain errors to HTTP responses
quilt.setErrorHandler((error, { res }) => {
  if (error.message === 'Unauthorized') {
    res.code(401).send({ error: 'Unauthorized' });
    return;
  }

  console.error(error);
  res.code(500).send({ error: 'Internal Server Error' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app
  .listen({ port, host: '0.0.0.0' })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
