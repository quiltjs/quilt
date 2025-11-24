import { createHandler } from '@quiltjs/quilt';
import { loadOrderHandler } from '../handlers/orders.mjs';

// Route handler that depends on shared order loader
export const getOrderRoute = createHandler({
  dependencies: { order: loadOrderHandler },
  execute: async ({ res }, deps) => {
    res.code(200).send({
      id: deps.order.id,
      total: deps.order.total,
      userId: deps.order.userId,
    });
  },
});

