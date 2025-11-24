import fastify from 'fastify';
import { Quilt, FastifyEngineAdapter } from '@quiltjs/quilt';

import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from './handlers/errors.mjs';
import { getProfileRoute } from './routes/profile.mjs';
import { getOrderRoute } from './routes/orders.mjs';

const app = fastify();
const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

// Attach multiple routes that share handlers across files
quilt.get('/api/profile', getProfileRoute);
quilt.get('/api/orders/:id', getOrderRoute);

// Central error handler shared by all routes
quilt.setErrorHandler((error, { res }) => {
  if (error instanceof UnauthorizedError) {
    res.code(401).send({ error: 'Unauthorized' });
    return;
  }

  if (error instanceof BadRequestError) {
    res.code(400).send({ error: error.message });
    return;
  }

  if (error instanceof NotFoundError) {
    res.code(404).send({ error: error.message });
    return;
  }

  console.error(error);
  res.code(500).send({ error: 'Internal Server Error' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app
  .listen({ host: '0.0.0.0', port })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

