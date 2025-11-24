import { Quilt, NodeHttpEngineAdapter, createHandler } from '@quiltjs/quilt';

class BadRequestError extends Error {
  constructor(message = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

const adapter = new NodeHttpEngineAdapter();
const quilt = new Quilt(adapter);

const helloHandler = createHandler({
  execute: async ({ req, res }) => {
    const name = req.query.name ?? 'world';
    if (typeof name !== 'string' || name.length === 0) {
      throw new BadRequestError('name query parameter is required');
    }

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        message: `Hello, ${name}!`,
      }),
    );
  },
});

quilt.get('/api/hello', helloHandler);

quilt.setErrorHandler((error, { res }) => {
  if (error instanceof BadRequestError) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: error.message }));
    return;
  }

  console.error(error);
  res.statusCode = 500;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Internal Server Error' }));
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

adapter.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
